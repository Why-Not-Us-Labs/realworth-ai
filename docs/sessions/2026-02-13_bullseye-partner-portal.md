# Session: Bullseye Sneaker Partner Portal (Phase 1 MVP)

**Date:** February 13, 2026
**Focus:** Implement Phase 1 of Bullseye partner portal — sneaker AI appraisal with buy offers

## Executive Summary

Built a complete white-label sneaker appraisal portal for Bullseye (3 sneaker stores in PA/DE/Philly). The portal lives at `bullseyesb.realworth.ai` as a subdomain-routed experience completely isolated from the main RealWorth app. No sign-in required — designed for frictionless in-store/QR use.

## Context

Partnership call with James (Bullseye). He wants RealWorth to power a "CarMax for sneakers" — customers submit photos, get instant buy offers, bring items to his stores. He has 100+ store owners in his network for scale. James is already a super admin in the system.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Subdomain routing via middleware (not route groups) | Minimal impact on existing app, no file moves needed |
| Partner mode in existing `/api/appraise` (not separate route) | Reuses Gemini/eBay logic, avoids duplication |
| Root layout detects partner via `host` header | Strips all RealWorth chrome (AuthProvider, BottomTabNav, ChatFAB, FeedbackWidget) for partner subdomains |
| Database-driven partner config (`partner_configs` table) | Scales to multiple partners without code changes |
| No auth required for partner portal | Frictionless in-store/QR code usage |
| Buy offer rules in JSONB column | James can adjust margins/deductions without deploys |

## What Was Built

### New Files (8)
- `middleware.ts` — Subdomain routing: `bullseyesb.*` → `/partner/bullseye`
- `app/partner/bullseye/layout.tsx` — Bullseye-branded layout (black/red, no RealWorth chrome)
- `app/partner/bullseye/page.tsx` — Full appraisal flow (landing → upload → loading → result → accept/decline)
- `components/partner/BuyOfferCard.tsx` — Offer display with breakdown, authenticity, flaws, store CTA
- `components/partner/SneakerConditionPicker.tsx` — DS/VNDS/Excellent/Good/Fair/Beater selector
- `components/partner/FlawList.tsx` — Severity-colored flaw display
- `components/partner/AuthenticityBadge.tsx` — Green/yellow/red confidence indicator
- `services/buyOfferService.ts` — Buy offer calculation engine (margin, condition, flaws, accessories, clamping)

### Modified Files (4)
- `app/api/appraise/route.ts` — Added `SNEAKER_GRADING_GUIDE`, `sneakerDetails` schema, partner mode (skip auth, compute buy offer, save to DB)
- `app/layout.tsx` — Detects partner subdomains via `headers()`, conditionally strips RealWorth UI chrome
- `lib/types.ts` — Added `SneakerDetails`, `BuyOffer`, `BuyOfferRules`, `PartnerConfig`, etc.
- `services/ebayPriceService.ts` — Added sneaker keyword builder (style code primary, brand+model+colorway fallback)

### Database Migration
- Created `partner_configs` table (partner_id, buy_offer_rules JSONB, branding JSONB)
- Seeded Bullseye config: 35% margin, condition modifiers, flaw deductions, $10-500 offer range
- Extended `rw_appraisals`: added `partner_id`, `sneaker_details`, `buy_offer`, `buy_offer_status` columns
- Added index on `partner_id WHERE partner_id IS NOT NULL`

## Buy Offer Calculation Flow

1. Market value = midpoint of Gemini price range
2. Base offer = market value x (1 - 35%)
3. Condition adjustment = base x condition modifier (DS: 0%, VNDS: -3%, ... Beater: -40%)
4. Flaw deductions = sum of per-flaw severity deductions (major: -8%, moderate: -4%, minor: -1%)
5. No-box deduction = -10% of base
6. Clamped between $10 and $500
7. Flagged for manager review if: low auth score, high market value, or minimum offer

## Commits

- `0e017f2` Add Bullseye sneaker partner portal (Phase 1 MVP)
- `a261068` Fix partner layout: remove nested html/body, strip RealWorth chrome

## Bug Found & Fixed

**React hydration errors (#418/#423):** The initial Bullseye layout defined its own `<html>`/`<body>` tags, which nested inside the root layout's, causing hydration mismatches. Fixed by:
1. Making Bullseye layout use a `<div>` wrapper instead
2. Making root layout detect partner subdomains via `headers()` and skip all RealWorth UI chrome

## Infrastructure

- Domain `bullseyesb.realworth.ai` added to Vercel via CLI
- DNS A record `bullseyesb` → `76.76.21.21` configured at GoDaddy
- SSL auto-provisioned by Vercel
- Verified live: HTTP 200, `x-matched-path: /partner/bullseye`

## What's NOT Built Yet (Phase 2-4)

- Partner dashboard (appraisal pipeline, metrics)
- Rules editor UI (James adjusts margins via web)
- Historical data import (CSV of purchase history)
- Employee accounts and manager review workflow
- Photo-of-photo fraud detection
- QR code landing pages with attribution
- Multi-store support
- Embeddable widget
- Partner self-service onboarding

## Technical Notes for Future

- Root layout is now `async` (uses `await headers()`) — this makes all pages dynamic. Acceptable tradeoff.
- Partner appraisals use admin Supabase client (service role key) since there's no user auth
- `sneakerDetails` is an optional field in the Gemini schema — only populated when partnerId triggers the sneaker prompt
- Bullseye API key is generated and stored in `partner_configs.api_key` (not yet used for auth — future Phase 2)
- The `SNEAKER_GRADING_GUIDE` is appended to the system instruction only when `partnerId` is present
