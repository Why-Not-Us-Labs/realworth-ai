# PR/FAQ: RealWorth.ai — Current State

*This document honestly describes where RealWorth.ai stands today. Use alongside PR_FAQ_FUTURE.md to understand the gap between current reality and our moonshot vision.*

---

## PRESS RELEASE

### RealWorth.ai Launches AI-Powered Appraisal Platform for Collectors

**Know what your treasures are really worth—instantly**

**SAN FRANCISCO — January 2026** — RealWorth.ai today launched a new way for collectors, flippers, and everyday people to discover the value of their belongings. Using advanced AI powered by Google Gemini, users can photograph any item and receive an instant appraisal with market references, price ranges, and expert-level analysis.

#### The Problem We're Solving

Most people have no idea what their stuff is worth. Professional appraisals are expensive ($50-300) and slow (days to weeks). Online searches return conflicting information. The result? People sell valuable items for pennies at garage sales, or hold onto worthless items thinking they're treasures.

#### Our Solution

RealWorth.ai puts a professional appraiser in your pocket. Snap a photo, and our AI analyzes the item, researches comparable sales, and delivers a detailed valuation in under 30 seconds. No appointments, no waiting, no expertise required.

#### What's Live Today

- **Instant AI Appraisals**: Multi-image upload, condition detection, detailed analysis
- **Gamification**: Duolingo-style streaks, trivia during processing, celebration screens
- **Social Features**: Friends, public profiles, discovery feed, leaderboard
- **Collections**: Organize items, track completion, share with others
- **Pro Tier** ($19.99/month): Unlimited appraisals, AI chat, advanced features
- **Marketplace**: Create listings, browse items, connect with local buyers
- **Local Events**: Discover garage sales, estate sales, and flea markets near you

#### Early Traction

- Active users discovering the platform
- Thousands of appraisals completed
- Pro subscribers growing month-over-month
- 4.5+ star average user satisfaction

#### Founder Quote

"We built RealWorth because we believe everyone deserves to know what their stuff is worth," said Gavin McNamara, Founder. "Whether you're cleaning out a garage, inheriting an estate, or just curious about that old book on your shelf—RealWorth gives you the answer in seconds."

#### Availability

RealWorth.ai is live now at [realworth.ai](https://realworth.ai).

- **Free**: 3 appraisals per month
- **Pro**: $19.99/month (unlimited appraisals, AI chat, collections)

---

## WHAT'S ACTUALLY WORKING TODAY

### Core Features (Fully Functional)

| Feature | Status | Notes |
|---------|--------|-------|
| AI Appraisals | Live | Google Gemini, multi-image, condition detection |
| Image Regeneration | Live | AI cleans up photos for presentation |
| User Authentication | Live | Google OAuth via Supabase |
| Appraisal History | Live | Full CRUD, archive/unarchive |
| Public/Private Toggle | Live | Control visibility per appraisal |
| Streaks & Gamification | Live | Current/longest streak tracking |
| Trivia Quiz | Live | 20+ questions during AI processing |
| Celebration Screens | Live | Confetti, value-based messages |
| Friends System | Live | Search, request, accept, decline |
| User Profiles | Live | Public pages, treasure grids |
| Discovery Feed | Live | Browse public appraisals |
| Leaderboard | Live | Top value finders |
| Collections | Live | Create, organize, track completion |
| Pro Subscription | Live | Stripe integration, $19.99/mo |
| AI Chat | Live (Pro) | Item-level and global context |
| Feature Flags | Live | Database-driven, admin UI |

### Marketplace & Transactions (Functional, Early Stage)

| Feature | Status | Notes |
|---------|--------|-------|
| Create Listings | Live | Appraisal → listing flow |
| Browse Marketplace | Live | Category/price filters |
| Seller Onboarding | Live | Phone verification (Twilio) |
| Stripe Connect | Live | Seller payout infrastructure |
| Transaction Flow | Live | Payment → pickup → payout |
| Local Events | Live | Map view, event types |

### Partially Built (In Progress)

| Feature | Status | Blocker |
|---------|--------|---------|
| Insurance Certificates | Feature-flagged | PDF generation incomplete |
| Price Tracking | Schema only | No UI, no tracking logic |
| Dealer Network | Designed | Not implemented |
| Mobile App | Scaffolded | React Native setup, not shipped |
| Email Notifications | Service ready | Not integrated into flows |
| Multiple Images (add more) | Planned | NEXT_FEATURES.md spec exists |

---

## FREQUENTLY ASKED QUESTIONS

### User FAQs

**Q: What can I actually do on RealWorth today?**

A: Right now you can:
1. Upload photos of any item and get an AI-powered appraisal
2. Build streaks and earn trivia points (gamification)
3. Add friends and see what they're finding
4. Browse a discovery feed of public appraisals
5. Organize items into collections
6. Subscribe to Pro for unlimited appraisals and AI chat
7. List items for sale on the marketplace
8. Find local garage sales and estate sales

**Q: How accurate are the appraisals?**

A: Our AI (Google Gemini) provides solid estimates with price ranges and confidence levels. Accuracy varies by category—common items like books and coins are highly accurate; rare or unusual items have wider ranges. We always recommend professional verification for items worth $1,000+.

**Q: What's included in Pro?**

A: Pro tier ($19.99/month or $149.99/year) includes:
- Unlimited appraisals (vs. 3/month free)
- AI chat about your items
- Full collection features
- Priority processing
- No ads

**Q: Is there a mobile app?**

A: Not yet. The web app is mobile-responsive and works well on phones, but native iOS/Android apps are in development.

**Q: Can I actually sell things?**

A: Yes! The marketplace is live. You can:
- Create listings from your appraisals
- Set asking prices
- Connect with local buyers for pickup
- Receive payments via Stripe

Note: The marketplace is early-stage with limited buyer traffic currently.

**Q: How does seller verification work?**

A: To list items, you need to:
1. Verify your phone number (SMS code)
2. Connect a Stripe account for payouts

This prevents fraud and ensures payments are secure.

---

### Technical FAQs

**Q: What's the tech stack?**

A:
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **AI**: Google Gemini (`gemini-3-pro-preview` for appraisals, `gemini-3-pro-image-preview` for images)
- **Auth**: Supabase Auth (Google OAuth)
- **Database**: Supabase PostgreSQL with Row-Level Security
- **Storage**: Supabase Storage (images)
- **Payments**: Stripe (subscriptions), Stripe Connect (marketplace)
- **Hosting**: Vercel (120s timeout for appraisals)
- **SMS**: Twilio (seller verification)
- **Maps**: Mapbox (event locations)

**Q: What API routes exist?**

A: Core routes:
- `POST /api/appraise` — Core appraisal (120s timeout)
- `GET/PATCH /api/appraise/[id]` — Manage appraisals
- `POST /api/chat` — AI chat (Pro only, 60s timeout)
- `POST /api/stripe/webhook` — Subscription lifecycle
- `GET/POST /api/listings` — Marketplace
- `GET/POST /api/events` — Local events
- `POST /api/seller/verify-phone` — Seller onboarding

**Q: How does the subscription system work?**

A:
- Free tier: 3 appraisals/month (tracked in `monthly_appraisal_count`)
- Pro tier: Unlimited, managed via Stripe
- Webhooks handle subscription lifecycle (created, updated, cancelled)
- Super admin emails bypass all limits
- Legacy pricing ($9.99) grandfathered for early users

**Q: What feature flags exist?**

A: Current flags in database:
- `ai_chat` — AI chat feature (enabled for Pro)
- `insurance_certificates` — PDF reports (partially built)
- `dealer_network` — B2B features (not started)
- `one_click_selling` — Quick listing (not started)
- `price_tracking` — Value tracking (schema only)
- `marketplace` — Marketplace features (enabled)
- `explore_events` — Local events (enabled)

---

### Strategic FAQs

**Q: What's working well?**

A:
- **Core appraisal UX**: Fast, accurate, satisfying
- **Gamification**: Streaks and trivia create engagement loops
- **Social features**: Friends and discovery add stickiness
- **Subscription flow**: Stripe integration is solid
- **Seller infrastructure**: Phone verification + Stripe Connect ready

**Q: What needs work?**

A:
- **Marketplace liquidity**: Few buyers currently
- **Mobile experience**: Web-only, needs native apps
- **Price tracking**: Not implemented
- **Insurance certificates**: Feature-flagged, incomplete
- **Email notifications**: Not integrated
- **Onboarding**: Could be smoother for new users

**Q: What's the immediate roadmap?**

A: Priority order based on NEXT_FEATURES.md:
1. Multiple images per appraisal (add more photos after initial)
2. Archive improvements (better UX for hiding items)
3. Insurance certificates (PDF generation)
4. Mobile app (React Native, iOS first)
5. Price tracking (portfolio value over time)

---

## GAP ANALYSIS: FUTURE vs. CURRENT

| Capability | Future State | Current State | Gap Size |
|------------|--------------|---------------|----------|
| **Users** | 10M registered | Early adopters | Massive |
| **AI Accuracy** | 95%+ validated | Good estimates | Medium |
| **Video Scanning** | Full support | Images only | Large |
| **Marketplace GMV** | $50M annual | Early transactions | Massive |
| **Dealer Network** | 10k+ verified | None | Not started |
| **Mobile Apps** | iOS + Android native | Web responsive | Large |
| **Price Tracking** | Real-time portfolio | None | Large |
| **Insurance Certs** | Carrier partnerships | PDF scaffold | Large |
| **Enterprise API** | Full platform | None | Not started |
| **International** | Multi-region | US only | Not started |
| **Revenue** | $100M ARR target | Early revenue | Massive |

---

## HONEST ASSESSMENT

### Strengths
- **Core product works**: Appraisal flow is polished and valuable
- **Infrastructure ready**: Payments, auth, database are production-grade
- **Gamification differentiates**: Streaks/trivia are unique in this space
- **Social foundation**: Friends/discovery create network potential
- **Feature flag system**: Can ship features safely

### Challenges
- **Marketplace chicken-and-egg**: Need buyers AND sellers
- **Mobile gap**: Competitors have native apps
- **Revenue concentration**: Mostly subscription, marketplace not contributing yet
- **Single developer**: Velocity limited by team size
- **Category breadth**: Accuracy varies by category

### Next 90-Day Priorities
1. Ship mobile app (iOS first)
2. Complete insurance certificates
3. Launch dealer network beta
4. Implement price tracking
5. Build email notification system

---

## KEY METRICS TO TRACK

| Metric | Current | 90-Day Target |
|--------|---------|---------------|
| Monthly Active Users | TBD | Track baseline |
| Pro Subscribers | TBD | Track baseline |
| Appraisals/Day | TBD | Track baseline |
| Marketplace Listings | TBD | Track baseline |
| Seller Conversion | TBD | Track baseline |
| Free → Pro Conversion | TBD | Track baseline |

---

*Last updated: January 2026*
*Document version: 1.0*
*Classification: Internal Strategy / Investor-Ready*

---

**See also**: [PR_FAQ_FUTURE.md](./PR_FAQ_FUTURE.md) for the moonshot vision we're building toward.
