# RealWorth.ai - Current Context

**Last Updated:** February 17, 2026

## Active Work Streams

| Stream | Status | Last Activity |
|--------|--------|---------------|
| Bullseye Partner Portal | Phase 1 Polished | Feb 17 - White theme, logos, share links, condition picker removed |
| WNU Platform Migration | Complete | Feb 4 - Vercel env vars fixed, Discover working |
| Stripe Integration | Verified | Feb 4 - All payment flows tested |
| iOS App / Apple Review | Active | Jan 29 - Capacitor loads from production |

## Quick Status

| Component | State | Notes |
|-----------|-------|-------|
| Web App | Stable | Production at realworth.ai |
| Partner Portal | Live + Polished | bullseyesb.realworth.ai (white theme, real logos, share links) |
| iOS App | Active | Capacitor WebView loads from realworth.ai |
| Auth | Working | Google, Apple, Email all verified |
| Payments | Verified | Stripe fully tested Feb 4 |
| Database | WNU Platform | `ahwensdtjsvuqxbjgkgv` (wnu-platform) |
| Discover Feed | Working | 66 public treasures displaying |
| Partner Uploads | Fixed | RLS policy added for anon → `partner/*` paths |
| Partner DB Save | Fixed | `user_id` now nullable — partner appraisals save to DB |

## Pending Questions
- None currently

## Pending Questions
- Accept offer → create account flow: what auth providers? Google + Apple? Email?
- Share link branding: partner-specific OG image needed?

## Next Session Priorities
1. **Verify share links:** Re-test after `user_id` nullable fix — should work now
2. **Accept offer → signup:** Prompt account creation on "Accept Offer", associate appraisal with new user
3. **Share link branding:** OG metadata ("Bullseye x RealWorth"), favicon, partner detection in treasure route
4. **Test main app regression:** Normal appraisal on realworth.ai still works
5. **Bullseye Phase 2:** Partner dashboard (appraisal pipeline, metrics, rules editor)

## Recent Technical Decisions
- **Feb 17**: Made `rw_appraisals.user_id` nullable for partner appraisals (migration: `allow_nullable_user_id_for_partner_appraisals`)
- **Feb 17**: Added Supabase storage RLS policy for anon uploads to `partner/*` (migration: `allow_anon_partner_storage_uploads`)
- **Feb 17**: Gemini image generation model is `gemini-2.5-flash-image` (other model names 404)
- **Feb 17**: Partner appraisals saved with `is_public: true` and `appraisalId` returned to client for sharing
- **Feb 17**: Share links use existing `/treasure/[id]` route (no new partner-specific route)
- **Feb 17**: White background theme for partner portal (user preference), result card stays dark
- **Feb 17**: AI determines sneaker condition from photos (removed user-facing condition picker)
- **Feb 13**: Root layout detects partner subdomains via `headers()` to strip RealWorth chrome
- **Feb 13**: Partner mode in existing `/api/appraise` (not separate route) to reuse Gemini/eBay logic
- **Feb 13**: Database-driven partner config (`partner_configs` table with JSONB rules)
- **Feb 13**: Buy offer calculation: margin -> condition -> flaws -> accessories -> clamp

## Key Account Info

| Resource | ID/Value |
|----------|----------|
| **Supabase Project (ACTIVE)** | `ahwensdtjsvuqxbjgkgv` (wnu-platform) |
| **Supabase Project (OLD)** | `gwoahdeybyjfonoahmvv` (realworth-db) - DO NOT USE |
| **Vercel Project** | `real-worth` |
| **Stripe Product** | `prod_TTQ9nVd9uSkgvu` |
| **Test Account** | `gav.mcnamara01@gmail.com` (free tier) |
| **Admin Account** | `gavin@realworth.ai` (super admin) |
| **Bullseye Partner ID** | `bullseye` (in `partner_configs` table) |
| **Bullseye Subdomain** | `bullseyesb.realworth.ai` |

## Partner Portal Architecture

```
bullseyesb.realworth.ai
  -> middleware.ts rewrites to /partner/bullseye
  -> app/partner/bullseye/layout.tsx (white bg, no RealWorth chrome)
  -> app/partner/bullseye/page.tsx (upload -> AI appraisal -> buy offer -> share)
  -> /api/appraise with partnerId=bullseye (skips auth, injects sneaker prompt)
  -> buyOfferService.ts calculates offer from partner_configs rules
  -> Saved to rw_appraisals with partner_id, sneaker_details, buy_offer, is_public=true
  -> Share link: realworth.ai/treasure/{appraisalId}
```

## Partner Portal Assets
- `public/partners/bullseye-logo.png` - Black logo, transparent bg
- `public/partners/bullseye-logo-white.png` - White logo, transparent bg
- `public/partners/realworth-collab-logo.png` - Gemini-generated RealWorth script logo

## Storage RLS Policies (appraisal-images bucket)
1. `"Users can upload to own folder"` - authenticated, `foldername[1] = auth.uid()`
2. `"Partners can upload to partner folder"` - anon, `foldername[1] = 'partner'`
