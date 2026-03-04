# Session: Bullseye Dashboard — Submit Appraisal Modal

**Date:** February 20, 2026
**Duration:** ~15 minutes
**Focus:** Add ability to submit new appraisals directly from the Bullseye partner dashboard

## Executive Summary

Added a "New Appraisal" button to the Bullseye dashboard that opens a modal for submitting sneaker appraisals without leaving the dashboard. This was requested for James's demo — staff can now submit appraisals from the dashboard itself instead of navigating to the consumer flow.

## What Was Built

### New File: `components/partner/dashboard/SubmitAppraisalModal.tsx`
- Full modal overlay with backdrop (closes on click outside or Escape key)
- Store selector dropdown (from `BULLSEYE_STORES` in `lib/partnerConfig.ts`)
- Image upload: camera button (mobile) + file picker (desktop), up to 5 photos with previews
- Reuses compress/upload pattern from consumer page (`app/partner/bullseye/page.tsx`)
  - Images compressed to 1600px max dimension, JPEG 0.8 quality
  - Uploaded to Supabase Storage `appraisal-images` bucket at `partner/bullseye/{ts}-{rand}.{ext}`
- Submit POSTs to existing `/api/appraise` with `{ imageUrls, imagePaths: [], partnerId: 'bullseye', storeLocation }`
- Loading state with step indicators (same steps as consumer flow)
- Error handling: shown inline, modal stays open for retry
- On success: calls `onSuccess()` callback which closes modal and refreshes dashboard data

### Modified File: `app/partner/bullseye/dashboard/page.tsx`
- Added red "+ New Appraisal" button in filter bar (next to Export CSV)
- `showSubmitModal` state toggles the modal
- On success: `setShowSubmitModal(false); fetchData()` — closes modal and refreshes pipeline

## Technical Decisions

- **No API changes needed** — `/api/appraise` already handles partner submissions (skips auth, injects sneaker prompt)
- **Duplicated compress/upload helpers** rather than extracting to shared module — keeps it simple, these are small functions
- **Default store selection** — pre-selects first store (Philadelphia) to reduce friction
- **Modal locked during submission** — backdrop click and Escape disabled while submitting to prevent accidental close

## Commits

- `e790e8d` feat: add Submit Appraisal modal to Bullseye dashboard

## Files Changed (2)

| File | Change |
|------|--------|
| `components/partner/dashboard/SubmitAppraisalModal.tsx` | **New** — Modal with image upload + store selector + submit |
| `app/partner/bullseye/dashboard/page.tsx` | **Modified** — Added button + modal state + render |

## Deployment

- Pushed to `main`, auto-deployed to Vercel
- Build: 59s, Status: Ready
- Production: https://realworth.ai (dashboard at bullseyesb.realworth.ai/dashboard)

## Next Session Should

1. Test the full flow end-to-end on the live dashboard
2. Consider adding the new appraisal to the pipeline optimistically (before refresh)
3. Accept offer → signup flow (still pending from Feb 17)
4. Share link branding (OG metadata for partner appraisals)
