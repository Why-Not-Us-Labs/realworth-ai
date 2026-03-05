# Side Project 1-Pagers
*Bullseye Sporting Goods Automation Projects*
*Prioritized by James (Wed March 4, 2026)*

---

## Project 1: Media Buying / Ads Automation
**Priority**: #1 | **Estimated Timeline**: 3-4 weeks

**Problem**: Bullseye runs Google Ads and Meta Ads manually. Can't react to performance changes fast enough. Overspending on underperforming campaigns, underspending on winners.

**Solution**: Build an automation layer that connects to Google Ads API and Meta Marketing API to:
- Monitor campaign ROAS in real-time
- Auto-adjust bids based on performance thresholds
- Shift budget between campaigns based on rules (e.g., pause if ROAS < 2x, increase if > 5x)
- Daily/weekly performance reports via email or Slack

**Tech Stack**:
- Google Ads API + Meta Marketing API
- Make.com for orchestration (James already has account)
- Dashboard in Next.js or simple Retool/Streamlit
- Rules engine for bid/budget adjustments

**Key Milestones**:
- Week 1: API connections, data pipeline, historical performance pull
- Week 2: Rules engine, auto-bid adjustments, budget reallocation logic
- Week 3: Dashboard + alerts, testing with small budget
- Week 4: Full rollout, monitoring, tuning

**Dependencies**: Google Ads account access, Meta Business Manager access, current ad account structure

---

## Project 2: QuickBooks Categorization for Real-Time Profitability
**Priority**: #2 | **Estimated Timeline**: 2-3 weeks

**Problem**: Bullseye can't see real-time profitability by category or channel. Transactions in QuickBooks are uncategorized or manually sorted. Month-end is a mess.

**Solution**: Auto-categorize QB transactions using AI + rules:
- Connect to QuickBooks Online API
- Match transactions to categories (inventory, shipping, fees, COGS by channel)
- Real-time P&L dashboard by: product category, sales channel (eBay/Whatnot/in-store/Shopify), time period
- Alert when margins drop below threshold

**Tech Stack**:
- QuickBooks Online API (OAuth2)
- AI categorization (Gemini or rules-based matching)
- Dashboard (Next.js or Retool)
- Make.com for webhook triggers on new transactions

**Key Milestones**:
- Week 1: QB API connection, transaction pull, categorization rules
- Week 2: AI-assisted categorization, dashboard build
- Week 3: Testing with real data, refinement, alerts

**Dependencies**: QuickBooks Online access, chart of accounts structure, sample transaction export

---

## Project 3: Customer Service Automation
**Priority**: #3 | **Estimated Timeline**: 3-4 weeks

**Problem**: 3 staff members handling repetitive questions across Instagram DMs, email, Facebook Messenger, and TikTok. Questions like "Is this still available?", "What size?", "Do you ship internationally?" take up 80% of support time.

**Solution**: AI-powered multi-channel customer service bot:
- Train on FAQ corpus + product knowledge base
- Auto-respond to common questions (availability, sizing, shipping, returns)
- Escalate complex queries to human with full context
- Unified inbox for all channels

**Tech Stack**:
- Instagram Graph API, Facebook Messenger API, email (via Resend or SendGrid)
- Gemini for response generation with RAG over product catalog
- Make.com for channel routing
- Escalation queue in simple dashboard

**Key Milestones**:
- Week 1: Channel integrations (Instagram DM, email), FAQ knowledge base
- Week 2: AI response generation, escalation logic, testing
- Week 3: Add Facebook Messenger + TikTok, human handoff UI
- Week 4: Monitoring, refinement, team training

**Dependencies**: Instagram Business account API access, Meta app review, email forwarding setup

---

## Project 4: Customer Outreach for New Arrivals
**Priority**: #4 | **Estimated Timeline**: 2-3 weeks

**Problem**: Bullseye knows what customers want (from past purchases, DMs, wishlists) but has no automated way to notify them when matching inventory arrives.

**Solution**: CRM + automated outreach system:
- Build customer preference profiles from purchase history and interactions
- When new inventory is added, match against preferences
- Auto-send personalized Instagram DMs or emails: "Hey [name], we just got in a [item] - thought of you!"
- Track conversion from outreach to purchase

**Tech Stack**:
- Customer preference DB (Supabase)
- Matching engine (keyword + category matching, optionally Gemini for semantic)
- Instagram DM API or email for outreach
- Make.com for triggers on new inventory

**Key Milestones**:
- Week 1: Customer preference model, data import from existing CRM/spreadsheets
- Week 2: Matching engine, outreach templates, Instagram DM integration
- Week 3: Testing, conversion tracking, optimization

**Dependencies**: Customer data export, inventory management system API, Instagram API approval

---

## Project 5: GA4 Refund Data to Google/Meta
**Priority**: #5 | **Estimated Timeline**: 1-2 weeks

**Problem**: When a customer gets a refund, Google Ads and Meta Ads still count that as a conversion. This inflates ROAS and leads to bad bidding decisions.

**Solution**: Pipe refund events back to ad platforms:
- Listen for refund events from Shopify/eBay
- Match refund to original order → original ad click
- Send refund/cancellation event to GA4 via Measurement Protocol
- GA4 automatically syncs to Google Ads; set up Meta CAPI for Meta

**Tech Stack**:
- Shopify webhooks (order refunded) + eBay API
- GA4 Measurement Protocol (server-side)
- Meta Conversions API (CAPI)
- Make.com or simple webhook handler

**Key Milestones**:
- Week 1: Refund event capture, order-to-click matching, GA4 integration
- Week 2: Meta CAPI integration, testing, validation

**Dependencies**: Shopify admin access, GA4 property access, Meta pixel/CAPI setup

---

## Project 6: Fraud Call Prevention with Text Follow-Up
**Priority**: #6 | **Estimated Timeline**: 1 week

**Problem**: Phone orders with stolen credit cards. No verification step. Chargebacks cost money and time.

**Solution**: Simple text verification flow:
- When phone order comes in, auto-text the customer's number: "Confirm your order of [item] for $[amount]? Reply YES to confirm"
- Only process order after confirmation
- Flag orders where phone number doesn't match billing info
- Log all verifications for chargeback evidence

**Tech Stack**:
- Twilio SMS (already integrated in RealWorth)
- Simple webhook from POS/order system
- Verification status dashboard

**Key Milestones**:
- Week 1: Twilio integration, verification flow, POS webhook, dashboard

**Dependencies**: POS system API or manual trigger, Twilio account (already have one)

---

## Project 7: Chargeback Response Automation
**Priority**: #7 | **Estimated Timeline**: 2 weeks

**Problem**: Manual chargeback responses are time-consuming and have low win rates. Need to compile evidence (tracking, signatures, correspondence) for each dispute.

**Solution**: Auto-generate chargeback evidence packages:
- Pull order details, tracking info, delivery confirmation from Shopify/eBay
- Pull customer correspondence from email/DM history
- Generate formatted evidence package matching card network requirements
- Auto-submit via Stripe or payment processor API

**Tech Stack**:
- Shopify API (order + fulfillment data), eBay API
- Stripe Disputes API or payment processor
- Gemini for evidence narrative generation
- Template system for Visa/MC/Amex requirements

**Key Milestones**:
- Week 1: Data aggregation (orders, tracking, correspondence), template system
- Week 2: Auto-generation, submission, testing with real disputes

**Dependencies**: Payment processor API access, historical chargeback data for training

---

## Project 8: Security at Capital City Store (AI Camera Monitoring)
**Priority**: #8 | **Estimated Timeline**: 4-6 weeks

**Problem**: Theft at retail location. Current camera system is passive - only useful after the fact.

**Solution**: AI-powered camera monitoring:
- Connect to existing camera feeds (RTSP/ONVIF)
- Real-time object detection for suspicious behaviors (concealment, unusual loitering, after-hours movement)
- Alert staff via push notification or SMS
- Event recording with timestamps for evidence

**Tech Stack**:
- Camera feed ingestion (RTSP → frames)
- Vision AI (Google Cloud Vision or local model)
- Alert system (Twilio SMS + push notifications)
- Event dashboard with clip playback

**Key Milestones**:
- Week 1-2: Camera integration, frame extraction, basic detection
- Week 3-4: Behavior analysis, alert tuning (reduce false positives)
- Week 5-6: Dashboard, historical review, staff training

**Dependencies**: Camera system specs, network access to camera feeds, store layout info

---

## Project 9: Social Media Content Posting Automation
**Priority**: #9 | **Estimated Timeline**: 2-3 weeks

**Problem**: Manual process to create and post content across Facebook and Instagram. Inconsistent posting schedule.

**Solution**: Auto-generate and schedule social media posts:
- When new inventory is photographed, auto-generate post copy using AI
- Create formatted posts with product images, descriptions, pricing
- Schedule across Facebook + Instagram via Meta API
- A/B test post formats, track engagement

**Tech Stack**:
- Meta Graph API (Instagram Content Publishing, Facebook Pages)
- Gemini for caption generation
- Scheduling queue (cron or Make.com)
- Engagement tracking dashboard

**Key Milestones**:
- Week 1: Meta API integration, caption generation, image formatting
- Week 2: Scheduling system, A/B testing framework
- Week 3: Engagement tracking, optimization, team review

**Dependencies**: Instagram Business account, Facebook Page admin access, Meta app review for content publishing

---

## Summary Timeline

| Project | Priority | Est. Time | Start After |
|---------|----------|-----------|-------------|
| Ads Automation | #1 | 3-4 weeks | Immediately |
| QuickBooks Categorization | #2 | 2-3 weeks | Week 1 (parallel) |
| Customer Service AI | #3 | 3-4 weeks | After #1 or #2 |
| Customer Outreach | #4 | 2-3 weeks | After #3 |
| GA4 Refund Data | #5 | 1-2 weeks | Can slot in anytime |
| Fraud Prevention | #6 | 1 week | Can slot in anytime |
| Chargeback Automation | #7 | 2 weeks | After #6 |
| Store Security | #8 | 4-6 weeks | Month 2+ |
| Content Posting | #9 | 2-3 weeks | Month 2+ |

**Total estimated effort**: ~20-28 weeks sequential, but many can run in parallel.
**Realistic with parallel execution**: 8-10 weeks for projects 1-7, then 4-6 weeks for 8-9.
