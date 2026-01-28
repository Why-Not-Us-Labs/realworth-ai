# WNU Platform Database Architecture

*Generated from live schema - January 2026*

---

## Entity Relationship Diagram

```mermaid
erDiagram
    %% Core User & Auth
    users ||--|| subscriptions : "has one"
    users ||--|| token_balances : "has one"
    users ||--o{ token_transactions : "logs"
    users ||--o{ friendships : "requester"
    users ||--o{ friendships : "addressee"

    %% Subscription System
    subscriptions }o--|| subscription_tiers : "references"

    %% Token System
    token_transactions }o--o| apps : "optional app"

    %% RealWorth Appraisals
    users ||--o{ rw_appraisals : "owns"
    rw_appraisals ||--o| token_transactions : "spent tokens"
    rw_appraisals ||--o{ rw_messages : "has chat"
    rw_appraisals ||--o| rw_listings : "can list"

    %% Marketplace
    rw_listings ||--o{ rw_offers : "receives"
    rw_listings ||--o{ rw_transactions : "completes"
    users ||--o{ rw_listings : "sells"
    users ||--o{ rw_offers : "makes offers"
    users ||--o{ rw_transactions : "buys/sells"
    rw_transactions ||--o{ rw_reviews : "gets reviewed"

    %% WhatNowUp Projects
    users ||--o{ wnu_projects : "owns"
    wnu_projects ||--o{ wnu_versions : "has versions"
    wnu_projects ||--o{ wnu_messages : "has chat"
    wnu_versions ||--o{ wnu_messages : "linked to"

    %% ========== TABLE DEFINITIONS ==========

    users {
        uuid id PK
        text email
        text display_name
        text username
        text avatar_url
        jsonb preferences
        int current_streak
        int longest_streak
        date last_appraisal_date
        timestamptz created_at
    }

    subscriptions {
        uuid id PK
        uuid user_id FK
        text tier_id FK
        text status
        text stripe_customer_id
        text stripe_subscription_id
        timestamptz current_period_start
        timestamptz current_period_end
        boolean cancel_at_period_end
        timestamptz last_token_grant_at
    }

    subscription_tiers {
        text id PK
        text name
        int initial_tokens
        int monthly_tokens
        text stripe_price_id
        int price_cents
        jsonb features
        boolean is_active
    }

    token_balances {
        uuid user_id PK_FK
        int balance
        int lifetime_earned
        int lifetime_spent
        timestamptz updated_at
    }

    token_transactions {
        uuid id PK
        bigint sequence_num
        uuid user_id FK
        text app_id FK
        int amount
        text transaction_type
        text action_type
        uuid reference_id
        text description
        jsonb metadata
        int balance_after
        timestamptz created_at
    }

    apps {
        text id PK
        text name
        text description
        text domain
        text icon_url
        jsonb token_costs
        boolean is_active
    }

    rw_appraisals {
        uuid id PK
        uuid user_id FK
        uuid transaction_id FK
        text status
        text[] input_images
        text item_name
        text category
        text description
        text author
        text era
        numeric price_low
        numeric price_high
        text currency
        numeric confidence_score
        jsonb confidence_factors
        jsonb ai_analysis
        text ai_reasoning
        jsonb ai_references
        text ai_image_url
        int tokens_spent
        boolean is_public
        text[] tags
        uuid collection_id
        timestamptz created_at
        timestamptz completed_at
    }

    rw_listings {
        uuid id PK
        uuid appraisal_id FK
        uuid seller_id FK
        int asking_price_cents
        boolean accepts_offers
        text city
        text state
        text zip
        text status
        int views_count
        int saves_count
        timestamptz sold_at
    }

    rw_offers {
        uuid id PK
        uuid listing_id FK
        uuid buyer_id FK
        int amount_cents
        text message
        text status
        timestamptz responded_at
    }

    rw_transactions {
        uuid id PK
        uuid listing_id FK
        uuid buyer_id FK
        uuid seller_id FK
        int amount_cents
        int platform_fee_cents
        int seller_payout_cents
        text stripe_payment_intent_id
        text status
        timestamptz completed_at
    }

    rw_reviews {
        uuid id PK
        uuid transaction_id FK
        uuid reviewer_id FK
        uuid reviewee_id FK
        int rating
        text comment
    }

    rw_messages {
        uuid id PK
        uuid appraisal_id FK
        uuid user_id FK
        uuid transaction_id FK
        text role
        text content
        int tokens_spent
    }

    friendships {
        uuid id PK
        uuid requester_id FK
        uuid addressee_id FK
        text status
        timestamptz updated_at
    }

    wnu_projects {
        uuid id PK
        uuid user_id FK
        text name
        text description
        text project_type
        text status
        jsonb config
        text thumbnail_url
    }

    wnu_versions {
        uuid id PK
        uuid project_id FK
        int version_number
        text image_url
        text prompt_used
        jsonb generation_params
        boolean is_current
    }

    wnu_messages {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        uuid version_id FK
        text role
        text content
        text input_image_url
        text output_image_url
        int tokens_used
    }

    feature_flags {
        uuid id PK
        text name
        boolean enabled
        text description
        int rollout_percentage
        uuid[] allowed_user_ids
        text[] allowed_emails
        boolean pro_only
    }

    processed_webhook_events {
        text event_id PK
        text event_type
        timestamptz processed_at
    }
```

---

## Key Takeaways

### 1. Token-Based Economy

| Tier | Initial Tokens | Monthly Tokens | Price |
|------|----------------|----------------|-------|
| Free | 10 | 0 | $0 |
| Pro | 0 | 100 | $19.99/mo |
| Unlimited | 0 | 500 | Custom |

- **1 appraisal = 1 token** (configurable per app via `apps.token_costs`)
- All token movements logged in `token_transactions` with `balance_after` for audit
- `token_balances` tracks current balance + lifetime stats

### 2. Multi-App Platform Architecture

The `apps` table enables a **multi-tenant token system**:
- **RealWorth** (`rw_*` tables) - AI appraisals & marketplace
- **WhatNowUp** (`wnu_*` tables) - AI image generation projects
- Each app can define custom `token_costs` per action type

### 3. Subscription System

```
User Sign Up
    |
    v
auth.users (Supabase Auth)
    |
    | (trigger)
    v
+-- users (profile)
+-- subscriptions (tier_id: 'free')
+-- token_balances (balance: 10)
```

Supports both **Stripe** and **Apple IAP** (via `iap_*` fields on subscriptions).

### 4. RealWorth Marketplace Flow

```
rw_appraisals --> rw_listings --> rw_offers --> rw_transactions --> rw_reviews
     |                |              |               |
     |                |              |               +-- buyer/seller reviews
     |                |              +-- buyer makes offer
     |                +-- seller lists for sale
     +-- AI appraisal complete
```

### 5. Security (RLS)

- All tables protected by **Row Level Security**
- Users can only access their own data
- Public appraisals (`is_public = true`) readable by anyone
- `processed_webhook_events` prevents duplicate Stripe webhook processing

---

## Quick Reference

| Domain | Tables |
|--------|--------|
| **Core** | `users`, `subscriptions`, `subscription_tiers` |
| **Tokens** | `token_balances`, `token_transactions`, `apps` |
| **RealWorth** | `rw_appraisals`, `rw_listings`, `rw_offers`, `rw_transactions`, `rw_reviews`, `rw_messages` |
| **WhatNowUp** | `wnu_projects`, `wnu_versions`, `wnu_messages` |
| **Social** | `friendships` |
| **System** | `feature_flags`, `processed_webhook_events` |

---

## Data Flow: Appraisal

```
1. User submits images
2. Check token_balances.balance > 0
3. INSERT token_transactions (type: 'spend', amount: -1)
4. UPDATE token_balances (balance--, lifetime_spent++)
5. Process with Gemini AI
6. INSERT rw_appraisals (transaction_id links to step 3)
7. Real-time update pushes new balance to UI
```

---

*Platform: Supabase PostgreSQL | Project: WNU Platform*
