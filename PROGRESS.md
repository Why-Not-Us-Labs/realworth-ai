# RealWorth.ai Progress

## Current Session
*Updated at end of each session*

**Date:** February 4, 2026
**Focus:** Fix Discover feed, verify Stripe integration after WNU Platform migration

### Completed
- [x] Fixed Discover feed showing empty (Vercel env vars pointed to old database)
- [x] Updated discover/feed APIs for WNU Platform schema (value_low_cents column)
- [x] Updated all 3 Supabase env vars in Vercel via CLI
- [x] Fixed account delete route for WNU Platform (subscriptions table)
- [x] Comprehensive Stripe integration testing (all flows verified)
- [x] Synced stale subscription dates from Stripe to database
- [x] Session documentation complete

### Commits
- `c49d187` Fix discover/feed APIs for WNU Platform schema
- `a28f402` Fix account delete route for WNU Platform migration
- `2ab9430` Fix Stripe webhooks for WNU Platform token system

### Key Discovery
**Root Cause:** Vercel env vars were still pointing to old `realworth-db` database (`gwoahdeybyjfonoahmvv`) instead of `wnu-platform` (`ahwensdtjsvuqxbjgkgv`). This caused `PGRST205: Could not find table 'rw_appraisals'` errors because the old DB has `appraisals` table, not `rw_appraisals`.

### Stripe Test Results
| Component | Status |
|-----------|--------|
| Products | PASS |
| Prices | PASS |
| Checkout Route | PASS |
| Webhook Route | PASS |
| Pay-per-appraisal | PASS |
| Signup Grant | PASS |
| Active Subscriptions | PASS |

### Next Session Should
1. Monitor webhook delivery for subscription renewals
2. Consider adding webhook event logging to database
3. Continue iOS app testing with correct database
4. UI/UX polish

---

## Previous Session
*Moved from Current Session at start of new session*

**Date:** January 29, 2026
**Focus:** Sign-in modal fix, header cleanup, env sync

- [x] Synced local env with Vercel (`vercel env pull`) for new WNU Platform database
- [x] Fixed SignInModal clipped behind sticky header (React portal)
- [x] Tested all 3 auth methods (Google, Apple, Email) on production
- [x] Removed "We've upgraded!" migration banner from page.tsx
- [x] Removed Help (?) button from header
- [x] Updated @vercel/analytics to 1.6.1

Commits: `9cbbfbf`, `86e1ee9`, `8f4e715`, `e3d3273`
Stats: 4 commits, 3 files changed, ~55 lines removed

---

## Key Context (Persistent)

### Production URLs
- Web: https://realworth.ai
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
