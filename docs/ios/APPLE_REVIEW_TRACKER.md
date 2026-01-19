# Apple App Store Review Tracker

**App**: RealWorth.ai
**Bundle ID**: `ai.realworth.app`
**Last Review**: January 19, 2026
**Review Device**: iPad Air 11-inch (M3)
**Version Reviewed**: 1.0
**Submission ID**: `3569b3b8-5e92-40cf-a6d5-4b0a92c6a22e`

---

## Current Status: REJECTED (2 Issues) - Review #2

| # | Guideline | Issue | Status | Priority |
|---|-----------|-------|--------|----------|
| 1 | 2.1 | In-app purchases not submitted for review | **OPEN** | CRITICAL |
| 2 | 3.1.2 | Terms of Use (EULA) link missing from App Store metadata | **OPEN** | CRITICAL |

### RESOLVED from Previous Review
- ~~2.3.3 - iPad screenshots~~ (not mentioned = resolved)
- ~~5.1.1(v) - Account deletion~~ (not mentioned = resolved)

---

## Issue 1: Guideline 2.3.3 - Accurate Metadata (Screenshots)

### Apple's Feedback
> The 13-inch iPad screenshots show an iPhone image that has been modified or stretched to appear to be an iPad image. Screenshots should highlight the app's core concept to help users understand the app's functionality and value.

### Requirements
- Screenshots must accurately reflect the app on each supported device
- iPad screenshots must show actual iPad UI, not stretched iPhone images
- Marketing materials that don't reflect actual UI are not allowed
- Screenshots should highlight main features (not just splash/login screens)

### Resolution Steps
- [ ] Take new screenshots on actual iPad device or simulator
- [ ] Ensure iPad screenshots show iPad-native layout (if app supports iPad)
- [ ] OR remove iPad from supported devices if app is iPhone-only
- [ ] Upload corrected screenshots to App Store Connect > Media Manager

### Notes
- Access via: App Store Connect > Your App > Prepare for Submission > "View All Sizes in Media Manager"
- Required iPad sizes: 12.9" (2048 x 2732) and/or 11" (1668 x 2388)

---

## Issue 1: Guideline 2.1 - App Completeness (In-App Purchases) - STILL OPEN

### Apple's Feedback (Jan 19, 2026)
> We are unable to complete the review of the app because one or more of the in-app purchase products have not been submitted for review. Specifically, the app includes references to **Pro** but the associated in-app purchase products have not been submitted for review.

### Root Cause Analysis (Jan 19, 2026)

**Why the "In-App Purchases and Subscriptions" section is missing from version page:**
The section **only appears when subscriptions have "Ready to Submit" status**. Currently both subscriptions show "Missing Metadata" status.

**Why subscriptions show "Missing Metadata":**
Based on research from [Apple Developer Forums](https://developer.apple.com/forums/thread/770089) and [RevenueCat Community](https://community.revenuecat.com/sdks-51/app-store-missing-metadata-but-can-t-figure-out-what-6981):

> **#1 Cause: Missing Subscription GROUP Localization**
>
> The subscription GROUP (not individual subscriptions) requires at least one localization. Without this, ALL subscriptions in the group remain "Missing Metadata" regardless of how complete they individually are.

### Requirements
- All IAP products referenced in app must be submitted for review
- Each IAP needs a review screenshot in App Store Connect
- IAP products must be in "Ready to Submit" state
- **Subscription GROUP must have localization** (most commonly missed!)

### Resolution Steps

#### Step 1: Add Subscription GROUP Localization (CRITICAL)
- [ ] Go to App Store Connect → Subscriptions
- [ ] Click on "RealWorth Pro" subscription GROUP (not individual subscriptions)
- [ ] Find "Subscription Group Localization" or "Localizations" section
- [ ] Click "Add Localization" or "+" button
- [ ] Select "English (U.S.)"
- [ ] Fill in:
  - **Subscription Group Display Name**: "RealWorth Pro"
  - **App Name if Different**: Leave blank
- [ ] Save changes

#### Step 2: Verify Individual Subscriptions
- [ ] `ai.realworth.pro.monthly` has localization (Display Name + Description)
- [ ] `ai.realworth.pro.annual` has localization (Display Name + Description)

#### Step 3: Verify Review Screenshots
- [ ] Monthly subscription has review screenshot (proper iOS dimensions)
- [ ] Annual subscription has review screenshot (proper iOS dimensions)

#### Step 4: Verify Agreements
- [ ] Go to App Store Connect → Business → Agreements, Tax, and Banking
- [ ] Paid Applications Agreement is ACTIVE
- [ ] Tax Forms completed
- [ ] Banking Info verified

#### Step 5: Confirm Status Change
- [ ] Refresh App Store Connect
- [ ] Both subscriptions now show "Ready to Submit" (not "Missing Metadata")

#### Step 6: Select IAPs for Submission
- [ ] Go to App Store → iOS App → Version 1.0
- [ ] "In-App Purchases and Subscriptions" section should now appear
- [ ] Select both subscriptions to include with submission

### Common Mistake
When submitting the app, you must **explicitly select** the IAP products to include in the submission. But the selection option ONLY appears if subscriptions have "Ready to Submit" status.

### Resources
- [Apple Developer Forums - Missing Metadata Fix](https://developer.apple.com/forums/thread/770089)
- [Apple Developer Forums - IAP Section Missing](https://developer.apple.com/forums/thread/804327)
- [RevenueCat - App Store Connect IAP Guide](https://www.revenuecat.com/blog/engineering/app-store-connect-in-app-purchase-guide/)

---

## Issue 2: Guideline 3.1.2 - Subscriptions (Terms of Use/EULA) - NEW

### Apple's Feedback (Jan 19, 2026)
> The submission did not include all the required information for apps offering auto-renewable subscriptions.
> The following information needs to be included in the App Store metadata:
> - A functional link to the Terms of Use (EULA). If you are using the standard Apple Terms of Use (EULA), include a link to the Terms of Use in the App Description. If you are using a custom EULA, add it in App Store Connect.

### Requirements for Auto-Renewable Subscriptions

**In the App itself:**
- [x] Title of subscription
- [x] Length of subscription
- [x] Price of subscription
- [x] Link to Privacy Policy (in Footer)
- [x] Link to Terms of Use (in Footer at /terms)

**In App Store Connect Metadata:**
- [x] Privacy Policy URL field (already set to https://realworth.ai/privacy)
- [ ] **Terms of Use (EULA)** - MISSING - must add one of:
  - Option A: Add link to https://realworth.ai/terms in App Description
  - Option B: Add custom EULA in App Store Connect EULA field
  - Option C: Use Apple's Standard EULA and mention it in description

### Resolution Steps
- [ ] Go to App Store Connect > Your App > App Information
- [ ] Find the "License Agreement" or "EULA" section
- [ ] Either:
  - **Option A (Recommended)**: Add to App Description: "Terms of Use: https://realworth.ai/terms"
  - **Option B**: Upload custom EULA (use content from /terms page)
  - **Option C**: Select "Use Apple Standard License Agreement" and add note in description

### Suggested App Description Addition
Add this line at the end of your App Store description:
```
Terms of Use: https://realworth.ai/terms
Privacy Policy: https://realworth.ai/privacy
```

---

## Issue 3: Guideline 5.1.1(v) - Account Deletion (RESOLVED)

### Apple's Feedback
> The app supports account creation but does not include an option to initiate account deletion. Apps that support account creation must also offer account deletion to give users more control of the data they've shared while using an app.

### Requirements
- Apps with account creation MUST offer account deletion
- Temporary deactivation is NOT sufficient - must be full deletion
- If website required, must link directly to deletion page
- Confirmation steps allowed, but can't require phone/email support (unless highly-regulated)

### Current Implementation (COMPLETE)
- [x] "Delete Account" in Settings (Profile → gear icon → Danger Zone)
- [x] Confirmation dialog requires typing "DELETE"
- [x] API deletes all user data:
  - [x] Cancels Stripe subscription if active
  - [x] Deletes Stripe customer record
  - [x] Deletes all images from Storage
  - [x] Deletes auth user (cascades to `users`, `appraisals`, `friendships`)
- [x] Signs user out after deletion
- [x] Redirects to home page

### Implementation Files
- **Modal**: `components/DeleteAccountModal.tsx`
- **Settings UI**: `components/SettingsModal.tsx` (line 85-93)
- **API**: `app/api/account/delete/route.ts`
- **Profile Page**: `app/profile/page.tsx` (gear icon triggers flow)

### Response to Apple
Reply via App Store Connect Resolution Center:
> Account deletion is available in the app. Users can access it via:
> 1. Go to Profile tab (bottom navigation)
> 2. Tap the gear icon (Settings) in the top-right corner
> 3. Scroll to "Danger Zone" section
> 4. Tap "Delete Account"
> 5. Type "DELETE" to confirm permanent deletion
>
> This completely removes the user's account, all appraisals, collections, images, and subscription data.

### Notes
- Reviewer may have tested on iPad (per review device noted)
- Consider making Settings more prominent if reviewer couldn't find it
- May want to add "Delete Account" link to Footer as backup accessibility

---

## Pre-Submission Checklist

Before next submission, verify ALL of the following:

### Screenshots & Media
- [ ] iPhone 6.7" screenshots (1290 x 2796) - actual iPhone UI
- [ ] iPhone 6.5" screenshots (1242 x 2688) - actual iPhone UI
- [ ] iPad 12.9" screenshots (2048 x 2732) - actual iPad UI OR remove iPad support
- [ ] App icon 1024x1024 PNG uploaded

### In-App Purchases
- [ ] Monthly subscription has review screenshot
- [ ] Annual subscription has review screenshot
- [ ] Both IAPs in "Ready to Submit" status
- [ ] IAPs submitted WITH app binary

### Account & Privacy
- [x] Account deletion works from within the app (Profile → Settings → Delete Account)
- [ ] Privacy Policy accessible in-app (**Currently in Footer only, not Settings**)
- [ ] Terms of Service accessible in-app (**Currently in Footer only, not Settings**)
- [ ] App Privacy questionnaire completed in App Store Connect

### Legal Pages (Website)
- [x] https://realworth.ai/privacy is live (verified Jan 18, 2026)
- [x] https://realworth.ai/terms is live (verified Jan 18, 2026)
- [x] https://realworth.ai/support is live (verified Jan 18, 2026)

### Recommended Improvements
- [ ] Add Privacy Policy and Terms links to SettingsModal (Apple prefers Settings access)
- [ ] Consider making Delete Account more discoverable if reviewer missed it

---

## Review History

### Review #2 - January 19, 2026
- **Result**: REJECTED
- **Issues**: 2 (IAP not submitted, EULA link missing)
- **Device**: iPad Air 11-inch (M3)
- **Version**: 1.0
- **Progress**: Screenshots and Account Deletion issues RESOLVED

### Review #1 - January 15, 2026
- **Result**: REJECTED
- **Issues**: 3 (Screenshots, IAP, Account Deletion)
- **Device**: iPad Air 11-inch (M3)
- **Version**: 1.0

---

## Resources

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Screenshot Specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/)
- [Account Deletion FAQ](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [In-App Purchase Setup](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/)

---

**Last Updated**: January 19, 2026
