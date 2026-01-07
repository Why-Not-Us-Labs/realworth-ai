# Subscription Lifecycle: Free → Pro → Cancel

*Internal documentation explaining how subscriptions work from signup to cancellation.*

---

## Overview

RealWorth has two tiers:
- **Free**: 2 appraisals/month (tracked per user)
- **Pro**: $19.99/month or $149.99/year (unlimited appraisals)

---

## User Clicks "Upgrade to Pro"

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UI: User clicks upgrade button                           │
│    - UpgradeModal or pricing page triggers checkout         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. API: POST /api/stripe/checkout                           │
│    - Creates Stripe Checkout Session                        │
│    - Attaches user's stripe_customer_id (or creates one)    │
│    - Stores userId in session.metadata for webhook lookup   │
│    - Returns checkout URL                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. REDIRECT: User sent to Stripe Checkout                   │
│    - Stripe handles payment form, validation, 3DS           │
│    - User enters card details                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SUCCESS: Stripe redirects to /profile?upgraded=true      │
│    - Meanwhile, webhook fires in background                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Webhook Activates Pro (Background)

```
┌─────────────────────────────────────────────────────────────┐
│ 5. WEBHOOK: checkout.session.completed                      │
│                                                             │
│    Stripe sends event to: /api/stripe/webhook               │
│                                                             │
│    Event contains:                                          │
│    - customer: "cus_xxxxx"                                  │
│    - subscription: "sub_xxxxx"                              │
│    - metadata.userId: "uuid-of-user"                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. LOOKUP USER                                              │
│                                                             │
│    Try 1: Find by stripe_customer_id                        │
│    Try 2: Find by metadata.userId (fallback)                │
│                                                             │
│    → Update stripe_customer_id if found by userId           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. ACTIVATE PRO                                             │
│                                                             │
│    subscriptionService.activateProSubscription()            │
│                                                             │
│    Updates user record:                                     │
│    - subscription_tier: 'pro'                               │
│    - subscription_status: 'active'                          │
│    - stripe_subscription_id: 'sub_xxxxx'                    │
│    - subscription_expires_at: (period end date)             │
│    - cancel_at_period_end: false                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Monthly Renewal (Automatic)

```
┌─────────────────────────────────────────────────────────────┐
│ WEBHOOK: invoice.payment_succeeded                          │
│          (billing_reason = 'subscription_cycle')            │
│                                                             │
│    → Fetches new subscription period_end                    │
│    → Updates subscription_expires_at                        │
│    → User stays Pro with new expiration date                │
└─────────────────────────────────────────────────────────────┘
```

---

## User Cancels Subscription

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UI: User clicks "Cancel Subscription"                    │
│    - Goes to Stripe Customer Portal (or /api/stripe/cancel) │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. WEBHOOK: customer.subscription.updated                   │
│             (cancel_at_period_end = true)                   │
│                                                             │
│    → User KEEPS Pro access until period ends                │
│    → subscription_status stays 'active'                     │
│    → cancel_at_period_end set to true                       │
│    → UI shows "Cancels on [date]"                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. WEBHOOK: customer.subscription.deleted                   │
│             (when period actually ends)                     │
│                                                             │
│    → subscription_tier: 'free'                              │
│    → subscription_status: 'canceled'                        │
│    → stripe_subscription_id: null                           │
│    → User now on free tier with 2/month limit               │
└─────────────────────────────────────────────────────────────┘
```

---

## Payment Fails

```
┌─────────────────────────────────────────────────────────────┐
│ WEBHOOK: invoice.payment_failed                             │
│                                                             │
│    → subscription_status: 'past_due'                        │
│    → User still has access (grace period)                   │
│    → Stripe retries payment automatically                   │
│                                                             │
│    If all retries fail → subscription.deleted webhook       │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Fields

| Field | Type | Purpose |
|-------|------|---------|
| `subscription_tier` | `free` / `pro` | Current tier |
| `subscription_status` | `inactive` / `active` / `past_due` / `canceled` | Payment status |
| `stripe_customer_id` | string | Links to Stripe customer |
| `stripe_subscription_id` | string | Active subscription ID |
| `subscription_expires_at` | timestamp | When current period ends |
| `cancel_at_period_end` | boolean | Scheduled to cancel? |

---

## Key Files

| File | Purpose |
|------|---------|
| `app/api/stripe/checkout/route.ts` | Creates checkout session |
| `app/api/stripe/webhook/route.ts` | Handles all Stripe events |
| `app/api/stripe/portal/route.ts` | Customer portal redirect |
| `app/api/stripe/cancel/route.ts` | Direct cancellation |
| `services/subscriptionService.ts` | All subscription logic |
| `hooks/useSubscription.ts` | Client-side subscription state |

---

## Super Admin Bypass

These emails always have Pro access (hardcoded):
- `gavin@realworth.ai`
- `ann.mcnamara01@icloud.com`

Checked in `subscriptionService.isSuperAdmin()`

---

*Last updated: January 2026*
