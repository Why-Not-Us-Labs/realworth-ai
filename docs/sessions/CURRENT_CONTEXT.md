# RealWorth.ai - Current Context

**Last Updated:** January 29, 2026

## Active Work Streams

| Stream | Status | Last Activity |
|--------|--------|---------------|
| WNU Platform Migration | Active | Jan 29 - Synced local env with new DB |
| Sign-In Modal Fix | Complete | Jan 29 - Portal fix deployed |
| Header UI Cleanup | Complete | Jan 29 - Removed banner + help button |
| Vercel Analytics | Complete | Jan 29 - Updated to v1.6.1 |
| iOS App / Apple Review | Active | Jan 29 - Capacitor loads from production |
| Code Quality / Deslop | Complete | Jan 20 - Removed 178 lines of slop |

## Quick Status

| Component | State | Notes |
|-----------|-------|-------|
| Web App | Stable | Production at realworth.ai |
| iOS App | Active | Capacitor WebView loads from realworth.ai |
| Auth | Working | Google, Apple, Email all verified Jan 29 |
| Payments | Working | Stripe integrated (missing local env vars) |
| Database | New Schema | WNU Platform: subscriptions + token_balances tables |
| Vercel Analytics | Active | v1.6.1, project = "real-worth" |

## Pending Questions
- Buffalo Nickel reappraisal needed (ID: `12814fbb-4278-4977-991e-64d318146d38`, valued $0.20-$1.00)
- Local Stripe env vars missing after `vercel env pull`

## Next Session Priorities
1. Reappraise Buffalo Nickel — currently undervalued
2. Fix local dev Stripe env vars
3. Continue UI/UX polish
4. iOS app testing with new database

## Recent Technical Decisions
- **Jan 29**: Use `createPortal` for modals inside sticky/fixed parents
- **Jan 29**: Removed migration banner (no longer needed)
- **Jan 29**: Removed Help button from header (reduce clutter)
- **Jan 29**: Local env synced with Vercel via `vercel env pull`
- **Jan 20**: Consolidated 8 duplicate `getSupabaseAdmin()` to single import
- **Jan 18**: Removed AI image regeneration for user trust

## Key Account Info
- **Supabase Project:** `gwoahdeybyjfonoahmvv`
- **Vercel Project:** `real-worth` (NOT `realworth-ai` — that's an orphan)
- **Test Account:** `gav.mcnamara01@gmail.com` (free tier)
- **Admin Account:** `gavin@realworth.ai` (super admin)
