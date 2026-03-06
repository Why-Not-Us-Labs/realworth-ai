# RealWorth.ai Progress

## Current Session
*Updated at end of each session*

**Date:** March 5, 2026
**Focus:** GOAT-style SVG mask cutout guide overlays for Bullseye GuidedCapture

### Completed
- [x] Upgraded `Silhouette` component in `GuidedCapture.tsx` — SVG mask cutout technique
- [x] Dark semi-transparent overlay with clear guide shape windows (GOAT-style)
- [x] White dashed stroke `12px dash, 8px gap` on all 7 guide shapes
- [x] Clean cubic bezier curves — geometric/iconic shapes replacing hand-drawn paths
- [x] Removed busy detail lines (midsole, tread, pull tabs) for cleaner look
- [x] Resolved git conflict — dropped local monolithic edits, applied to remote's extracted component
- [x] Build verified, pushed to production

### Commits
- `828e0e3` feat: GOAT-style SVG mask cutout guide overlays for GuidedCapture

### Key Decisions
- SVG `<mask>` technique: white rect + black shape = dark overlay with clear window
- Kept existing shape paths simplified to geometric/iconic (not anatomically accurate)
- Issues/extra step keeps corner brackets (no mask — different visual intent)
- Aligned with remote's refactored architecture (extracted GuidedCapture + imageUtils)

### Next Session Should
1. **Test guide overlays on production mobile** — verify rendering over live camera feed
2. **Iterate on guide shapes** — tune bezier curves after real-device testing
3. **Test full appraisal flow** — submit photos, verify sneaker ID + buy offer
4. **Batch upload feature** — wire Bullseye dashboard to queue system
5. **Side project scoping** — ads automation (#1) or QuickBooks (#2)

---

## Previous Session

**Date:** March 4, 2026
**Focus:** Super admin fix, sneaker ID improvements, meeting notes, action items

- [x] Fixed `isPro()` RLS bug — anon client blocked ALL server-side pro checks
- [x] Enhanced SNEAKER_GRADING_GUIDE with collab detection (20+ partners)
- [x] Expanded style code extraction (multi-location scan, brand-specific formats)
- [x] Processed 3 days of meeting notes, created prioritized action items + 1-pagers

---

## Earlier Session

**Date:** March 3, 2026
**Focus:** Status check, infra health, March beta priorities

- [x] Synced local to production, Vercel healthy, Supabase healthy
- [x] Synthesized March beta priority list from Feb 25 meeting
- [x] Updated CURRENT_CONTEXT.md

---

## Earlier Session

**Date:** February 24, 2026
**Focus:** Partnership Documents Rewrite — Advisor feedback from Michael & Scott

- [x] Complete rewrite of `COUNTER_PROPOSAL_FOR_ADVISORS.md` — new structure: 10-20% equity for $30-50K, due diligence checklist, vetting questions
- [x] Complete rewrite of `COUNTER_PROPOSAL_TERMS.md` — term sheet with IP protection, revenue sharing options, confident talking points
- [x] Complete rewrite of `MEETING_AGENDA.md` — Wed Feb 26 meeting prep with pushback responses
- [x] Complete rewrite of `30_DAY_MILESTONE_PLAN.md` — now 6-month beta evaluation (March-August 2026)
- [x] Updated `PATENT_RESEARCH_FOR_JAMES.md` — removed joint filing language, patents owned by WNU LLC
- [x] Updated `IP_SUMMARY_ONE_PAGER.md` — strengthened IP ownership, added dissolution language
- [x] Generated PDFs for all 6 documents
- [x] Verified: no stale references to old structure (25-30%, $8-10K/mo, personal justifications)

Commits: None (all files in gitignored `legal/` directory)

---

## Earlier Session

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
