# RealWorth.ai Progress

## Current Session
*Updated at end of each session*

**Date:** March 4, 2026
**Focus:** Super admin fix, sneaker ID improvements, meeting notes, action items

### Completed
- [x] Fixed `isPro()` RLS bug — anon client blocked ALL server-side pro checks (certificates, chat)
- [x] Rewrote `isPro()` to use `getSupabaseAdmin()` with optional email param
- [x] Fixed `can-create` route — auth email fallback when users table row missing
- [x] Inserted James's missing DB rows (users, subscriptions, token_balances)
- [x] Added `gavin@whynotus.ai` and `james@whynotus.ai` to super admin list
- [x] Fixed `Infinity` JSON serialization → `999999`
- [x] Processed 3 days of meeting notes (Mon/Tue/Wed March 2-4 with James)
- [x] Created prioritized action items (18 items, 5 tiers) → `docs/meetings/action-items-prioritized.md`
- [x] Created 1-pagers for 9 Bullseye side projects → `docs/meetings/side-project-briefs.md`
- [x] Enhanced SNEAKER_GRADING_GUIDE with collab detection (20+ partners, visual signals, pricing rules)
- [x] Expanded style code extraction (multi-location scan, brand-specific formats)
- [x] Made sneaker guide available to ALL users (was partner-only)
- [x] Added photo tips panel to Bullseye portal (auto-shows on first form visit)
- [x] Added Sneaker category to PhotoGuidanceModal

### Commits
- `2c3884f` fix: super admin access + isPro() RLS bug blocking all server-side pro checks
- `aa729de` docs: meeting notes, prioritized action items, and side project briefs
- `aa21bf3` feat: enhance sneaker identification — collab detection, SKU extraction, photo tips

### Key Decisions
- `isPro()` MUST use admin client — anon client has no auth context in API routes
- Always include sneaker guide for all appraisals (same as coin/collectibles)
- NDA is on James's side — focus on product improvements, not paperwork
- B2B pricing target: ~$0.50-1.00/appraisal at volume

### Next Session Should
1. **Test collab identification** — A Ma Maniere AJ4 through portal
2. **Test style code extraction** — size tag photo verification
3. **Batch upload feature** — wire Bullseye dashboard to queue system
4. **Ads automation scoping** — James's #1 side project priority
5. **QuickBooks API research** — James's #2 priority

---

## Previous Session

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
