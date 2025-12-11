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
