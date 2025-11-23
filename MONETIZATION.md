# RealWorth.ai Monetization Strategy

## Pricing Tiers

### Free Tier
- **10 appraisals per month**
- Basic history
- Single item scanning
- Standard AI (Gemini 3 Pro)

### Pro Tier - $10.99/month
- **Unlimited appraisals**
- **Collections** - Build and track collections
- **AI Chat** - Ask questions about your items
- Add more images to appraisals
- Archive appraisals
- Priority support

---

## Implementation Notes

### Tracking Usage
```sql
-- Add to users table
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN monthly_appraisal_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN appraisal_count_reset_at TIMESTAMP;
```

### Payment Integration Options
- **Stripe** - Best for web subscriptions
- **RevenueCat** - If we go mobile app
- **Paddle** - Alternative to Stripe

### Feature Gates
- Check `subscription_tier` before:
  - Creating appraisal (if free, check count < 10)
  - Creating collection (Pro only)
  - Accessing chat (Pro only)
  - Adding more images (Pro only)

### Free Trial Ideas
- 7-day Pro trial for new users
- First 3 appraisals free (no limit)
- Refer a friend = 5 bonus appraisals

---

## Future Upsells

### Collector Tier (Future) - $19.99/month
- Everything in Pro
- Insurance-ready PDF reports
- Price tracking over time
- Bulk export
- API access

### One-time Purchases
- Professional appraisal report: $4.99
- Collection certificate: $2.99

---

## Conversion Strategy

1. **Hook**: Free users get 10 great appraisals
2. **Engage**: Show Collections feature (locked)
3. **Convert**: "Unlock unlimited + collections for $10.99/mo"
4. **Retain**: Chat feature keeps them coming back

---

## Metrics to Track

- Free → Pro conversion rate
- Monthly churn rate
- Appraisals per user per month
- Collection creation rate
- Chat usage (messages per user)
