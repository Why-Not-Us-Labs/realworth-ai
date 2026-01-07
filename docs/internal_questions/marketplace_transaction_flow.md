# Marketplace Transaction Flow: List → Buy → Pickup → Payout

*Internal documentation explaining how marketplace transactions work with Stripe Connect.*

---

## Overview

RealWorth marketplace enables local pickup transactions:
1. Seller lists an appraised item
2. Buyer pays (payment authorized, not captured)
3. They meet for pickup
4. Buyer confirms receipt → Payment captured → Seller paid

**Platform fee**: 2.5%

---

## Seller Onboarding (One-Time)

Before selling, users must:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PHONE VERIFICATION                                       │
│    - POST /api/seller/verify-phone (send code)              │
│    - POST /api/seller/verify-phone (confirm code)           │
│    - Uses Twilio SMS                                        │
│    - Stored: users.phone_verified = true                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. STRIPE CONNECT ONBOARDING                                │
│    - POST /api/seller/onboard                               │
│    - Creates Stripe Connect Express account                 │
│    - Redirects to Stripe-hosted onboarding form             │
│    - User enters bank info, identity verification           │
│    - Stored: users.stripe_connect_id                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Seller Creates Listing

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UI: User clicks "Sell This" on an appraisal              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. API: POST /api/listings                                  │
│                                                             │
│    Creates listing record:                                  │
│    - appraisal_id (link to appraised item)                  │
│    - asking_price (seller sets price)                       │
│    - pickup_city, pickup_state                              │
│    - status: 'active'                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. RESULT: Item appears in marketplace browse               │
└─────────────────────────────────────────────────────────────┘
```

---

## Buyer Initiates Purchase

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UI: Buyer clicks "Buy Now" on listing                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SERVICE: transactionService.createTransaction()          │
│                                                             │
│    Validations:                                             │
│    - Listing is active                                      │
│    - Buyer is not the seller                                │
│    - Seller has Stripe Connect                              │
│    - No existing pending transaction                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. STRIPE: Create PaymentIntent (manual capture)            │
│                                                             │
│    stripe.paymentIntents.create({                           │
│      amount: price in cents,                                │
│      capture_method: 'manual',  ← KEY: authorize only       │
│      transfer_data: {                                       │
│        destination: seller.stripe_connect_id                │
│      },                                                     │
│      application_fee_amount: 2.5% platform fee              │
│    })                                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. DATABASE: Create transaction record                      │
│                                                             │
│    - listing_id, buyer_id, seller_id                        │
│    - amount, platform_fee, seller_payout                    │
│    - stripe_payment_intent_id                               │
│    - status: 'pending'                                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. UI: Show Stripe payment form (Elements)                  │
│    - Returns clientSecret for payment confirmation          │
│    - Buyer enters card, clicks Pay                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Payment Authorization

```
┌─────────────────────────────────────────────────────────────┐
│ 6. STRIPE: Payment authorized (not captured)                │
│    - PaymentIntent status: 'requires_capture'               │
│    - Money is "held" on buyer's card                        │
│    - Seller hasn't received anything yet                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. SERVICE: confirmPaymentAuthorized()                      │
│                                                             │
│    - Verify PaymentIntent status = 'requires_capture'       │
│    - Update transaction status: 'payment_authorized'        │
│    - Update listing status: 'pending'                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Pickup Scheduling

```
┌─────────────────────────────────────────────────────────────┐
│ 8. SELLER: Sets pickup details                              │
│                                                             │
│    transactionService.setPickupDetails(                     │
│      transactionId,                                         │
│      pickupAddress,                                         │
│      pickupScheduledAt (optional)                           │
│    )                                                        │
│                                                             │
│    - Status: 'pickup_scheduled'                             │
│    - Buyer sees address and time                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Pickup Confirmation (Money Moves!)

```
┌─────────────────────────────────────────────────────────────┐
│ 9. BUYER: Confirms they received the item                   │
│                                                             │
│    transactionService.confirmPickupComplete()               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. STRIPE: Capture the payment                             │
│                                                             │
│     stripe.paymentIntents.capture(paymentIntentId)          │
│                                                             │
│     - Money moves from buyer's card                         │
│     - Platform fee goes to RealWorth                        │
│     - Remainder goes to seller's Connect account            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 11. DATABASE: Update records                                │
│                                                             │
│     Transaction:                                            │
│     - status: 'completed'                                   │
│     - completed_at: now                                     │
│     - buyer_confirmed_at: now                               │
│                                                             │
│     Listing:                                                │
│     - status: 'sold'                                        │
│     - sold_at: now                                          │
│                                                             │
│     User (seller):                                          │
│     - Increment total_sales count                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Cancellation

Either party can cancel before pickup confirmation:

```
┌─────────────────────────────────────────────────────────────┐
│ transactionService.cancelTransaction()                      │
│                                                             │
│ If PaymentIntent status = 'requires_capture':               │
│   → stripe.paymentIntents.cancel() (release hold)           │
│                                                             │
│ If PaymentIntent status = 'succeeded':                      │
│   → stripe.refunds.create() (full refund)                   │
│                                                             │
│ Transaction status: 'cancelled'                             │
│ Listing status: 'active' (back on market)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Transaction States

```
pending → payment_authorized → pickup_scheduled → completed → paid_out
    │              │                   │              │
    └──────────────┴───────────────────┴──────────────┘
                          │
                          ▼
                      cancelled
```

---

## Money Flow Example

**Item price**: $100.00

```
Buyer pays:              $100.00
Platform fee (2.5%):     -$2.50
Stripe processing (~3%): -$3.00 (approximate)
─────────────────────────────────
Seller receives:         ~$94.50
```

---

## Key Files

| File | Purpose |
|------|---------|
| `services/transactionService.ts` | All transaction logic |
| `services/listingService.ts` | Listing CRUD |
| `services/sellerService.ts` | Seller onboarding |
| `app/api/transactions/route.ts` | Transaction API |
| `app/api/listings/route.ts` | Listing API |
| `app/api/seller/*` | Onboarding APIs |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `listings` | Items for sale |
| `transactions` | Purchase records |
| `users.stripe_connect_id` | Seller payout account |
| `users.phone_verified` | Seller verification |

---

*Last updated: January 2026*
