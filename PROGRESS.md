# RealWorth.ai Progress

## Current Session
*Updated at end of each session*

**Date:** March 3, 2026
**Focus:** Status check, infra health verification, March beta priority synthesis

### Completed
- [x] Synced local to production (`git reset --hard origin/main` — was 9 commits behind)
- [x] Vercel status check: all deployments Ready, no failures
- [x] Supabase status check: ACTIVE_HEALTHY, flagged security advisors (6 tables missing RLS, `partner_configs` exposed `api_key`)
- [x] Reviewed Granola meeting notes from Feb 25 meeting with James
- [x] Synthesized March beta priority list from meeting outcomes
- [x] Updated CURRENT_CONTEXT.md with new partnership status and priorities

### Commits
- None (status/planning session only)

### Key Decisions
- Partnership: 30-day beta trial agreed (not equity), transaction fee model
- Deployment: Shopify embed on bullseyesb.com (not just subdomain)
- IP protection: Must hide methodology from partner-facing tool
- Confirmed: `wnu-platform` is active DB, `realworth-db` is legacy

### Next Session Should
1. **Shopify embed** — research Shopify app/widget integration for bullseyesb.com
2. **Hide methodology** — strip rationale from partner results (simple offer only)
3. **Bot protection** — whitelisting / rate limiting for beta
4. **Accept offer -> signup flow** — account creation flow
5. **30-day beta agreement** — draft formal doc if not done externally
6. Check if Slack workspace set up with James

---

## Previous Session

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
