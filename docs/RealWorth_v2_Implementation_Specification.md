# RealWorth.ai v2: Implementation Specification

**Project Goal:** To become the world's #1 appraisal application within six months by achieving unparalleled accuracy, user trust, and actionable guidance.

**Author:** Manus AI

**Date:** January 17, 2026

---

## 1. Executive Summary & Vision

RealWorth.ai v2 will evolve from a promising AI-powered tool into the definitive, most trusted resource for item valuation. We will achieve this by implementing a **Hybrid Valuation Engine** that fuses the scale of real-time market data with the nuanced, factor-based methodology of expert human appraisers like those on *Antiques Roadshow*.

The core strategy rests on three pillars:

1.  **Unquestionable Trust:** Using only authorized, transparent, and authoritative data sources.
2.  **Precision Accuracy:** Moving beyond a single price to a calculated value range based on condition, provenance, and maker premiums.
3.  **Actionable Guidance:** Empowering users not just to know what an item is worth, but how to achieve that value.

This document provides the complete technical and product roadmap for Claude Code to build RealWorth.ai v2.

---

## 2. Preserving v1 Strengths (Non-Regression)

To ensure a successful evolution, v2 **must** retain the powerful features that v1 already excels at. These are our foundational strengths and key differentiators.

| Feature to Preserve | v1 Implementation | v2 Enhancement |
|---|---|---|
| **Detailed Item Identification** | Recognizes specific identifiers (e.g., Friedberg numbers for currency). | Expand identifier library across more categories (e.g., Scott numbers for stamps, CGC numbers for comics). |
| **Industry-Standard Grading** | Uses correct terminology (e.g., Sheldon Scale for coins, PSA grades for cards). | Integrate these grades directly into the **Condition Modifier** logic. |
| **Contextual Market Knowledge** | Understands niche trends (e.g., 90s streetwear resurgence). | Formalize this into a "Market Desirability" score within the valuation engine. |
| **Confidence Scoring** | Displays a confidence percentage with appraisals. | Make this score dynamic, showing users exactly how providing more data (e.g., provenance) increases confidence. |

---

## 3. v2 Architecture: The Hybrid Valuation Engine

The heart of v2 is a new valuation formula that mirrors expert appraisal methodology:

**`Final Value = Base Market Value × Condition Modifier × Maker Premium × Provenance Multiplier`**

This engine will be powered by a tiered data query system designed for accuracy, cost-efficiency, and trust.

### 3.1. Data Query Logic & Flow

For every user appraisal request, the system will execute the following sequence:

1.  **Normalize & Check Cache:** Standardize the user's query (e.g., "iPhone 12" -> "Apple iPhone 12 128GB") and check the internal database for a recent, high-confidence appraisal for the same item. If a valid cached result exists, return it. **(Cost: $0)**
2.  **Query Primary Source (eBay):** If no cache hit, query the **eBay Average Selling Price API** to get the initial `Base Market Value` based on real-world transactions. **(Cost: ~$0.003)**
3.  **Query Authoritative Sources:** Based on the item's category, query the relevant **free, industry-standard** price guide to refine the `Base Market Value` and establish a `Maker Premium`.
    *   **Coins:** PCGS Price Guide
    *   **Sports Cards:** PSA Price Guide
    *   **Fine Art:** Artsy Price Database
    *   *(See Section 4 for the full list)*
    **(Cost: $0)**
4.  **Query Contextual Sources (Museums):** For art and historical artifacts, query the **Smithsonian and Met Museum APIs** to identify similar items in major collections. This data is used for the `Provenance Multiplier`. **(Cost: $0)**
5.  **Apply User-Provided Modifiers:** Use the detailed data collected from the user (see Section 5) to calculate the `Condition Modifier` and further refine the `Provenance Multiplier`.
6.  **Calculate & Store:** Compute the final value range, confidence score, and detailed breakdown. Store the entire result in the internal database for future caching.

---

## 4. Data Integration Strategy: Building Trust

Our data strategy is our trust strategy. We will **only** use authorized APIs and publicly accessible, reputable sources. We will **not** scrape websites in violation of their Terms of Service.

### 4.1. Data Source Tiers

| Tier | Source | Access Method | Cost | Purpose | Trust Factor |
|---|---|---|---|---|---|
| **Primary** | **eBay Average Selling Price API** | RapidAPI | $12-60/mo | `Base Market Value` | High |
| **Authoritative** | **PCGS/NGC Price Guides** (Coins) | Web (Free) | $0 | Refine Base Value, `Maker Premium` | High |
| **Authoritative** | **PSA Price Guide** (Cards) | Web (Free) | $0 | Refine Base Value, `Maker Premium` | High |
| **Authoritative** | **Artsy Price Database** (Art) | Web (Free) | $0 | Refine Base Value, `Maker Premium` | High |
| **Contextual** | **Smithsonian & Met Museum APIs** | API (Free) | $0 | `Provenance Multiplier`, Credibility | High |
| **Secondary** | **AntiqueAdvertising.com** | Web (Free) | $0 | Niche `Base Market Value` | Medium |
| **Secondary** | **GoCollect** (Comics) | Web (Free Tier) | $0 | Refine Base Value | Medium |

### 4.2. The Heritage Auctions Decision

**We will not scrape Heritage Auctions.** Their Terms of Service explicitly prohibit it, and they have a history of litigation. The legal and reputational risk is too high.

**Alternative Strategy:**
1.  **Seek Partnership:** Contact Heritage Auctions (Webmaster@HA.com) to pursue an official data licensing agreement.
2.  **Manual Research:** For ultra-high-value items where our automated sources are insufficient, flag for manual review by an internal expert who can consult Heritage and other auction records.

---

## 5. User Data Collection: The "Antiques Roadshow" Method

We will collect data from users in a tiered, intuitive way that directly maps to the core appraisal factors. This is called **Progressive Disclosure**.

### 5.1. Progressive Disclosure UI/UX

| Tier | User Action | Data Points Collected | Result |
|---|---|---|---|
| **1: Quick Estimate** | Uploads 1 photo, selects category | Category, AI-identified keywords | A wide, low-confidence value range. |
| **2: Standard Appraisal** | Answers 5-7 guided questions | **Condition, Maker, Packaging** | A narrower, medium-confidence value range. |
| **3: Comprehensive** | Uploads more photos & documents | **Provenance, Maker's Marks, Repairs** | A tight, high-confidence value range. |

The UI should gamify this process: *"Your confidence score is 73%. Add provenance details to increase it by 15%!"*

### 5.2. Detailed Data Collection Framework

| Factor | Field Name | UI Type | Options / Description |
|---|---|---|---|
| **Condition** | `overall_condition` | Dropdown | Mint, Excellent, Very Good, Good, Fair, Poor |
| **Condition** | `damage_checklist` | Multi-select | Cracks, Chips, Stains, Tears, Missing Parts, Repairs |
| **Condition** | `original_packaging` | Dropdown | Yes (Sealed), Yes (Open), No |
| **Maker** | `maker_name` | Text (w/ autocomplete) | e.g., "Rolex", "Tiffany & Co." |
| **Maker** | `makers_mark_photo` | File Upload | Prompt: "Photo of any signature, stamp, or logo" |
| **Provenance** | `how_acquired` | Dropdown | Purchased, Inherited, Found, Gift |
| **Provenance** | `provenance_docs` | File Upload | Prompt: "Upload receipts, letters, or prior appraisals" |
| **Rarity** | `is_limited_edition` | Yes/No | If yes, show `edition_number` field. |

---

## 6. Output & Display: Communicating Value & Trust

The appraisal results page is where we earn user trust. It must be transparent and comprehensive.

### 6.1. The v2 Appraisal Result Card

```
+-----------------------------------------------------------+
|  ESTIMATED AUCTION VALUE: $1,200 - $1,800                 |
|  INSURANCE REPLACEMENT VALUE: $2,500                      |
|  Confidence Score: 87%                                    |
+-----------------------------------------------------------+
|  VALUATION BREAKDOWN                                      |
|                                                           |
|  - Base Market Value: $1,500 (from eBay & PCGS data)      |
|  - Condition: -15% (Minor scratches noted)                |
|  - Provenance: +10% (Original receipt provided)           |
|  - Maker Premium: +5% (Sought-after mint mark)            |
|                                                           |
+-----------------------------------------------------------+
|  DATA SOURCES                                             |
|                                                           |
|  [x] eBay Sold Listings (47 comparable sales)             |
|  [x] PCGS Price Guide (MS-65 Grade)                       |
|  [x] Smithsonian Collection (Similar item found)          |
|                                                           |
+-----------------------------------------------------------+
|  MAXIMIZE YOUR VALUE                                      |
|                                                           |
|  - Get it professionally graded by PCGS.                  |
|  - Sell during a major coin auction for best results.     |
|  - Highlight the original receipt in your listing.        |
|                                                           |
+-----------------------------------------------------------+
|  This is an estimate, not a professional appraisal.       |
|      See our full disclaimer.                             |
+-----------------------------------------------------------+
```

### 6.2. Essential Legal Disclaimers

Implement all disclaimers as detailed in the previous analysis. The most critical are:

1.  **Valuation Disclaimer:** On every results page. *"For informational purposes only... not a professional appraisal."*
2.  **User Acknowledgment Checkbox:** Users must check a box agreeing they understand this is an estimate before they can see the value.
3.  **Limitation of Liability:** In the Terms of Service.
4.  **Data Sources & Attribution:** In the footer and on a dedicated page.

---

## 7. Implementation Roadmap (6-Month Plan)

### Phase 1: Foundation (Months 1-2)

*   **Goal:** Build the core Hybrid Valuation Engine.
*   **Tasks:**
    1.  Set up the **eBay Average Selling Price API** integration.
    2.  Build the **internal database/caching layer** (PostgreSQL + Redis).
    3.  Implement the **Progressive Disclosure UI** for data collection (Tiers 1 & 2).
    4.  Develop the initial valuation formula using only eBay data + user-provided Condition.
    5.  Implement all **legal disclaimers** and the user acknowledgment checkbox.

### Phase 2: Authority & Accuracy (Months 3-4)

*   **Goal:** Integrate authoritative sources to dramatically improve accuracy.
*   **Tasks:**
    1.  Build integrations/scrapers for the top 3 free authoritative sources: **PCGS (Coins), PSA (Cards), and Artsy (Art)**.
    2.  Refine the valuation formula to incorporate `Maker Premium`.
    3.  Build the **Museum API integration** (Smithsonian) to add the `Provenance Multiplier`.
    4.  Enhance the results page to show the full **Valuation Breakdown** and **Data Sources**.

### Phase 3: Polish & Growth (Months 5-6)

*   **Goal:** Add features that create a moat and drive user growth.
*   **Tasks:**
    1.  Develop the **"Maximize Your Value"** recommendation engine.
    2.  Integrate the remaining secondary data sources (GoCollect, etc.).
    3.  Build out the **Comprehensive (Tier 3)** data collection flow for high-value items.
    4.  A/B test UI/UX improvements to maximize user engagement and data input.
    5.  Begin outreach to Heritage Auctions and other premium data providers for official partnerships.

---

This document provides a clear and actionable path to establishing RealWorth.ai as the global leader in item appraisal. By focusing on trust, transparency, and a superior methodology, we can confidently achieve our 6-month goal.


---

## Appendix A: Technical Implementation Details

### A.1. eBay Average Selling Price API Integration

**API Endpoint:** `https://ebay-average-selling-price.p.rapidapi.com/findCompletedItems`

**Method:** POST

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY",
  "X-RapidAPI-Host": "ebay-average-selling-price.p.rapidapi.com"
}
```

**Sample Request Body:**
```json
{
  "keywords": "1964 Kennedy Half Dollar",
  "excluded_keywords": "broken damaged lot bulk",
  "max_search_results": "120",
  "remove_outliers": "true",
  "aspects": [
    {"name": "Certification", "value": "PCGS"},
    {"name": "Grade", "value": "MS65"}
  ]
}
```

**Sample Response:**
```json
{
  "average_price": 145.50,
  "median_price": 140.00,
  "price_range": {
    "min": 95.00,
    "max": 225.00
  },
  "total_results": 47,
  "results": [
    {
      "title": "1964 Kennedy Half Dollar PCGS MS65",
      "price": 142.00,
      "sold_date": "2026-01-10",
      "listing_type": "auction"
    }
  ]
}
```

### A.2. Caching Strategy

To minimize API costs and improve response times, implement a multi-layer caching strategy.

**Cache Configuration:**
- TTL: 48 hours
- Min confidence: 0.6 (only cache results with 60%+ confidence)
- Refresh threshold: 24 hours (refresh cache if older than 24 hours on access)

### A.3. Valuation Engine Core Logic

**Formula:** `Final Value = Base Market Value × Condition × Maker × Provenance`

**Condition Modifiers:**
- MINT: 1.0
- EXCELLENT: 0.85
- VERY_GOOD: 0.70
- GOOD: 0.55
- FAIR: 0.35
- POOR: 0.15

**Packaging Bonus:** +5-10% for original packaging

**Damage Penalties:**
- Cracks: -15%
- Chips: -10%
- Stains: -8%
- Tears: -12%
- Missing parts: -20%
- Repairs: -10%

---

## Appendix B: Category-Specific Authority Sources

### B.1. Coins: PCGS & NGC

**PCGS Price Guide URL Pattern:**
`https://www.pcgs.com/prices/detail/{coin-identifier}`

**Key Data Points:**
- Grade-specific prices (PO-1 through MS-70)
- Population reports (how many graded at each level)
- Price history trends

### B.2. Sports Cards: PSA

**PSA Price Guide URL Pattern:**
`https://www.psacard.com/auctionprices/{sport}/{year}/{player-name}`

**Key Data Points:**
- Grade-specific auction results
- Recent sales with dates
- Price trends over time

### B.3. Fine Art: Artsy

**Artsy Price Database URL:**
`https://www.artsy.net/price-database`

**Key Data Points:**
- Artist auction records
- Medium-specific pricing
- Size-based valuations

**Note:** Artsy provides free, unlimited access. No API key required for basic searches.

### B.4. Comics: GoCollect

**GoCollect URL Pattern:**
`https://gocollect.com/comic/{publisher}/{title}/{issue}`

**Key Data Points:**
- CGC grade-specific values
- Fair Market Value (FMV)
- Price trends and volatility

---

## Appendix C: Museum API Integration

### C.1. Smithsonian Open Access API

**Base URL:** `https://api.si.edu/openaccess/api/v1.0/search`

### C.2. Metropolitan Museum of Art API

**Base URL:** `https://collectionapi.metmuseum.org/public/collection/v1/`

---

## Appendix D: Cost Projections

### Monthly API Costs by User Volume

| Monthly Users | Appraisals | eBay API Calls (w/ cache) | eBay API Cost | Total Cost |
|---|---|---|---|---|
| 500 | 1,000 | 300 | $12 (Pro) | **$12/mo** |
| 2,000 | 5,000 | 1,200 | $60 (Ultra) | **$60/mo** |
| 5,000 | 15,000 | 4,000 | $60 (Ultra) | **$60/mo** |
| 10,000 | 30,000 | 8,000 | $60 (Ultra) | **$60/mo** |
| 25,000 | 75,000 | 20,000 | $299 (Mega) | **$299/mo** |

**Assumptions:**
- 2 appraisals per user per month
- 70% cache hit rate (reduces API calls by 70%)
- All authority sources and museum APIs are free

---

## Appendix E: Success Metrics

### Key Performance Indicators (KPIs)

| Metric | Target (6 months) | How to Measure |
|---|---|---|
| **Appraisal Accuracy** | ±15% of actual sale price | Compare appraisals to user-reported sale prices |
| **User Trust Score** | 4.5+ stars | In-app rating after appraisal |
| **Data Completion Rate** | 60%+ users complete Tier 2 | Track progressive disclosure completion |
| **Confidence Score Average** | 75%+ | Average confidence across all appraisals |
| **Monthly Active Users** | 10,000+ | Unique users performing appraisals |
| **Return User Rate** | 40%+ | Users who return within 30 days |

### Accuracy Validation Process

1.  **User Feedback Loop:** After an appraisal, prompt users to report actual sale price if they sell the item.
2.  **eBay Sold Comparison:** For items with high sample sizes, compare our estimate to the actual eBay average.
3.  **Expert Audit:** Quarterly, have a professional appraiser review a sample of 100 appraisals.

---

## Appendix F: Legal Compliance Checklist

| Requirement | Implementation | Status |
|---|---|---|
| Valuation Disclaimer | On every appraisal result page | Pending |
| User Acknowledgment Checkbox | Before showing results | Pending |
| "Not a Professional Appraisal" Notice | On results page | Pending |
| Data Sources Attribution | Footer + dedicated page | Pending |
| Limitation of Liability | Terms of Service | Pending |
| Privacy Policy | Dedicated page | Pending |
| Terms of Service | Dedicated page | Pending |
| Cookie Consent | Banner on first visit | Pending |

---

*End of Document*
