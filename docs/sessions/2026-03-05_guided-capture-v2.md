# Session: GuidedCapture v2 - Live Camera Overlay

**Date:** March 5, 2026
**Focus:** GuidedCapture v2 for Bullseye partner portal

## Summary

Shipped GuidedCapture v2 — the major upgrade from v1's native camera input to a live WebRTC camera viewfinder with SVG silhouette overlays, matching GOAT's UX pattern.

## What Changed

### `components/partner/GuidedCapture.tsx` (only file modified)

**1. Live Camera via WebRTC getUserMedia**
- Replaced `<input capture="environment">` shutter with live `<video>` stream from rear camera
- Frame capture via hidden `<canvas>` — `drawImage` + `toBlob` as JPEG (0.92 quality)
- iOS Safari compatible: `autoPlay`, `muted`, `playsInline` attributes
- Graceful fallback: if getUserMedia fails, shows "Camera not available" with native camera button
- Camera tracks stopped on unmount and on finish

**2. Large, Detailed SVG Silhouettes**
- All SVGs now use `width="100%" height="100%"` with `viewBox="0 0 300 300"` — fill the viewfinder
- Dashed white strokes (`strokeDasharray: "6 4"`) at 50% opacity overlay on live camera feed
- Detailed paths: realistic sneaker profiles, insole shapes, heel counters with pull tabs, stacked soles with tread lines, corner-bracket frame for issues
- Rendered as `pointer-events: none` overlay on top of video

**3. Free Thumbnail Navigation**
- `goToStep()` now accepts any step — no restriction to previously visited steps
- Users can jump to soles (step 6) first if that's how they have shoes set up

**4. UX Polish**
- White flash overlay (150ms) on shutter for camera feedback
- "Retake" button when viewing a captured photo
- Camera stream stopped on finish (battery savings)
- Loading spinner while camera initializes

## Commits
- `9571b6c` feat: GuidedCapture v2 — live camera overlay, better silhouettes, free nav

## Key Decisions
- WebRTC getUserMedia works on iOS Safari 11+ over HTTPS (Vercel provides this)
- Fallback to native camera input if getUserMedia fails (desktop without camera, permission denied)
- Always push after committing (user preference saved to memory)

## Next Session Should
1. **Test on iPhone** at bullseyesb.realworth.ai — verify camera permission, live overlay, silhouettes
2. If silhouettes need refinement after testing, iterate on SVG paths
3. Continue with batch upload feature or other Bullseye priorities
