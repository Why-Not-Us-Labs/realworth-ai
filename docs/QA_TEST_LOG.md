# RealWorth QA Test Log

Tracking all QA tests with use cases, workflows, and outcomes.

---

## Test #001: eBay Hybrid Valuation Engine Integration
**Date:** 2026-01-17

### Hypothesis
Appraisals now use real eBay sold data to provide more accurate market-based valuations instead of relying solely on Gemini AI estimates.

### Steps
1. User navigates to http://192.168.5.236:3001 on phone
2. User logs into Pro account
3. User clicks "New Appraisal" button
4. User uploads photo of collectible item (coin, book, etc.)
5. User submits appraisal
6. System processes with Gemini + eBay API
7. User receives appraisal result

### Desired Outcome
- Console shows `[Appraise API] Searching eBay for: "..."`
- Console shows `[Appraise API] eBay data found: X results, avg $Y`
- Console shows `[Appraise API] Updated prices: $X-$Y (was $A-$B)`
- Appraisal returns with price range based on real eBay sold listings
- Response includes `valuationBreakdown`, `ebayComparables`, `futureValuePredictions`
- If <5 eBay results, falls back to Gemini estimate gracefully

### Actual Outcome
- Appraisal completed successfully: **1958 Egypt 10 Milliemes (Sphinx)**, $1-$4, 60% confidence
- **Issue**: Appraisal went through **production** (realworth.ai) instead of local dev server
- Server logs show only `GET /` requests, no `POST /api/appraise`
- eBay reference appears in Sources (from Gemini, not our new API integration)
- Validation correctly flagged "Potential Undervaluation" for vintage coin near face value

### Next Steps
1. Re-test with appraisal submitted via local URL: `http://192.168.5.236:3001`
2. Ensure phone browser is pointed at local IP, not production
3. Watch for console logs: `[Appraise API] Searching eBay for: "..."`

---

## Test #002: Local OAuth Authentication via ngrok
**Date:** 2026-01-18

### Hypothesis
Enable local testing with Google OAuth by using ngrok tunnel instead of raw IP address (Google OAuth rejects raw IPs).

### Steps
1. Install ngrok: `brew install ngrok`
2. Configure authtoken: `ngrok config add-authtoken <token>`
3. Start tunnel: `ngrok http 3001 --domain=<static-domain>`
4. Add ngrok URL to Google OAuth console (origins + redirect URIs)
5. Add ngrok URL to Supabase redirect URLs
6. Test sign-in flow on mobile phone

### Desired Outcome
- User can sign in with Google on local dev server via ngrok URL
- Session persists and user is authenticated
- No interference with production OAuth settings

### Actual Outcome
- **Safari**: OAuth flow completed but session didn't persist (cache/cookie issue)
- **Chrome**: OAuth flow completed successfully, user signed in!
- ngrok URL: `https://unadmirable-anjanette-hypertragic.ngrok-free.dev`
- Created `/auth/callback` page to handle OAuth tokens from hash fragments

### Technical Notes
- Google OAuth requires public domain (raw IPs like `192.168.x.x` rejected)
- Safari aggressive caching caused OAuth redirect to wrong origin
- Chrome Incognito/fresh browser resolved the issue
- Supabase uses implicit grant flow (tokens in URL hash `#access_token=`)

### Conclusion
**PASSED** - Local OAuth testing working via ngrok + Chrome. Safari cache issues can be avoided by using Chrome or clearing Safari data.

---

## Test #003: eBay Hybrid Valuation Engine
**Date:** 2026-01-18

### Hypothesis
Appraisals now use real eBay sold data to provide more accurate market-based valuations.

### Steps
1. Navigate to ngrok URL in Chrome on phone
2. Sign in with Google (confirmed working in Test #002)
3. Click "New Appraisal" button
4. Upload photo of collectible item (1948 Irish Penny with verdigris damage)
5. Submit appraisal
6. Check server logs for eBay API activity

### Desired Outcome
- Console shows `[Appraise API] Searching eBay for: "..."`
- Console shows `[Appraise API] eBay data found: X results, avg $Y`
- Appraisal returns with price range based on real eBay sold listings

### Actual Outcome
**eBay API Called Successfully!**

Server logs show:
```
[Appraise API] Searching eBay for: "1948 Irish 1 Pingin (Penny) Percy Metcalfe..."
eBay API: Found 0 results for "..." (avg: $0.00)
[Appraise API] Insufficient eBay data (0 results) - using Gemini estimate
```

**Appraisal Result:**
- **Item**: 1948 Irish 1 Pingin (Penny) by Percy Metcalfe
- **Estimated Value**: $1 - $4
- **Condition**: Good (Details) - Environmental Damage (verdigris/bronze disease)
- **Sources shown**: Numista, NGC World Coin Price Guide, eBay Sold Listings

**Manual Verification (user's eBay search):**
- eBay sold listings: $1.32 - $15.99 for similar coins
- NGC/Numista references confirm coin specs
- Our $1-$4 estimate is accurate for damaged condition!

### Technical Issue Found
Search keywords were too specific:
- **Before**: `"1948 Irish 1 Pingin (Penny) Percy Metcalfe (Designer) None (Minted at the Royal Mint, London) Good (Details) - Environmental Damage"`
- **After fix**: `"1948 Irish 1 Pingin"` (simplified)

### Fix Applied
Updated `buildSearchKeywords()` in `services/ebayPriceService.ts`:
- For coins: Extract year + country/denomination only
- Remove parenthetical notes, grades, and long descriptions
- Limit to 80 characters max

### Conclusion
**PARTIAL PASS** - eBay API integration working correctly:
1. API is called during appraisal ✓
2. Graceful fallback to Gemini when no results ✓
3. Appraisal accuracy validated against manual eBay search ✓
4. Search keyword optimization applied to improve future results ✓

### Next Steps
Test another appraisal to verify improved keyword search returns eBay results

---

## Test #004: Mobile Header Redesign - Sticky + Dropdown + Icons
**Date:** 2026-01-18

### Hypothesis
Mobile header should be sticky, have a profile dropdown with sign-out, and use SVG icons instead of emojis.

### Steps
1. Open app on mobile device
2. Sign in with Google
3. Scroll down the page
4. Tap on avatar/name area in header
5. Verify dropdown appears with "My Profile" and "Sign Out"
6. Tap outside dropdown to close
7. Verify stats icons are SVGs (flame, gem, users) not emojis

### Desired Outcome
- Header sticks to top on scroll with blur effect
- Tapping avatar opens dropdown menu
- Dropdown has "My Profile" link and red "Sign Out" button
- Clicking outside closes dropdown
- Stats use SVG icons: FlameIcon (orange), GemIcon (teal), UsersIcon (blue)

### Actual Outcome
**PASSED** - All features working as expected:
- Sticky header with glassmorphism effect (bg-white/95 backdrop-blur-lg)
- Dropdown menu appears on avatar tap
- "My Profile" navigates to /profile
- "Sign Out" logs user out successfully
- SVG icons render correctly in stats row
- Click outside closes menu

### Conclusion
**PASSED** - Mobile header redesign complete and functional.

---

## Template

```markdown
## Test #XXX: [Test Name]
**Date:** YYYY-MM-DD

### Hypothesis
[1-2 sentence description of what we're testing]

### Steps
1. [Step 1]
2. [Step 2]
3. [etc.]

### Desired Outcome
[Expected behavior - concise but complete]

### Actual Outcome
[What actually happened - match or bug/issue description]

### Next Steps
[Follow-up actions or "None" if passed]
```
