# Stripe Webhook Events: Complete Reference

*Internal documentation explaining every Stripe webhook event we handle.*

---

## How Webhooks Work

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Something happens in Stripe (payment, subscription, etc) │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Stripe sends POST to: /api/stripe/webhook                │
│    - Includes signature header for verification             │
│    - Body contains event type + data                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. We verify signature using STRIPE_WEBHOOK_SECRET          │
│    - Prevents fake webhook attacks                          │
│    - Uses HMAC-SHA256                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Handle event based on type (switch statement)            │
│    - Update database accordingly                            │
│    - Return 200 OK on success, 500 on failure               │
└─────────────────────────────────────────────────────────────┘
```

---

## Events We Handle

### `checkout.session.completed`
**When**: User completes Stripe Checkout successfully
**Action**: Activate Pro subscription
```
Data we extract:
- customer (Stripe customer ID)
- subscription (Stripe subscription ID)
- metadata.userId (our user ID - fallback lookup)

What we do:
1. Find user by stripe_customer_id OR metadata.userId
2. Retrieve subscription to get period_end
3. Call activateProSubscription()
4. Set tier=pro, status=active, expires_at
```

---

### `customer.subscription.created`
**When**: Subscription is created (backup for checkout)
**Action**: Activate Pro (if checkout webhook missed)
```
Only processes if status === 'active'
Same activation flow as checkout.session.completed
Acts as safety net if primary webhook fails
```

---

### `customer.subscription.updated`
**When**: Subscription changes (renewal, plan change, cancel scheduled)
**Action**: Update status and expiration
```
Handles:
- cancel_at_period_end = true → User scheduled cancel (keep active)
- status = 'past_due' → Payment failed, grace period
- status = 'canceled' → Actually canceled now
- Normal renewal → Update expires_at
```

---

### `customer.subscription.deleted`
**When**: Subscription is actually terminated
**Action**: Downgrade to free tier
```
What we do:
1. Set subscription_tier = 'free'
2. Set subscription_status = 'canceled'
3. Clear stripe_subscription_id
4. User now has 2 appraisals/month limit
```

---

### `invoice.payment_succeeded`
**When**: Payment goes through (initial or renewal)
**Action**: Update expiration date for renewals
```
Only acts on billing_reason = 'subscription_cycle'
(Ignores initial payments - handled by checkout)

What we do:
1. Fetch subscription from Stripe API
2. Get new current_period_end
3. Update subscription_expires_at
```

---

### `invoice.payment_failed`
**When**: Payment attempt fails
**Action**: Mark subscription as past_due
```
What we do:
1. Set subscription_status = 'past_due'
2. User keeps access during grace period
3. Stripe will retry automatically

If all retries fail → subscription.deleted fires
```

---

### `customer.subscription.paused`
**When**: Subscription is paused (rare, optional Stripe feature)
**Action**: Mark as inactive but keep tier
```
What we do:
1. Set subscription_status = 'inactive'
2. Keep subscription_tier = 'pro' (can resume)
```

---

### `customer.subscription.resumed`
**When**: Paused subscription is resumed
**Action**: Reactivate subscription
```
What we do:
1. Fetch new period_end from Stripe
2. Set subscription_status = 'active'
3. Update subscription_expires_at
```

---

## Error Handling (Critical Fix)

All handlers now return **500 on failure** so Stripe retries:

```typescript
// CORRECT - Stripe will retry
if (!success) {
  console.error(`[Webhook] CRITICAL: ${event} failed`);
  return NextResponse.json({ error: 'Failed' }, { status: 500 });
}

// WRONG (old code) - Stripe thinks success, won't retry
if (!success) {
  console.error('Failed');
  // Missing return! Falls through to 200 OK
}
```

---

## Webhook URL Configuration

**Production**: `https://www.realworth.ai/api/stripe/webhook`

Events enabled in Stripe Dashboard:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.paused`
- `customer.subscription.resumed`

---

## Testing Webhooks Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3001/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
```

---

## Debugging

Check Vercel logs for webhook processing:
```
[Webhook] ✅ Signature verified, event type: checkout.session.completed
[Webhook] checkout.session.completed - PARSED: { customerId, subscriptionId, userId }
[SubscriptionService] activateProSubscription called: { ... }
[Webhook] SUCCESS: Pro subscription activated for customer cus_xxxxx
```

If you see `CRITICAL` in logs, the database update failed and Stripe will retry.

---

*Last updated: January 2026*
