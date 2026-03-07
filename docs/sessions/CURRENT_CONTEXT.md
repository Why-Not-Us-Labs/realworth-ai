# RealWorth.ai - Current Context

**Last Updated:** March 5, 2026

## Active Work Streams

| Stream | Status | Last Activity |
|--------|--------|---------------|
| GuidedCapture v2 (Live Camera) | **Deployed** | Mar 5 - WebRTC camera, large silhouettes, free nav — needs iPhone testing |
| Sneaker ID & SKU Detection | **Deployed** | Mar 4 - Collab detection, style code extraction, photo tips shipped |
| Super Admin / Pro Access Fix | **Deployed** | Mar 4 - isPro() RLS bug fixed, all server-side pro checks working |
| Bullseye Side Projects (9) | **Prioritized** | Mar 4 - 1-pagers created, James ranked priorities |
| RealWorth Beta Prep | Blocked (NDA on James) | Mar 4 - NDA is on James's side for his team |
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
| Sneaker Collab Detection | **Deployed** | New prompt with 20+ named partners, visual signals |
| SKU/Style Code Extraction | **Deployed** | Multi-location scan, brand-specific formats |
| Bullseye Photo Tips | **Deployed** | Auto-show tips panel on first form visit |
| Vercel | Healthy | Latest deploy: `9571b6c` |
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

1. ~~Fix shoe variant ID~~ **DONE** — collab detection prompt shipped
2. ~~Improve SKU detection~~ **DONE** — multi-location scan + brand formats
3. ~~Photo guidelines~~ **DONE** — Bullseye portal tips panel + PhotoGuidanceModal Sneaker category
4. Batch upload feature for warehouse intake
5. Whatnot livestream pricing integration (future)

## Pending Questions
- NDA: Has it been sent to James?
- Pricing model: ~$0.50-1.00/appraisal at volume - finalized?
- Which side project to start building first?
- Shopify embed approach: widget vs full page integration?

## Next Session Priorities

### Immediate (This Week)
1. **Test GuidedCapture v2 on iPhone** — camera permission, live overlay, silhouettes, capture flow
2. **Iterate silhouettes if needed** — SVG paths may need refinement after real-device testing
3. **Batch upload feature** — wire Bullseye dashboard to existing queue system
4. **NDA** — on James's side for his team

### Side Projects (Start Next)
5. **Ads automation scoping** — James's #1 priority
6. **QuickBooks API research** — James's #2 priority

### Carried Forward
7. Shopify embed/widget for bullseyesb.com
8. Bot protection / whitelisting
9. Bullseye Phase 2 - partner dashboard

### Supabase Security (Noted, Not Urgent)
- Enable RLS on `partner_configs` (exposed `api_key` column)
- Enable RLS on `profiles`, Whoop tables
- Fix mutable search_path on 12 functions

## Recent Technical Decisions
- **Mar 5**: GuidedCapture v2 — WebRTC live camera, large SVG silhouettes, free thumbnail nav, shutter flash
- **Mar 5**: User preference: always push after committing (no confirmation needed)
- **Mar 4**: Always include SNEAKER_GRADING_GUIDE for all users (was partner-only). Same rationale as coin/collectibles guides.
- **Mar 4**: Collab detection added to prompt — 20+ named partners, visual signals, pricing rules
- **Mar 4**: Style code multi-location scan — tongue tag, box label, heel, hang tag with brand-specific formats
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
