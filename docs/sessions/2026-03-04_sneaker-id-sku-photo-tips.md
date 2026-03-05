# Session: March 4, 2026 - Sneaker ID, SKU Detection, Photo Tips

## Executive Summary

Implemented product improvements from James's meeting feedback: enhanced sneaker collaboration/variant detection in the AI prompt, expanded style code extraction with multi-location scanning and brand-specific formats, added photo guidance to the Bullseye portal, and made the sneaker grading guide available to all users (was partner-only).

This session also included (from earlier in the day): super admin access fix, isPro() RLS bug fix, meeting notes processing, and action item prioritization.

## Key Decisions

- **Always include SNEAKER_GRADING_GUIDE** for all appraisals, not just partner mode. Same rationale as coins/collectibles guides (avoid category pre-detection latency). ~1.5K extra tokens, negligible cost.
- **Inline tips panel** for Bullseye portal instead of importing `PhotoGuidanceModal` — keeps the partner page self-contained with no new dependencies.
- **NDA is on James's side** for his team to sign — Gavin confirmed we focus on product, not paperwork.

## Code Changes

### 1. `app/api/appraise/route.ts` — Prompt Engineering
- **SNEAKER_GRADING_GUIDE** rewritten:
  - IDENTIFICATION section replaced with expanded style code extraction (4 locations, brand-specific formats for Nike/Jordan, adidas, New Balance, Yeezy)
  - New COLLABORATION & LIMITED EDITION DETECTION section with visual signals, 20+ named collab partners, release type rules, and pricing rule ("NEVER blend collab with GR pricing")
- **Partner prompt** expanded from 1 sentence to 5-point checklist emphasizing collab detection and style code extraction
- **Guide injection**: Removed `if (partnerId)` gate — sneaker guide now included for ALL users

### 2. `app/partner/bullseye/page.tsx` — Photo Tips Panel
- Added `SNEAKER_PHOTO_TIPS` constant (6 tips: side view, size tag, box label, sole, tongue/heel, accessories)
- Added `showTips` state — auto-shows when user first enters form, hidden once a photo is taken
- Inline panel styled in Bullseye red (`bg-red-50`), dismissable with "Got it"

### 3. `components/PhotoGuidanceModal.tsx` — Sneaker Category
- Added `Sneaker` entry to `categoryGuidance` map with 6 tips matching the Bullseye tips

## Commits (Full Session)

| Hash | Message |
|------|---------|
| `2c3884f` | fix: super admin access + isPro() RLS bug blocking all server-side pro checks |
| `aa729de` | docs: meeting notes, prioritized action items, and side project briefs |
| `aa21bf3` | feat: enhance sneaker identification — collab detection, SKU extraction, photo tips |

## Technical Notes

- The `SNEAKER_GRADING_GUIDE` is ~2K characters after expansion. Combined with base system instruction + coin + collectibles guides, total system prompt is ~6K chars (~1.5K tokens). Well within Gemini's context.
- Style code extraction improvement directly impacts eBay price accuracy: `ebayPriceService.ts` uses `styleCode` as primary search term when available. 'unknown' falls back to brand+model+colorway (noisier).
- The collaboration detection list is NOT exhaustive — Gemini should recognize collabs not in the list based on visual signals (non-standard materials, co-branding, design deviations).

## Next Session Priorities

1. **Test collab identification** — run A Ma Maniere AJ4 through Bullseye portal, verify `releaseType: 'collab'` and correct pricing
2. **Test style code extraction** — submit a photo with visible size tag, verify `styleCode` is extracted
3. **Batch upload feature** — wire Bullseye dashboard to existing queue system for multi-item processing
4. **Ads automation scoping** — James's #1 side project priority
5. **QuickBooks API research** — James's #2 priority
