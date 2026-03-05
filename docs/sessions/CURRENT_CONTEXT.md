# RealWorth.ai - Current Context

**Last Updated:** March 4, 2026

## Active Work Streams

| Stream | Status | Last Activity |
|--------|--------|---------------|
| Super Admin / Pro Access Fix | **Deployed** | Mar 4 - isPro() RLS bug fixed, all server-side pro checks working |
| Bullseye Side Projects (9) | **Prioritized** | Mar 4 - 1-pagers created, James ranked priorities |
| RealWorth Beta Prep | Blocked (NDA) | Mar 4 - Need NDA before team testing |
| March Beta (Bullseye x Shopify) | Planning | Mar 3 - Priorities from meetings |
| Partnership / Beta Agreement | Pending | NDA needed, pricing TBD |
| Bullseye Partner Portal | Phase 1 Polished | Feb 17 - White theme, logos, share links |
| WNU Platform Migration | Complete | Feb 4 |
| Stripe Integration | Verified | Feb 4 |

## Quick Status

| Component | State | Notes |
|-----------|-------|-------|
| Web App | Stable | Production at realworth.ai |
| Partner Portal | Live + Polished | bullseyesb.realworth.ai |
| Super Admin Access | **Fixed** | isPro() uses admin client now |
| Insurance Certificates | **Fixed** | Was blocked for all users |
| AI Chat (Pro) | **Fixed** | Was blocked for all users |
| Vercel | Healthy | Latest deploy: `2c3884f` |
| Supabase | Healthy | James's rows manually inserted |
| Auth | Working | Google, Apple, Email all verified |
| Payments | Verified | Stripe fully tested Feb 4 |
| Database | WNU Platform | `ahwensdtjsvuqxbjgkgv` (wnu-platform) |

## James Meeting Notes (March 2-4, 2026)

3 days of calls documented in `docs/meetings/`:
- `2026-03-02_james-monday.md` - Product feedback, shoe ID issues, batch upload
- `2026-03-03_james-tuesday.md` - Operations deep dive, Whatnot, security
- `2026-03-04_james-wednesday.md` - Side project prioritization (9 projects ranked)

**Prioritized action items**: See `docs/meetings/action-items-prioritized.md`
**Side project 1-pagers**: See `docs/meetings/side-project-briefs.md`

## James's Side Project Priority Ranking

1. Media buying/ads automation (Google & Meta) - 3-4 weeks
2. QuickBooks categorization for real-time profitability - 2-3 weeks
3. Customer service automation (IG, email, FB, TikTok) - 3-4 weeks
4. Customer outreach for new arrivals (CRM + IG DM) - 2-3 weeks
5. GA4 refund data to Google/Meta - 1-2 weeks
6. Fraud call prevention with text follow-up - 1 week
7. Chargeback response automation - 2 weeks
8. Security at Capital City store (AI cameras) - 4-6 weeks
9. Social media content posting automation - 2-3 weeks

## RealWorth Technical Priorities (Before Team Testing)

1. Fix shoe variant ID (Air Jordan 4 Aman Meniere misidentified)
2. Improve SKU detection from size tag photos
3. Create photo guidelines document
4. Batch upload feature for warehouse intake
5. Whatnot livestream pricing integration (future)

## Pending Questions
- NDA: Has it been sent to James?
- Pricing model: ~$0.50-1.00/appraisal at volume - finalized?
- Which side project to start building first?
- Shopify embed approach: widget vs full page integration?

## Next Session Priorities

### Immediate (This Week)
1. **Send NDA** to James - blocks team testing
2. **Fix shoe variant identification** - AJ4 colorway detection
3. **SKU/size tag detection** improvement
4. **Photo guidelines doc** for Bullseye team

### Side Projects (Start Next)
5. **Ads automation scoping** - James's #1 priority
6. **QuickBooks API research** - James's #2 priority

### Carried Forward
7. Shopify embed/widget for bullseyesb.com
8. Bot protection / whitelisting
9. Bullseye Phase 2 - partner dashboard

### Supabase Security (Noted, Not Urgent)
- Enable RLS on `partner_configs` (exposed `api_key` column)
- Enable RLS on `profiles`, Whoop tables
- Fix mutable search_path on 12 functions

## Recent Technical Decisions
- **Mar 4**: `isPro()` must use `getSupabaseAdmin()` - anon client has no auth context in API routes
- **Mar 4**: Super admin email fallback: `can-create` route uses `authUser.email` when users table row missing
- **Mar 4**: `handle_new_user()` trigger can silently fail - need manual row insertion as fallback
- **Mar 3**: Confirmed `wnu-platform` is active DB; `realworth-db` is legacy/unused
- **Feb 25**: Partnership shifted to 30-day beta trial (not equity deal)
- **Feb 25**: Shopify embed deployment agreed (vs subdomain for public beta)
- **Feb 25**: Must hide appraisal methodology from partner-facing tool (IP protection)

## Super Admin Emails
```
gavin@realworth.ai
gavin@whynotus.ai      (Gavin's actual Google OAuth login)
ann.mcnamara01@icloud.com
sammy@whynotus.ai
james@bullseyesb.com
james@whynotus.ai
```

## Key Account Info

| Resource | ID/Value |
|----------|----------|
| **Supabase Project (ACTIVE)** | `ahwensdtjsvuqxbjgkgv` (wnu-platform) |
| **Supabase Project (OLD)** | `gwoahdeybyjfonoahmvv` (realworth-db) - DO NOT USE |
| **Vercel Project** | `real-worth` |
| **Stripe Product** | `prod_TTQ9nVd9uSkgvu` |
| **Test Account** | `gav.mcnamara01@gmail.com` (free tier) |
| **Admin Account** | `gavin@whynotus.ai` (super admin, actual login) |
| **Bullseye Partner ID** | `bullseye` (in `partner_configs` table) |
| **Bullseye Subdomain** | `bullseyesb.realworth.ai` |
| **James's User ID** | `419093e5-12ea-425f-9662-2ad513eefe64` |

## Partner Portal Architecture

```
bullseyesb.realworth.ai
  -> middleware.ts rewrites to /partner/bullseye
  -> app/partner/bullseye/layout.tsx (white bg, no RealWorth chrome)
  -> app/partner/bullseye/page.tsx (upload -> AI appraisal -> buy offer -> share)
  -> /api/appraise with partnerId=bullseye (skips auth, injects sneaker prompt)
  -> buyOfferService.ts calculates offer from partner_configs rules
  -> Saved to rw_appraisals with partner_id, sneaker_details, buy_offer, is_public=true
  -> Share link: realworth.ai/treasure/{appraisalId}
```

## Partner Portal Assets
- `public/partners/bullseye-logo.png` - Black logo, transparent bg
- `public/partners/bullseye-logo-white.png` - White logo, transparent bg
- `public/partners/realworth-collab-logo.png` - Gemini-generated RealWorth script logo

## Partnership Documents (legal/partnership/)
All rewritten Feb 24 per Michael & Scott's advisor guidance:
- `COUNTER_PROPOSAL_FOR_ADVISORS.md` - Main strategy doc
- `COUNTER_PROPOSAL_TERMS.md` - Term sheet (10-20% equity for $30-50K)
- `30_DAY_MILESTONE_PLAN.md` - 6-month beta evaluation plan
- `PATENT_RESEARCH_FOR_JAMES.md` - Patents owned by WNU LLC
- `IP_SUMMARY_ONE_PAGER.md` - IP position summary
