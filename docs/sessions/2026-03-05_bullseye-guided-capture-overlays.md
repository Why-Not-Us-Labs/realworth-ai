# Session: Bullseye Guided Capture - GOAT-style Guide Overlays

**Date:** March 5, 2026
**Focus:** Upgrade SVG guide overlays in Bullseye partner portal photo capture flow

## Executive Summary

Upgraded the `GuidedCapture` component's silhouette overlays from floating dashed-line paths to proper GOAT-style guide overlays using SVG mask cutout technique. The guides now show a dark semi-transparent overlay covering the entire viewfinder with the guide shape as a clear "window" — matching the GOAT listing photo capture experience.

## Context

The Bullseye partner portal (`bullseyesb.realworth.ai`) has a guided photo capture flow (`GuidedCapture` component) for 7 sneaker angles. The previous session(s) had already:
- Extracted `GuidedCapture` into its own component at `components/partner/GuidedCapture.tsx`
- Extracted image upload utilities into `lib/imageUtils.ts`
- Implemented live camera feed with video capture
- Created 7 step definitions (tag, outer, inner, top, back, soles, issues)
- Added silhouette overlays for each step

The silhouettes were "hand-drawn/childish" looking — just dashed paths floating on the camera feed with no dark overlay mask.

## What Changed

### File: `components/partner/GuidedCapture.tsx`

**Replaced the `Silhouette` component (lines 529-700) with GOAT-style overlays:**

1. **SVG Mask Technique**: Each guide now uses an SVG `<mask>` element — white rect (shows dark overlay) + black shape path (creates clear cutout window)
2. **Dark Overlay**: `rgba(0,0,0,0.4)` covers the entire viewfinder via mask, making the guide shape the only clear area
3. **White Dashed Stroke**: `strokeDasharray="12 8"` (was `6 4`), solid white (was `rgba(255,255,255,0.5)`), `strokeWidth="2"`
4. **Clean Bezier Curves**: All shapes rewritten with smooth cubic bezier `C` curves — geometric/iconic, not anatomically detailed
5. **Removed Detail Lines**: Stripped midsole lines, tread marks, pull tabs, heel counter details that made shapes look busy

**Guide shapes per step:**
| Step | Shape | Description |
|------|-------|-------------|
| tag | Rectangle | Centered frame, ~65% wide, ~55% tall, rounded corners |
| outer | Two shoe profiles | Simplified lateral profiles, toes pointing right, front + back shoe |
| inner | Two shoe profiles | Mirrored medial profiles, toes pointing left |
| top | Two teardrops | Elongated ovals, bird's-eye shoe shapes |
| back | Two U-shapes | Tombstone/U shapes side by side |
| soles | Two sole outlines | Elongated rounded shapes side by side |
| issues/extra | Corner brackets | Unchanged — bracket frame with centered plus |

**Did NOT change:**
- Camera lifecycle, video capture, shutter flash
- Thumbnail strip, step navigation, help overlay
- StepIcon component (small icons for thumbnails)
- Instruction text, photo counter, upload from library
- Step progression logic, finish/retake buttons

### Conflict Resolution

Our initial local work was on the monolithic `app/partner/bullseye/page.tsx` (old architecture). The remote had 3 newer commits that refactored this into:
- `app/partner/bullseye/page.tsx` — slim state machine (316 lines)
- `components/partner/GuidedCapture.tsx` — full capture UI (764 lines)
- `lib/imageUtils.ts` — shared upload/compress utilities

We dropped our local commit (`git reset --hard origin/main`) and applied the guide overlay upgrade directly to the remote's `GuidedCapture` component.

## Commits

- `828e0e3` feat: GOAT-style SVG mask cutout guide overlays for GuidedCapture

## Key Technical Details

### SVG Mask Technique
```svg
<mask id="guide-mask-{stepId}">
  <rect width="300" height="300" fill="white" />   <!-- Show overlay everywhere -->
  <path d="{shapePath}" fill="black" />              <!-- Except here (clear window) -->
</mask>
<rect fill="rgba(0,0,0,0.4)" mask="url(#guide-mask-{stepId})" />  <!-- Dark overlay -->
<path d="{shapePath}" stroke="white" strokeDasharray="12 8" />     <!-- Dashed outline -->
```

### Architecture (current, post-refactor)
```
app/partner/bullseye/page.tsx (316 lines)
  - State machine: landing -> capture -> loading -> result -> accepted/declined
  - Uses GuidedCapture component for capture state
  - Calls /api/appraise with partnerId='bullseye'

components/partner/GuidedCapture.tsx (680 lines)
  - Live camera feed via getUserMedia
  - 7-step guided capture (tag, outer, inner, top, back, soles, issues)
  - SVG mask cutout guide overlays (GOAT-style)
  - Thumbnail strip with free navigation
  - Shutter button, retake, upload from library

lib/imageUtils.ts
  - uploadFile() - Supabase storage upload
  - compressImage() - Client-side JPEG compression
```

## Next Session Priorities

1. **Test the guide overlays on production** — verify they render correctly over the live camera feed on mobile
2. **Iterate on shape accuracy** — the bezier curves may need tuning after seeing them at real camera aspect ratios
3. **Test full appraisal flow** — submit photos through, verify sneaker ID, buy offer, accept/decline
4. **Batch upload feature** — wire Bullseye dashboard to existing queue system
5. **Side project scoping** — ads automation (James's #1) or QuickBooks (#2)
