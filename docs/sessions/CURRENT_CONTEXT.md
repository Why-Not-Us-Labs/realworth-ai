# RealWorth.ai - Current Context

**Last Updated:** February 13, 2026

## Active Work Streams

| Stream | Status | Last Activity |
|--------|--------|---------------|
| Bullseye Partner Portal | Phase 1 Complete | Feb 13 - Live at bullseyesb.realworth.ai |
| WNU Platform Migration | Complete | Feb 4 - Vercel env vars fixed, Discover working |
| Stripe Integration | Verified | Feb 4 - All payment flows tested |
| iOS App / Apple Review | Active | Jan 29 - Capacitor loads from production |

## Quick Status

| Component | State | Notes |
|-----------|-------|-------|
| Web App | Stable | Production at realworth.ai |
| Partner Portal | Live | bullseyesb.realworth.ai (Bullseye sneaker portal) |
| iOS App | Active | Capacitor WebView loads from realworth.ai |
| Auth | Working | Google, Apple, Email all verified |
| Payments | Verified | Stripe fully tested Feb 4 |
| Database | WNU Platform | `ahwensdtjsvuqxbjgkgv` (wnu-platform) |
| Discover Feed | Working | 66 public treasures displaying |

## Pending Questions
- None currently

## Next Session Priorities
1. **Bullseye Phase 2**: Partner dashboard (appraisal pipeline, metrics, rules editor)
2. **Bullseye testing**: End-to-end sneaker appraisal test with real photos
3. Monitor webhook delivery for subscription renewals
4. Continue iOS app testing
5. UI/UX polish

## Recent Technical Decisions
- **Feb 13**: Root layout detects partner subdomains via `headers()` to strip RealWorth chrome
- **Feb 13**: Partner mode in existing `/api/appraise` (not separate route) to reuse Gemini/eBay logic
- **Feb 13**: Database-driven partner config (`partner_configs` table with JSONB rules)
- **Feb 13**: Buy offer calculation: margin → condition → flaws → accessories → clamp
- **Feb 4**: Updated Vercel env vars via CLI to point to wnu-platform database
- **Jan 29**: Use `createPortal` for modals inside sticky/fixed parents

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
  → middleware.ts rewrites to /partner/bullseye
  → app/partner/bullseye/layout.tsx (black/red, no RealWorth chrome)
  → app/partner/bullseye/page.tsx (upload → AI appraisal → buy offer)
  → /api/appraise with partnerId=bullseye (skips auth, injects sneaker prompt)
  → buyOfferService.ts calculates offer from partner_configs rules
  → Saved to rw_appraisals with partner_id, sneaker_details, buy_offer
```
