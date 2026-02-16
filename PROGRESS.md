# RealWorth.ai Progress

## Current Session
*Updated at end of each session*

**Date:** February 13, 2026
**Focus:** Bullseye Sneaker Partner Portal — Phase 1 MVP

### Completed
- [x] Subdomain middleware routing (`bullseyesb.realworth.ai` → `/partner/bullseye`)
- [x] Sneaker-specific Gemini prompt (`SNEAKER_GRADING_GUIDE`) + `sneakerDetails` schema
- [x] Buy offer rules engine (`buyOfferService.ts`) with configurable margins/deductions
- [x] Database migration: `partner_configs` table + sneaker columns on `rw_appraisals`
- [x] Partner portal UI: landing, upload, condition picker, offer card, accept/decline flow
- [x] Partner mode in `/api/appraise`: skips auth, injects sneaker prompt, computes buy offer
- [x] eBay search optimized for sneakers (style code keyword)
- [x] Root layout strips RealWorth chrome for partner subdomains (fixes hydration errors)
- [x] Domain `bullseyesb.realworth.ai` added to Vercel + DNS configured
- [x] Build verification: zero TypeScript errors, live and serving HTTP 200

### Commits
- `0e017f2` Add Bullseye sneaker partner portal (Phase 1 MVP)
- `a261068` Fix partner layout: remove nested html/body, strip RealWorth chrome

### Files Changed (12 files, +1,067 lines)
- **New:** `middleware.ts`, `app/partner/bullseye/{layout,page}.tsx`, `components/partner/{BuyOfferCard,SneakerConditionPicker,FlawList,AuthenticityBadge}.tsx`, `services/buyOfferService.ts`
- **Modified:** `app/api/appraise/route.ts`, `app/layout.tsx`, `lib/types.ts`, `services/ebayPriceService.ts`

### Next Session Should
1. End-to-end test: submit real sneaker photos through bullseyesb.realworth.ai
2. Bullseye Phase 2: partner dashboard, rules editor UI
3. Consider employee accounts + manager review workflow
4. Monitor main app for regressions from layout change

---

## Previous Session
*Moved from Current Session at start of new session*

**Date:** February 4, 2026
**Focus:** Fix Discover feed, verify Stripe integration after WNU Platform migration

- [x] Fixed Discover feed showing empty (Vercel env vars pointed to old database)
- [x] Updated discover/feed APIs for WNU Platform schema (value_low_cents column)
- [x] Updated all 3 Supabase env vars in Vercel via CLI
- [x] Fixed account delete route for WNU Platform (subscriptions table)
- [x] Comprehensive Stripe integration testing (all flows verified)
- [x] Synced stale subscription dates from Stripe to database

Commits: `c49d187`, `a28f402`, `2ab9430`

---

## Key Context (Persistent)

### Production URLs
- Web: https://realworth.ai
- Partner Portal: https://bullseyesb.realworth.ai
- Supabase: Project ID `ahwensdtjsvuqxbjgkgv` (wnu-platform)
- Vercel Project: `real-worth` (NOT `realworth-ai`)

### Pricing
| Tier | Price | Limit |
|------|-------|-------|
| Free | $0 | Token-based (WNU Platform) |
| Pro Monthly | $19.99/mo | Monthly token grants |
| Pro Annual | $149.99/yr | Monthly token grants |

### Key IDs
- Stripe Pay-Per-Appraisal Price: `price_1Sr3C9CVhCc8z8wiP8xC3VCs`
- Stripe Pro Product: `prod_TTQ9nVd9uSkgvu`
- Bullseye Partner ID: `bullseye` (in `partner_configs` table)
