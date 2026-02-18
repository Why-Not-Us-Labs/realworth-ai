# RealWorth.ai Progress

## Current Session
*Updated at end of each session*

**Date:** February 17, 2026
**Focus:** Bullseye Portal Polish — RLS fix, logos, share links, white theme

### Completed
- [x] Fixed image upload failure: added Supabase storage RLS policy for anon uploads to `partner/*`
- [x] Removed condition picker — AI determines sneaker condition from photos alone
- [x] Processed Bullseye logo (background removal via sharp) saved to `public/partners/`
- [x] Generated RealWorth collab logo via Gemini `gemini-2.5-flash-image`
- [x] Replaced text headers with actual logo images in landing + form views
- [x] Switched portal from dark to white background theme (result card stays dark)
- [x] Added share button to BuyOfferCard (Web Share API + clipboard fallback)
- [x] API returns `appraisalId`, saves partner appraisals with `is_public: true`
- [x] Share links use existing `/treasure/[id]` route — appraisals are now persistent
- [x] Verified deployment: Vercel build passed, production screenshot confirmed
- [x] Fixed partner appraisal DB save: `user_id` was NOT NULL, causing silent INSERT failure — made nullable via migration

### Commits
- `7465149` Bullseye portal: white theme, logo branding, share links, remove condition picker

### Files Changed (7 files + 3 new assets)
- **Modified:** `app/api/appraise/route.ts`, `app/partner/bullseye/layout.tsx`, `app/partner/bullseye/page.tsx`, `components/partner/BuyOfferCard.tsx`
- **New:** `public/partners/bullseye-logo.png`, `public/partners/bullseye-logo-white.png`, `public/partners/realworth-collab-logo.png`

### Known Issues (Identified, Not Yet Fixed)
- Share link OG metadata says "RealWorth" not "Bullseye x RealWorth" for partner appraisals
- Favicon/app icon should be collab logo for Bullseye subdomain
- User wants "Accept Offer" to prompt account creation (lead capture)
- ~2 min generation time expected but UX could improve (progress indicators)

### Next Session Should
1. Verify share links work after `user_id` fix
2. Accept offer → signup flow (create account on accept, associate appraisal)
3. Share link branding (OG metadata, favicon, partner detection)
4. Test main app regression
5. Bullseye Phase 2: partner dashboard

---

## Previous Session

**Date:** February 13, 2026
**Focus:** Bullseye Sneaker Partner Portal — Phase 1 MVP

- [x] Subdomain middleware routing (`bullseyesb.realworth.ai` -> `/partner/bullseye`)
- [x] Sneaker-specific Gemini prompt (`SNEAKER_GRADING_GUIDE`) + `sneakerDetails` schema
- [x] Buy offer rules engine (`buyOfferService.ts`) with configurable margins/deductions
- [x] Database migration: `partner_configs` table + sneaker columns on `rw_appraisals`
- [x] Partner portal UI: landing, upload, condition picker, offer card, accept/decline flow
- [x] Partner mode in `/api/appraise`: skips auth, injects sneaker prompt, computes buy offer
- [x] eBay search optimized for sneakers (style code keyword)
- [x] Root layout strips RealWorth chrome for partner subdomains (fixes hydration errors)
- [x] Domain `bullseyesb.realworth.ai` added to Vercel + DNS configured
- [x] Build verification: zero TypeScript errors, live and serving HTTP 200

Commits: `0e017f2`, `a261068`

---

## Earlier Session

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
