# RealWorth.ai - Current Context

**Last Updated:** March 3, 2026

## Active Work Streams

| Stream | Status | Last Activity |
|--------|--------|---------------|
| March Beta (Bullseye x Shopify) | Planning | Mar 3 - Priorities synthesized from Feb 25 meeting |
| Partnership / Beta Agreement | Pending | Feb 25 - 30-day beta agreed, formal doc needed |
| Bullseye Partner Portal | Phase 1 Polished | Feb 17 - White theme, logos, share links |
| WNU Platform Migration | Complete | Feb 4 - Vercel env vars fixed, Discover working |
| Stripe Integration | Verified | Feb 4 - All payment flows tested |
| iOS App / Apple Review | Active | Jan 29 - Capacitor loads from production |

## Quick Status

| Component | State | Notes |
|-----------|-------|-------|
| Web App | Stable | Production at realworth.ai |
| Partner Portal | Live + Polished | bullseyesb.realworth.ai |
| Vercel | Healthy | All deployments Ready, no failures |
| Supabase | Healthy | ACTIVE_HEALTHY, some security advisors flagged |
| Auth | Working | Google, Apple, Email all verified |
| Payments | Verified | Stripe fully tested Feb 4 |
| Database | WNU Platform | `ahwensdtjsvuqxbjgkgv` (wnu-platform) |

## Partnership Status (Post Feb 25 Meeting)

**Agreed with James:**
- 30-day beta trial (no equity during beta)
- 2-year exclusivity on footwear/streetwear
- Transaction fee model once live
- RealWorth can opt out anytime
- Deploy directly on bullseyesb.com (Shopify embed)

**Working cadence:** Twice-weekly check-ins, weekly sprints
**Team Slack:** Pending (James sending invite)

## Pending Questions
- Shopify embed approach: widget vs full page integration?
- Bot protection: whitelisting vs rate limiting vs both?
- Accept offer -> create account flow: what auth providers?
- Share link branding: partner-specific OG image needed?

## Next Session Priorities

### March Beta — Technical
1. **Shopify embed/widget** for bullseyesb.com — James providing dev access
2. **Hide methodology** — strip rationale from partner-facing results, show simple offer only
3. **Bot protection** — prevent algorithm reverse-engineering, whitelisting system
4. **Accept offer -> signup flow** — account creation on "Accept Offer"

### Carried Forward
5. **Verify share links** — re-test after `user_id` nullable fix
6. **Share link branding** — OG metadata, favicon, partner detection
7. **Test main app regression** — normal appraisal on realworth.ai
8. **Bullseye Phase 2** — partner dashboard (pipeline, metrics, rules editor)

### Supabase Security (Noted, Not Urgent)
- Enable RLS on `partner_configs` (exposed `api_key` column)
- Enable RLS on `profiles`, Whoop tables
- Fix mutable search_path on 12 functions

## Recent Technical Decisions
- **Mar 3**: Confirmed `wnu-platform` is active DB; `realworth-db` is legacy/unused
- **Feb 25**: Partnership shifted to 30-day beta trial (not equity deal) per meeting with James
- **Feb 25**: Shopify embed deployment agreed (vs subdomain approach for public beta)
- **Feb 25**: Must hide appraisal methodology from partner-facing tool (IP protection)
- **Feb 24**: Partnership docs rewritten per advisor guidance
- **Feb 17**: Made `rw_appraisals.user_id` nullable for partner appraisals
- **Feb 17**: AI determines sneaker condition from photos (removed condition picker)

## Key Account Info

| Resource | ID/Value |
|----------|----------|
| **Supabase Project (ACTIVE)** | `ahwensdtjsvuqxbjgkgv` (wnu-platform) |
| **Supabase Project (OLD)** | `gwoahdeybyjfonoahmvv` (realworth-db) - DO NOT USE |
| **Vercel Project** | `real-worth` |
| **Stripe Product** | `prod_TTQ9nVd9uSkgvu` |
| **Test Account** | `gav.mcnamara01@gmail.com` (free tier) |
| **Admin Account** | `gavin@realworth.ai` (super admin) |
| **Bullseye Partner ID** | `bullseye` (in `partner_configs` table) |
| **Bullseye Subdomain** | `bullseyesb.realworth.ai` |

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

## March Beta Target Architecture (NEW)

```
bullseyesb.com (Shopify)
  -> Embedded widget/page served from RealWorth
  -> User stays on bullseyesb.com (trust factor)
  -> Simple offer display (no methodology shown)
  -> Bot protection / whitelisting layer
  -> Transaction fee model per appraisal
```

## Partner Portal Assets
- `public/partners/bullseye-logo.png` - Black logo, transparent bg
- `public/partners/bullseye-logo-white.png` - White logo, transparent bg
- `public/partners/realworth-collab-logo.png` - Gemini-generated RealWorth script logo

## Storage RLS Policies (appraisal-images bucket)
1. `"Users can upload to own folder"` - authenticated, `foldername[1] = auth.uid()`
2. `"Partners can upload to partner folder"` - anon, `foldername[1] = 'partner'`

## Partnership Documents (legal/partnership/)
All rewritten Feb 24 per Michael & Scott's advisor guidance:
- `COUNTER_PROPOSAL_FOR_ADVISORS.md` - Main strategy doc
- `COUNTER_PROPOSAL_TERMS.md` - Term sheet (10-20% equity for $30-50K)
- `30_DAY_MILESTONE_PLAN.md` - 6-month beta evaluation plan
- `PATENT_RESEARCH_FOR_JAMES.md` - Patents owned by WNU LLC
- `IP_SUMMARY_ONE_PAGER.md` - IP position summary
