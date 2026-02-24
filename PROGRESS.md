# RealWorth.ai Progress

## Current Session
*Updated at end of each session*

**Date:** February 24, 2026
**Focus:** Partnership Documents Rewrite — Advisor feedback from Michael & Scott

### Completed
- [x] Complete rewrite of `COUNTER_PROPOSAL_FOR_ADVISORS.md` — new structure: 10-20% equity for $30-50K, due diligence checklist, vetting questions
- [x] Complete rewrite of `COUNTER_PROPOSAL_TERMS.md` — term sheet with IP protection, revenue sharing options, confident talking points
- [x] Complete rewrite of `MEETING_AGENDA.md` — Wed Feb 26 meeting prep with pushback responses
- [x] Complete rewrite of `30_DAY_MILESTONE_PLAN.md` — now 6-month beta evaluation (March-August 2026)
- [x] Updated `PATENT_RESEARCH_FOR_JAMES.md` — removed joint filing language, patents owned by WNU LLC
- [x] Updated `IP_SUMMARY_ONE_PAGER.md` — strengthened IP ownership, added dissolution language
- [x] Generated PDFs for all 6 documents
- [x] Verified: no stale references to old structure (25-30%, $8-10K/mo, personal justifications)

### Commits
- None (all files in gitignored `legal/` directory)

### Files Changed (6 markdown + 6 PDFs)
- All in `legal/partnership/` (gitignored)

### Next Session Should
1. Post-meeting follow-up (after Wed Feb 26 meeting with James)
2. Verify share links work after `user_id` fix
3. Accept offer -> signup flow
4. Share link branding (OG metadata, favicon)
5. Bullseye Phase 2: partner dashboard

---

## Previous Session

**Date:** February 17, 2026
**Focus:** Bullseye Portal Polish — RLS fix, logos, share links, white theme

- [x] Fixed image upload failure: added Supabase storage RLS policy for anon uploads to `partner/*`
- [x] Removed condition picker — AI determines sneaker condition from photos alone
- [x] Processed Bullseye logo, generated RealWorth collab logo via Gemini
- [x] White background theme, share links, logo branding
- [x] Fixed partner appraisal DB save: `user_id` nullable migration

Commits: `7465149`

---

## Earlier Session

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
