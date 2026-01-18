# RealWorth.ai Monetization Strategy

## Current Pricing Tiers (January 2026)

### Free Tier
- **2 appraisals per month**
- Basic history
- Single item scanning
- Standard AI (Gemini 3 Pro)

### Pay-As-You-Go - $1.99 per appraisal
- **1 credit = 1 successful appraisal**
- Credits only consumed on success (errors don't deduct)
- No expiration
- Low barrier entry point
- Stepping stone to Pro subscription

### Pro Monthly - $19.99/month
- **Unlimited appraisals**
- **Collections** - Build and track collections
- **AI Chat** - Ask questions about your items
- Add more images to appraisals
- Archive appraisals
- Priority support

### Pro Annual - $149.99/year
- Same as Pro Monthly
- **Save $90/year** (2 months free)

### Legacy Pricing (Grandfathered)
- $9.99/month - Original early adopters

---

## Stripe Configuration

### Product: RealWorth Pro
- Product ID: `prod_TTQ9nVd9uSkgvu`

### Price IDs

| Tier | Price ID | Amount |
|------|----------|--------|
| Monthly V2 | `price_1ScwwuCVhCc8z8wiH7rD1OzB` | $19.99/mo |
| Annual V2 | `price_1ScwwwCVhCc8z8wiprWB7WtP` | $149.99/yr |
| Pay-Per-Appraisal | `price_1Sr3C9CVhCc8z8wiP8xC3VCs` | $1.99 one-time |
| Legacy Monthly | `price_1SWTK6CVhCc8z8wi609mLa1c` | $9.99/mo |

### Environment Variables
```bash
STRIPE_PRO_PRICE_ID_V2="price_1ScwwuCVhCc8z8wiH7rD1OzB"
STRIPE_PRO_ANNUAL_PRICE_ID_V2="price_1ScwwwCVhCc8z8wiprWB7WtP"
```

---

## Implementation Details

### Database Fields (users table)
```sql
subscription_tier           TEXT ('free' or 'pro')
subscription_status         TEXT ('active', 'inactive', 'past_due', 'canceled')
subscription_expires_at     TIMESTAMP
monthly_appraisal_count     INTEGER    -- Free tier usage (resets monthly)
appraisal_count_reset_at    TIMESTAMP
appraisal_credits           INTEGER    -- Pay-per-appraisal balance
stripe_customer_id          TEXT
stripe_subscription_id      TEXT
```

### Pay-Per-Appraisal Flow
1. User hits free limit → UpgradeModal shown
2. User clicks "Pay $1.99 for 1 Appraisal"
3. `POST /api/stripe/pay-per-appraisal` → Creates PaymentIntent
4. Stripe Elements form → User enters card
5. `PUT /api/stripe/pay-per-appraisal` → Confirms payment, adds credit
6. Credit stored in `users.appraisal_credits`
7. On next appraisal, `consumeCredit()` deducts 1 (only on success)

### Transaction History
```sql
-- appraisal_purchases table
id                          UUID
user_id                     UUID (FK → users)
stripe_payment_intent_id    TEXT (unique - idempotency key)
amount_cents                INTEGER
credits_granted             INTEGER
created_at                  TIMESTAMP
```

### Feature Gates
- Check `subscription_tier` before:
  - Creating appraisal (if free, check count < 2 OR credits > 0)
  - Creating collection (Pro only)
  - Accessing chat (Pro only)
  - Adding more images (Pro only)

---

## Conversion Strategy

1. **Hook**: Free users get 2 appraisals to experience value
2. **Friction**: Hit limit → Show upgrade options
3. **Low Barrier**: $1.99 single purchase removes commitment fear
4. **Upsell**: After 3-5 single purchases, Pro becomes obvious value
5. **Retain**: Collections + Chat features keep Pro users engaged

---

## Future Upsells

### One-time Purchases
- Professional appraisal report: $4.99
- Collection certificate: $2.99
- Insurance-ready PDF: $9.99

### Collector Tier (Future) - $29.99/month
- Everything in Pro
- Insurance-ready PDF reports
- Price tracking over time
- Bulk export
- API access

---

## Metrics to Track

- Free → Pay-per-appraisal conversion rate
- Pay-per-appraisal → Pro conversion rate
- Average credits purchased before Pro subscription
- Monthly churn rate
- Appraisals per user per month
- Collection creation rate (Pro users)
- Chat usage (messages per user)
