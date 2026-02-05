# RealWorth.ai - Current Context

**Last Updated:** February 4, 2026

## Active Work Streams

| Stream | Status | Last Activity |
|--------|--------|---------------|
| WNU Platform Migration | Complete | Feb 4 - Vercel env vars fixed, Discover working |
| Stripe Integration | Verified | Feb 4 - All payment flows tested |
| iOS App / Apple Review | Active | Jan 29 - Capacitor loads from production |
| Code Quality / Deslop | Complete | Jan 20 - Removed 178 lines of slop |

## Quick Status

| Component | State | Notes |
|-----------|-------|-------|
| Web App | Stable | Production at realworth.ai |
| iOS App | Active | Capacitor WebView loads from realworth.ai |
| Auth | Working | Google, Apple, Email all verified |
| Payments | Verified | Stripe fully tested Feb 4 |
| Database | WNU Platform | `ahwensdtjsvuqxbjgkgv` (wnu-platform) |
| Discover Feed | Working | 66 public treasures displaying |
| Vercel Analytics | Active | v1.6.1, project = "real-worth" |

## Pending Questions
- None currently

## Next Session Priorities
1. Monitor webhook delivery for subscription renewals
2. Consider adding webhook event logging to database
3. Continue iOS app testing with correct database
4. UI/UX polish

## Recent Technical Decisions
- **Feb 4**: Updated Vercel env vars via CLI to point to wnu-platform database
- **Feb 4**: Fixed column names in discover/feed APIs (value_low_cents not price_low)
- **Feb 4**: Synced subscription dates from Stripe to DB
- **Jan 29**: Use `createPortal` for modals inside sticky/fixed parents
- **Jan 29**: Removed migration banner (no longer needed)
- **Jan 20**: Consolidated 8 duplicate `getSupabaseAdmin()` to single import

## Key Account Info

| Resource | ID/Value |
|----------|----------|
| **Supabase Project (ACTIVE)** | `ahwensdtjsvuqxbjgkgv` (wnu-platform) |
| **Supabase Project (OLD)** | `gwoahdeybyjfonoahmvv` (realworth-db) - DO NOT USE |
| **Vercel Project** | `real-worth` |
| **Stripe Product** | `prod_TTQ9nVd9uSkgvu` |
| **Test Account** | `gav.mcnamara01@gmail.com` (free tier) |
| **Admin Account** | `gavin@realworth.ai` (super admin) |
