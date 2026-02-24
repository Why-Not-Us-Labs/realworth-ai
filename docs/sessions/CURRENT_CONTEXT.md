# RealWorth.ai - Current Context

**Last Updated:** February 24, 2026

## Active Work Streams

| Stream | Status | Last Activity |
|--------|--------|---------------|
| Partnership / Legal Docs | Rewritten for Wed meeting | Feb 24 - All 6 docs + PDFs reflect advisor feedback |
| Bullseye Partner Portal | Phase 1 Polished | Feb 17 - White theme, logos, share links, condition picker removed |
| WNU Platform Migration | Complete | Feb 4 - Vercel env vars fixed, Discover working |
| Stripe Integration | Verified | Feb 4 - All payment flows tested |
| iOS App / Apple Review | Active | Jan 29 - Capacitor loads from production |

## Quick Status

| Component | State | Notes |
|-----------|-------|-------|
| Web App | Stable | Production at realworth.ai |
| Partner Portal | Live + Polished | bullseyesb.realworth.ai (white theme, real logos, share links) |
| iOS App | Active | Capacitor WebView loads from realworth.ai |
| Auth | Working | Google, Apple, Email all verified |
| Payments | Verified | Stripe fully tested Feb 4 |
| Database | WNU Platform | `ahwensdtjsvuqxbjgkgv` (wnu-platform) |
| Discover Feed | Working | 66 public treasures displaying |
| Partnership Docs | Ready | All 6 docs rewritten + PDFs generated for Wed Feb 26 meeting |

## Pending Questions
- Accept offer -> create account flow: what auth providers? Google + Apple? Email?
- Share link branding: partner-specific OG image needed?

## Next Session Priorities
1. **Post-meeting follow-up** (after Wed Feb 26 meeting with James)
2. **Verify share links:** Re-test after `user_id` nullable fix
3. **Accept offer -> signup:** Prompt account creation on "Accept Offer", associate appraisal with new user
4. **Share link branding:** OG metadata ("Bullseye x RealWorth"), favicon, partner detection in treasure route
5. **Test main app regression:** Normal appraisal on realworth.ai still works
6. **Bullseye Phase 2:** Partner dashboard (appraisal pipeline, metrics, rules editor)

## Recent Technical Decisions
- **Feb 24**: All partnership docs rewritten per advisor guidance (10-20% equity for $30-50K, 6-month eval, no compensation from James)
- **Feb 24**: IP ownership language strengthened across all docs — all IP stays with WNU LLC, no co-ownership
- **Feb 17**: Made `rw_appraisals.user_id` nullable for partner appraisals
- **Feb 17**: Added Supabase storage RLS policy for anon uploads to `partner/*`
- **Feb 17**: Gemini image generation model is `gemini-2.5-flash-image`
- **Feb 17**: Partner appraisals saved with `is_public: true` and `appraisalId` returned to client
- **Feb 17**: White background theme for partner portal, result card stays dark
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

## Partner Portal Assets
- `public/partners/bullseye-logo.png` - Black logo, transparent bg
- `public/partners/bullseye-logo-white.png` - White logo, transparent bg
- `public/partners/realworth-collab-logo.png` - Gemini-generated RealWorth script logo

## Storage RLS Policies (appraisal-images bucket)
1. `"Users can upload to own folder"` - authenticated, `foldername[1] = auth.uid()`
2. `"Partners can upload to partner folder"` - anon, `foldername[1] = 'partner'`

## Partnership Documents (legal/partnership/)
All rewritten Feb 24 per Michael & Scott's advisor guidance:
- `COUNTER_PROPOSAL_FOR_ADVISORS.md` - Main strategy doc with meeting summary
- `COUNTER_PROPOSAL_TERMS.md` - Term sheet (10-20% equity for $30-50K)
- `MEETING_AGENDA.md` - Wed Feb 26 meeting prep
- `30_DAY_MILESTONE_PLAN.md` - 6-month beta evaluation plan
- `PATENT_RESEARCH_FOR_JAMES.md` - Patents owned by WNU LLC
- `IP_SUMMARY_ONE_PAGER.md` - IP position summary
- All PDFs generated in same directory
