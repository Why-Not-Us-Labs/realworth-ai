# Action Items - Brutally Prioritized
*Extracted from Mon/Tue/Wed meetings with James (March 2-4, 2026)*

---

## TIER 1: BLOCKING / REVENUE-CRITICAL (Do This Week)

### 1. Get James's Team Testing RealWorth with Pro Accounts
- **Why first**: Nothing else moves until Bullseye validates the product
- **Actions**:
  - Send NDAs to James's team members
  - Set up pro accounts for testers
  - Create photo guidelines doc (lighting, angles, backgrounds)
  - Fix known issues before they test (SKU detection, shoe ID)
- **Owner**: Gavin
- **Deadline**: By Friday March 7

### 2. Fix Wrong Shoe Identification (Air Jordan 4 Issue)
- **Why**: James specifically flagged this - AI identified Air Jordan 4 Aman Meniere incorrectly as regular AJ4. Price difference is $400 vs $2,000+
- **Actions**: Improve Gemini prompt for sneaker variants, colorway detection
- **Owner**: Gavin (RealWorth)
- **Deadline**: Before team testing begins

### 3. SKU/Size Tag Detection Improvement
- **Why**: James wants to photograph size tags for accurate SKU extraction. Currently unreliable
- **Actions**: Add size tag as a supported input, improve structured output for SKU fields
- **Owner**: Gavin (RealWorth)
- **Deadline**: Before team testing begins

---

## TIER 2: HIGH IMPACT AUTOMATION (Next 2 Weeks)

### 4. Media Buying / Ads Automation (Google & Meta)
- **James's #1 priority** for Bullseye operations
- **Problem**: Manually managing ad spend across Google & Meta, can't react fast enough
- **Goal**: Automated bid adjustments, budget allocation, ROAS optimization
- **See**: [side-project-briefs.md → Project 1]

### 5. QuickBooks Categorization for Real-Time Profitability
- **James's #2 priority**
- **Problem**: Can't see real-time P&L by category/channel. Manual categorization in QB
- **Goal**: Auto-categorize transactions, real-time profit dashboards
- **See**: [side-project-briefs.md → Project 2]

### 6. Customer Service Automation (Instagram, Email, FB Messenger, TikTok)
- **James's #3 priority**
- **Problem**: 3 people answering repetitive questions across 4+ channels
- **Goal**: AI auto-responds to common questions, escalates complex ones
- **See**: [side-project-briefs.md → Project 3]

---

## TIER 3: GROWTH & EFFICIENCY (Weeks 3-4)

### 7. Customer Outreach for New Arrivals (CRM + Instagram DM)
- **James's #4 priority**
- **Problem**: Know what customers want but no automated way to notify them when inventory arrives
- **Goal**: Auto-match new inventory to customer preferences, send targeted DMs
- **See**: [side-project-briefs.md → Project 4]

### 8. Batch Upload Feature for RealWorth
- **Why**: Bullseye needs to appraise dozens of items at once, one-by-one is too slow
- **Actions**: Multi-image upload → queue → batch processing → results dashboard
- **Owner**: Gavin (RealWorth)
- **Deadline**: Before full Bullseye rollout

### 9. GA4 Refund Data to Google/Meta
- **James's #5 priority**
- **Problem**: Ad platforms don't know about refunds, so ROAS calculations are inflated
- **Goal**: Pipe refund events from Shopify/eBay back to GA4 → ad platforms
- **See**: [side-project-briefs.md → Project 5]

---

## TIER 4: OPERATIONAL IMPROVEMENTS (Month 2)

### 10. Fraud Call Prevention with Text Follow-Up
- **James's #6 priority**
- **Problem**: Phone orders with stolen credit cards. Currently no verification
- **Goal**: Auto-text verification before processing phone orders
- **See**: [side-project-briefs.md → Project 6]

### 11. Chargeback Response Automation
- **James's #7 priority**
- **Problem**: Manual chargeback responses, low win rate, time-consuming
- **Goal**: Auto-generate evidence packages, improve win rate
- **See**: [side-project-briefs.md → Project 7]

### 12. Whatnot Livestream Monitoring for Real-Time Pricing
- **Why**: James runs Whatnot livestreams - wants real-time price comps during auctions
- **Actions**: Build Whatnot API integration, real-time price overlay
- **Owner**: Gavin (RealWorth)
- **Deadline**: TBD (after core features stable)

---

## TIER 5: NICE-TO-HAVE / LONGER TERM

### 13. Security at Capital City Store (AI Camera Monitoring)
- **James's #8 priority**
- **Problem**: Theft at retail location, current cameras are passive
- **Goal**: AI-powered camera alerts for suspicious behavior
- **See**: [side-project-briefs.md → Project 8]

### 14. Posting Content on Facebook/Instagram Automation
- **James's #9 priority**
- **Problem**: Manual content posting across social platforms
- **Goal**: Auto-generate and schedule posts from inventory/sales data
- **See**: [side-project-briefs.md → Project 9]

### 15. Photo Guidelines Documentation
- **Why**: Consistency for Bullseye team when photographing items
- **Actions**: Create visual guide (angles, lighting, backgrounds, what to include)
- **Owner**: Gavin
- **Deadline**: Before team testing

---

## BUSINESS / PARTNERSHIP ITEMS

### 16. NDA + Partnership Agreement
- **Status**: James needs NDAs before sharing team access
- **Action**: Draft and send NDA to James
- **Owner**: Gavin

### 17. Pricing Model for Bullseye
- **Context**: Need to finalize per-appraisal or subscription pricing for B2B
- **Action**: Propose pricing tiers based on volume (discussed ~$0.50-1.00/appraisal at scale)
- **Owner**: Gavin + James

### 18. Bullseye White-Label Polish
- **Status**: Subdomain routing works (`bullseyesb.realworth.ai`)
- **Remaining**: Custom branding, remove RealWorth references, Bullseye color scheme
- **Owner**: Gavin
