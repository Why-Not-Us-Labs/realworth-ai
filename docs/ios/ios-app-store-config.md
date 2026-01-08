# App Store Connect: RealWorth.ai iOS App Configuration

**To:** Claude Code
**From:** Manus AI (on behalf of Gavin McNamara)
**Date:** January 7, 2026
**Subject:** Configuration details for the new RealWorth.ai iOS app.

**RealWorth.ai is a product of Why Not Us Labs LLC.**

---

This document outlines the initial setup parameters used to create the app listing in App Store Connect. Please use these exact identifiers in your Xcode project configuration to ensure the build can be correctly uploaded and associated with this app listing.

## App Details

| Field | Value Selected |
|---|---|
| **Platforms** | `iOS` |
| **Name** | `RealWorth.ai` |
| **Primary Language** | `English (U.S.)` |
| **Bundle ID** | `RealWorth - ai.realworth.app` |
| **SKU** | `realworth-ios-001` |
| **User Access** | `Full Access` |

## Key Technical Points

*   **Bundle Identifier:** The Xcode project's Bundle ID **must** be set to `ai.realworth.app`.
*   **Target Platform:** The primary target is iOS. No other platforms (macOS, tvOS) were selected.

This setup is the foundational record for the app in App Store Connect. All subsequent builds and metadata will be associated with these identifiers.


---

## App Store Listing Content

The following content is for the App Store Connect listing. This is what users will see when they find the app.

### Promotional Text (170 characters max)
*This can be updated anytime without a new app review.*

```
Snap a photo. Get an instant AI estimate. Chat to learn why. Turn your clutter into treasure with the smartest appraiser in your pocket.
```

### Description (4000 characters max)

```
RealWorth.ai is the AI-powered appraiser that instantly identifies and estimates the value of your items. Whether you're cleaning out your parents' house, hunting for treasures at estate sales, or just curious about that old thing in your attic, RealWorth gives you answers in seconds.

IMPORTANT: Our AI provides estimates for informational purposes only. For certified appraisals for insurance, legal, or sale purposes, please consult a professional appraiser.

HOW IT WORKS
Simply snap a photo of any item. Our advanced AI analyzes it instantly and provides:

• Identification: What is it? Learn the name, origin, and history.
• Estimated Value: Get an AI-generated market value estimate.
• Rationale: Understand the factors that influence value.
• Conversation: Have questions? Chat with the AI for deeper insights.

We continuously train and update our models to provide the most consistent and fair estimates based on available market data.

FEATURES THAT SET US APART

🔍 Conversational AI Appraiser
Unlike other apps that just give you a number, RealWorth lets you have a real conversation. Ask follow-up questions like "Would this be worth more if it was in better condition?" or "Where could I sell this?"

📸 Your Treasure Collection
Save all your appraised items in one place. Build your personal inventory, track estimated values, and share your finds with friends.

🏆 Discover & Compete
Explore what others are finding on our Discover feed. See interesting treasures. Climb the leaderboard. Join a community of treasure hunters.

🛒 Marketplace (Coming Soon)
Buy and sell items directly within the app. Connect with local buyers and sellers.

🛡️ Insurance Ready (Coming Soon)
Export your collection to share with insurance professionals.

WHO IS REALWORTH FOR?

• Estate Sale Shoppers: Get quick estimates before you buy.
• Collectors: Catalog and track your collection.
• Resellers & Flippers: Source smarter with AI insights.
• Declutterers: Decide what to keep, sell, or donate.
• The Curious: Finally get an idea of what that thing might be worth!

PLEASE NOTE
RealWorth.ai provides AI-generated estimates for informational and entertainment purposes. Actual market value may vary. For accurate valuations for insurance, estate planning, or sales, we recommend consulting a certified professional appraiser.

SUBSCRIPTION
RealWorth PRO unlocks unlimited appraisals, full AI chat access, and all premium features.

Download now and start discovering the potential value all around you.
```

### Keywords (100 characters max, comma-separated)
*These help with App Store search ranking.*

```
antique,appraisal,value,identify,AI,collector,estate sale,vintage,worth,price
```

### Support URL
```
https://realworth.ai/support
```

### Marketing URL
```
https://realworth.ai
```

### Privacy Policy URL
```
https://realworth.ai/privacy
```

---

## Screenshot Requirements

You'll need screenshots for the App Store listing. Here are the required sizes:

| Device | Size (pixels) | Required |
|--------|---------------|----------|
| iPhone 6.7" (iPhone 15 Pro Max) | 1290 × 2796 | Yes |
| iPhone 6.5" (iPhone 11 Pro Max) | 1242 × 2688 or 1284 × 2778 | Yes |
| iPhone 5.5" (iPhone 8 Plus) | 1242 × 2208 | Optional |
| iPad Pro 12.9" | 2048 × 2732 | If supporting iPad |

**Recommended Screenshots (in order):**
1. Hero shot: "Snap a photo, get an instant estimate"
2. AI Chat: Show the conversational feature
3. Collection/Treasures view
4. Discover feed with community finds
5. Leaderboard/gamification

---

## App Icon

The app icon must be:
- **Size:** 1024 × 1024 pixels
- **Format:** PNG (no transparency, no rounded corners - Apple adds those)
- **No text or words** in the icon (Apple guideline)

---

## Category Selection

**Primary Category:** `Utilities` or `Lifestyle`
**Secondary Category:** `Shopping` or `Reference`

---

## Age Rating

When filling out the age rating questionnaire, RealWorth.ai should qualify for:
- **4+** (No objectionable content)

---

## Legal Pages to Implement

The following pages need to be created on realworth.ai:

| Page | URL | Content File |
|------|-----|--------------|
| Privacy Policy | /privacy | privacy-policy-content.md |
| Terms of Service | /terms | terms-of-service-content.md |
| Support | /support | support-page-content.md |

**Contact Email:** support@whynotus.ai

---

## In-App Requirements

1. **Privacy Policy Link:** Add a link to the Privacy Policy in Settings
2. **Terms of Service Link:** Show during signup or in Settings
3. **Account Deletion:** Users must be able to delete their account from within the app (Apple requirement)
4. **Disclaimer:** Consider showing a brief disclaimer when users first use the appraisal feature

---

## What You Can Skip For Now

These sections can be completed later or are optional:
- App Previews (videos) - nice to have but not required
- iPad screenshots - if you're iPhone-only for now
- Apple Watch - not applicable
- In-App Events - for later marketing campaigns
- Custom Product Pages - advanced feature for later

---

## Next Steps

1. **Screenshots:** Once the app is built, take screenshots on a simulator or device
2. **App Icon:** Ensure the 1024x1024 icon is ready
3. **Privacy Policy:** Verify https://realworth.ai/privacy exists
4. **Build Upload:** Use Xcode to upload the first build
5. **Submit for Review:** Once all fields are complete

---

**Why Not Us Labs LLC**
RealWorth.ai is a product of Why Not Us Labs LLC.

*Document prepared for handoff to Claude Code and for App Store Connect submission.*
