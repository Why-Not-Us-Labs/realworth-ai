# Lessons Learned & Issues Resolved

A log of problems encountered and their solutions. Check here first when debugging!

---

## 2025-12-10: Supabase Service Role Key Missing in Vercel

### Symptoms
- Free users immediately hit "Monthly appraisal limit reached" error
- Database showed `monthly_appraisal_count = 0` but API returned `canCreate: false`
- UI showed correct "0/3 appraisals used" but server blocked the request

### Root Cause
The `SUPABASE_SERVICE_ROLE_KEY` environment variable was **not set** in Vercel production.

Vercel had a misnamed variable:
```
NEXT_PUBLIC_SUPABASE_SUPABASE_SERVICE_ROLE_KEY  ❌ (wrong name)
```

But the code in `lib/supabase.ts` looks for:
```
SUPABASE_SERVICE_ROLE_KEY  ✅ (correct name)
```

Without this key, `getSupabaseAdmin()` falls back to the anon client, which **can't read other users' data due to RLS policies**.

### Solution
```bash
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste the service role key value
vercel --prod  # Redeploy
```

### Prevention
- Always verify server-side env vars are set correctly after Supabase integration
- The service role key should NEVER have `NEXT_PUBLIC_` prefix (it's a secret!)
- Add a startup check or health endpoint that verifies critical env vars

---

## 2025-12-10: Free Tier Limit Not Being Enforced

### Symptoms
- User (David O'Hara) had 14 appraisals on free tier when limit was 10
- `monthly_appraisal_count` in database was 0 despite having appraisals

### Root Cause
1. **Client-side only enforcement**: Limit check only happened in frontend, not API
2. **RLS blocking updates**: `incrementAppraisalCount()` used anon client, RLS silently blocked the update
3. **Fire-and-forget**: `incrementUsage()` was called without `await`, errors were swallowed

### Solution
1. Created `FREE_APPRAISAL_LIMIT = 3` constant in `lib/constants.ts` (single source of truth)
2. Added **server-side enforcement** in `/api/appraise/route.ts`:
   - Check limit BEFORE processing (returns 403 if exceeded)
   - Increment count AFTER successful appraisal
3. Changed `incrementAppraisalCount()` to use `getSupabaseAdmin()` (bypasses RLS)
4. Changed `canCreateAppraisal()` to use `getSupabaseAdmin()`

### Key Code Pattern
```typescript
// Always use admin client for trusted server operations
const supabaseAdmin = getSupabaseAdmin();
const { data, error } = await supabaseAdmin
  .from('users')
  .update({ monthly_appraisal_count: newCount })
  .eq('id', userId);
```

### Prevention
- Server-side enforcement for ALL limits (never trust the client)
- Use admin client for operations that need to bypass RLS
- Always `await` database operations and handle errors
- Log all subscription/limit operations with `[SubscriptionService]` prefix

---

## 2025-12-10: Stripe Prices Created as One-Time Instead of Recurring

### Symptoms
- Created prices via Stripe MCP tool
- Prices showed in Stripe Dashboard but without "Per month" / "Per year" indicator
- Would fail if used for subscriptions

### Root Cause
The Stripe MCP `create_price` tool doesn't support the `recurring` parameter.

### Solution
Create recurring prices in Stripe Dashboard:
1. Product catalog → Select product
2. Add another price → Select **"Recurring"** (not "One-off")
3. Set billing period (Monthly/Yearly)

Or use Stripe CLI:
```bash
stripe prices create \
  --product="prod_xxx" \
  --unit-amount=1999 \
  --currency=usd \
  -d "recurring[interval]=month"
```

### Prevention
- Always verify price type in Stripe Dashboard after creation
- Recurring prices show "Per month" or "Per year" in the pricing list
- One-time prices show just the amount with no interval

---

## 2025-12-10: Double Increment Bug (Usage Counter +2 on Single Appraisal)

### Symptoms
- After one appraisal, usage meter showed "2/3 appraisals used" instead of "1/3"
- Database `monthly_appraisal_count` was double what it should be

### Root Cause
**Both frontend AND backend were incrementing the counter:**

1. **Backend** (`/api/appraise/route.ts:389`): `incrementAppraisalCount(userId)` - ✅ Correct
2. **Frontend** (`app/page.tsx:169`): `incrementUsage()` - ❌ Redundant
3. **Frontend** (`app/page.tsx:61`): `incrementUsage()` in `handleQueueItemComplete` - ❌ Redundant

This happened because we added server-side enforcement but forgot to remove the legacy client-side increment calls.

### Solution
Removed ALL frontend `incrementUsage()` calls since the server handles this now:
- Removed `incrementUsage()` at line 169 (sync appraisal flow)
- Removed `incrementUsage()` at line 61 (queue completion handler)
- Removed `incrementUsage` from useCallback dependency array
- Removed `incrementUsage` from useSubscription destructure

**Single source of truth:** The increment now ONLY happens in `/api/appraise/route.ts` after a successful appraisal.

### Prevention
- **Server handles ALL state mutations** - client only refreshes/displays state
- When adding server-side enforcement, audit ALL client-side calls doing the same thing
- Search for function names across the entire codebase before declaring "fixed"
- Use `grep -r "incrementUsage\|incrementAppraisalCount" .` to find all increment calls

### Debugging Pattern
```bash
# Find all increment calls
grep -rn "incrementUsage\|incrementAppraisalCount" --include="*.ts" --include="*.tsx" .
```

---

## 2025-12-10: Stripe "No such price" Error - Trailing Newline in Env Var

### Symptoms
- Checkout fails immediately with "Failed to create checkout session"
- Error message: `No such price: 'price_xxx\n'` (note the `\n`)

### Root Cause
When setting environment variables via Vercel CLI or Dashboard, copy-pasting can include a **trailing newline character** (`\n`). Stripe's API doesn't trim these, so it looks for a price ID that literally ends with a newline.

### Solution
Remove and re-add the env var using `printf` to ensure no trailing newline:
```bash
vercel env rm STRIPE_PRO_PRICE_ID_V2 production -y
printf 'price_xxx' | vercel env add STRIPE_PRO_PRICE_ID_V2 production
vercel --prod  # Redeploy
```

### Prevention
- Always use `printf` (not `echo`) when piping values to `vercel env add`
- Test checkout after setting any Stripe env vars
- Look for `\n` in error messages - it's a telltale sign

### Debugging Pattern
```bash
# Test checkout API directly to see raw error
curl -sL https://yoursite.com/api/stripe/checkout \
  -X POST -H "Content-Type: application/json" \
  -d '{"userId":"test","userEmail":"test@test.com","billingInterval":"monthly"}'
```

---

## 2025-12-10: Cancel Subscription Shows "No Active Subscription Found"

### Symptoms
- User is Pro with active subscription in database
- Cancel modal shows "No active subscription found" error
- Database clearly has `stripe_subscription_id` populated

### Root Cause
The cancel API (`/api/stripe/cancel/route.ts`) used `subscriptionService.getUserSubscription()` which uses the **anon Supabase client**. API routes don't have user auth context, so RLS blocks the database read.

### Solution
Use `getSupabaseAdmin()` directly in the cancel route to bypass RLS:

```typescript
// Before (broken)
const subscription = await subscriptionService.getUserSubscription(userId);

// After (fixed)
const supabaseAdmin = getSupabaseAdmin();
const { data: user } = await supabaseAdmin
  .from('users')
  .select('stripe_subscription_id')
  .eq('id', userId)
  .single();
```

### Prevention
- **All API routes** that read user data should use `getSupabaseAdmin()` (not anon client)
- The anon client in API routes has NO auth context - RLS blocks everything
- Only browser-side code with user session should use the anon client

---

## 2025-12-10: Stripe Webhook Not Firing (Payment Succeeded but User Still Free)

### Symptoms
- User completed Stripe checkout successfully (payment went through)
- User returned to app still showing free tier UI
- Database showed `subscription_status: inactive`, `stripe_subscription_id: null`
- No webhook logs in Vercel

### Root Cause
The Stripe webhook was misconfigured in three ways:

1. **Wrong URL**: Pointed to an old preview deployment URL instead of production
   ```
   ❌ https://web-git-stripe-integration-why-not-us-labs.vercel.app/api/stripe-webhook
   ✅ https://realworth.ai/api/stripe/webhook
   ```

2. **Wrong path**: Used `/api/stripe-webhook` but the actual route is `/api/stripe/webhook`

3. **Test mode only**: Webhook had `livemode: false` - won't receive live production payments!

### Solution
Create a new **LIVE MODE** webhook in Stripe Dashboard:
1. Go to https://dashboard.stripe.com/webhooks
2. Toggle to **Live mode** (top left)
3. Click "Add endpoint"
4. URL: `https://realworth.ai/api/stripe/webhook`
5. Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`
6. Copy the signing secret (`whsec_...`)
7. Update `STRIPE_WEBHOOK_SECRET` in Vercel:
   ```bash
   vercel env rm STRIPE_WEBHOOK_SECRET production -y
   printf 'whsec_xxx' | vercel env add STRIPE_WEBHOOK_SECRET production
   vercel --prod
   ```

### Prevention
- Always verify webhooks are configured for **LIVE mode** when using live API keys
- Double-check webhook URL matches your production domain exactly
- Test the full payment → webhook → database flow before going live
- Use `stripe webhook_endpoints list --live` to verify live webhook configuration

### Debugging Pattern
```bash
# List webhook endpoints (shows mode and URL)
stripe webhook_endpoints list --live

# Check if webhook events are being sent
# Go to Stripe Dashboard → Developers → Webhooks → Select endpoint → Recent events
```

---

## 2025-12-10: Stripe Cancellation Succeeded but Database Not Updated (Data Sync Issue)

### Symptoms
- User clicked "Cancel Subscription" in app
- Stripe Dashboard showed subscription as `cancel_at_period_end: true`
- Database still showed `cancel_at_period_end: false`
- UI showed "Active" instead of "Canceling"

### Root Cause
**Distributed systems timing issue:** The cancel API route:
1. First calls Stripe API to set `cancel_at_period_end: true` ✅
2. Then updates database with `cancel_at_period_end: true` ❌ (crashed/failed)

The session crashed AFTER the Stripe call succeeded but BEFORE the database update completed. This left the two data stores out of sync.

### Solution
1. **Manual fix:** Update database directly to match Stripe state
   ```sql
   UPDATE users SET cancel_at_period_end = true WHERE email = 'user@example.com';
   ```

2. **Structural fix:** The webhook handler (`customer.subscription.updated`) now syncs `cancelAtPeriodEnd` from Stripe to database, acting as a backup reconciliation.

### Prevention
- **Webhooks are the authoritative source** - Stripe always sends events for state changes
- The API route optimistically updates DB, but webhook ensures eventual consistency
- Consider adding a "sync from Stripe" admin function for manual reconciliation
- Always ensure webhook handler processes `cancel_at_period_end` field

### Subscription State Machine
```
Active (green)      → User clicks Cancel    → Canceling (amber)
Canceling (amber)   → User clicks Reactivate → Active (green)
Canceling (amber)   → Period ends (webhook)  → Canceled (red) → Free tier
```

### Database Fields for Subscription State
| Field | Purpose |
|-------|---------|
| `subscription_tier` | 'free' or 'pro' |
| `subscription_status` | 'inactive', 'active', 'past_due', 'canceled' |
| `cancel_at_period_end` | `true` when user scheduled cancellation but still has access |
| `subscription_expires_at` | When current period ends (renewal or cancellation date) |
| `stripe_subscription_id` | Links to Stripe for API calls |
| `stripe_customer_id` | Links to Stripe customer |

### Key Insight
When activating a new subscription (`activateProSubscription()`), always reset `cancel_at_period_end: false` to clear any stale cancellation state from a previous subscription.

---

## 2025-12-10: Stripe API Calls Should Check Current State First (Idempotent Pattern)

### Symptoms
- Reactivate button fails with "Failed to reactivate subscription" even though user is Pro
- Database shows `cancel_at_period_end: true` but Stripe shows `false`
- API returns 500 error when trying to reactivate an already-active subscription

### Root Cause
The Cancel/Reactivate APIs blindly updated Stripe without first checking current state. When the DB and Stripe got out of sync (from previous crashes or race conditions), the APIs would either:
1. Try to cancel an already-canceled subscription
2. Try to reactivate an already-active subscription

This could cause unexpected errors or confusing behavior.

### Solution
**Check Stripe's current state BEFORE making updates.** If Stripe already has the desired state, sync the DB and return success:

```typescript
// In /api/stripe/reactivate/route.ts
const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);

// If Stripe already shows as not canceling, just sync DB and return
if (!currentSubscription.cancel_at_period_end) {
  console.log('[Reactivate] Already active in Stripe, syncing DB');
  await supabaseAdmin.from('users').update({ cancel_at_period_end: false }).eq('id', userId);
  return NextResponse.json({ success: true, message: 'Subscription already active' });
}

// Only now do we update Stripe
await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false });
```

Same pattern applies to the cancel route - check if already canceling first.

### Prevention
- **Always retrieve before update** - check current Stripe state first
- **Be idempotent** - if desired state already exists, sync DB and succeed
- **Stripe is source of truth** - when in doubt, trust Stripe's current state
- APIs should be resilient to being called multiple times with same intent

### Pattern: Check-Sync-Update
```
1. Retrieve current state from Stripe
2. If already in desired state → Sync DB → Return success
3. If not in desired state → Update Stripe → Sync DB → Return success
```

This makes APIs resilient to:
- Network failures that updated Stripe but crashed before DB update
- Race conditions from multiple button clicks
- Manual Stripe Dashboard changes
- Webhook/API timing mismatches

---

## 2025-12-10: checkout.session.completed Webhook Failing to Deliver (pending_webhooks: 1)

### Symptoms
- User completed Stripe checkout successfully (payment charged)
- User returned to app still showing free tier
- Database not updated to Pro
- Stripe events showed `checkout.session.completed` with `pending_webhooks: 1` (pending/failed)
- Other events like `customer.subscription.created` showed `pending_webhooks: 0` (delivered successfully)

### Root Cause
**Two-part problem:**

1. **Signature verification failure**: The `checkout.session.completed` events were being sent to realworth.ai but failing signature verification. This can happen when:
   - `STRIPE_WEBHOOK_SECRET` env var doesn't match the endpoint's signing secret
   - Trailing newline in env var (see earlier lesson)
   - Webhook endpoint was recreated with new secret but env var not updated

2. **Event misconfiguration**: The `customer.subscription.created` event (which also contains enough info to activate Pro) was only configured on the OLD whynotus.ai webhook endpoint, not the realworth.ai one.

### Solution
**Two-pronged fix for resilience:**

1. **Add backup activation handler** in `/api/stripe/webhook/route.ts`:
   ```typescript
   case 'customer.subscription.created': {
     // Activate Pro if subscription is active - backup for checkout.session.completed
     if (subscription.status === 'active') {
       await subscriptionService.activateProSubscription(customerId, subscriptionId, expiresAt);
     }
     break;
   }
   ```

2. **Update webhook endpoint events** in Stripe Dashboard:
   - Add `customer.subscription.created` to realworth.ai webhook
   - Add `invoice.payment_succeeded` for additional redundancy

### Prevention
- **Use multiple activation events**: Don't rely on a single event type for critical actions
- **Events to enable for subscription activation:**
  - `checkout.session.completed` (primary)
  - `customer.subscription.created` (backup)
  - `invoice.payment_succeeded` (additional backup)
- **Verify webhook delivery**: After setting up webhooks, check "Recent deliveries" in Stripe Dashboard
- **If pending_webhooks > 0**: Event is failing to deliver - check:
  - Is the URL correct and reachable?
  - Is `STRIPE_WEBHOOK_SECRET` set and matching?
  - Look at "Recent deliveries" for actual error response

### Debugging Webhook Issues
```bash
# List webhook endpoints
stripe webhook_endpoints list --live

# Check recent events and their delivery status
stripe events list --limit 10 --live

# Look for pending_webhooks > 0 to identify failed deliveries
# pending_webhooks: 0 = successfully delivered
# pending_webhooks: 1+ = pending/failed delivery
```

---

## 2025-12-15: Webhook Secret Mismatch - Don't Overlook the Simple Things!

### Symptoms
- User completed Stripe checkout successfully (payment charged)
- Stripe Dashboard showed webhook delivered with **200 OK**
- Database never updated to Pro
- `activateProSubscription()` was being called but returning `false`
- Extensive code analysis found nothing wrong with the logic

### Root Cause
**Classic environment variable mismatch** - the simplest possible bug hiding in plain sight!

| Location | Value |
|----------|-------|
| **Stripe LIVE webhook** | `whsec_GiP34isjekUSloijBEkOTB2N5Wj7wDlg` |
| **Vercel production** | `whsec_ecd9e37ef1c76ea28c647d1d45fe2bdd692a3c37a2a19df35cc8932da1e6af47` |

The Vercel env var had an **old/test webhook secret** while Stripe LIVE mode was using a different signing secret. This caused:
1. Stripe constructs webhook event with LIVE secret
2. Our server tries to verify with old secret → **Signature verification fails silently**
3. Event body still parses as JSON (it's not encrypted, just signed)
4. Code proceeds but Stripe SDK may have issues, or DB lookup fails
5. Webhook returns 200 OK (bad error handling) → Stripe thinks success

### Why It Was Hard to Find
- Webhook returned 200 OK, so Stripe Dashboard showed "delivered successfully"
- No explicit "signature verification failed" error in logs
- We focused on complex code paths (RLS, user lookup, subscription service)
- The actual bug was a **one-line env var value**

### Solution
```bash
# Check what's in Stripe Dashboard → Developers → Webhooks → [endpoint] → Signing secret
# Compare to Vercel env vars

# Update Vercel with correct LIVE webhook secret
vercel env rm STRIPE_WEBHOOK_SECRET production --yes
echo "whsec_GiP34isjekUSloijBEkOTB2N5Wj7wDlg" | vercel env add STRIPE_WEBHOOK_SECRET production
vercel --prod
```

### Prevention
1. **Check the simple stuff FIRST:**
   - Env vars match between services?
   - Correct mode (test vs live)?
   - URL pointing to right domain?

2. **Webhook secret checklist when debugging:**
   ```bash
   # Get secret from Stripe Dashboard (Developers → Webhooks → Select endpoint → Reveal signing secret)
   # Compare to what's in Vercel:
   vercel env ls production | grep WEBHOOK
   ```

3. **Test mode vs Live mode secrets are DIFFERENT** - each webhook endpoint has its own secret

4. **Add explicit signature verification logging:**
   ```typescript
   try {
     event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
   } catch (err) {
     console.error('[Webhook] ⚠️ SIGNATURE VERIFICATION FAILED:', err.message);
     return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
   }
   ```

### The Golden Rule
> **When debugging, always verify env vars first. The bug is usually simpler than you think.**

Complex bugs exist, but they're rare. Most production issues are:
- Wrong env var value
- Missing env var
- Wrong URL/endpoint
- Test vs live mode mismatch
- Copy-paste errors with trailing characters

Save yourself hours: check the boring stuff before diving into code archaeology.

---

## Template for New Entries

```markdown
## YYYY-MM-DD: Brief Title

### Symptoms
- What did you observe?

### Root Cause
Why did it happen?

### Solution
How did you fix it?

### Prevention
How to avoid this in the future?
```
