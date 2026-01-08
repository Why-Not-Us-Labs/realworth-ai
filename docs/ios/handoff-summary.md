# RealWorth.ai Mobile App & Website - Handoff for Claude Code

**To:** Claude Code
**From:** Gavin McNamara (via Manus AI)
**Date:** January 7, 2026
**Subject:** Technical specifications and content for the RealWorth.ai iOS app and website legal pages.

---

This package contains all the necessary documents for the development and implementation of the RealWorth.ai mobile app and the required legal pages on the website.

## Ground Truth Documents

Please use the following Markdown files as the single source of truth for all technical specifications and content. They should be stored in the project repository for future reference.

### 1. `ios-app-store-config.md`

*   **Purpose:** This is the primary technical guide for the iOS app.
*   **Contains:**
    *   App Store Connect configuration (Bundle ID, SKU, etc.)
    *   App Store listing content (Promotional Text, Description, Keywords)
    *   App Icon and Screenshot specifications
    *   Category and Age Rating selections

### 2. `privacy-policy-content.md`

*   **Purpose:** The full text for the Privacy Policy.
*   **Action Required:** Create a new page on `realworth.ai` at the URL `/privacy` and populate it with this content.

### 3. `terms-of-service-content.md`

*   **Purpose:** The full text for the Terms of Service.
*   **Action Required:** Create a new page on `realworth.ai` at the URL `/terms` and populate it with this content.

### 4. `support-page-content.md`

*   **Purpose:** The full text for the Support/Help Center page.
*   **Action Required:** Create a new page on `realworth.ai` at the URL `/support` and populate it with this content.

---

## Key Implementation Tasks

### For the iOS App:

1.  **Xcode Project Setup:** Configure the project with the **Bundle ID `ai.realworth.app`** as specified in the handoff document.
2.  **In-App Legal Links:** Add links within the app's "Settings" or "About" screen to:
    *   Privacy Policy (`https://realworth.ai/privacy`)
    *   Terms of Service (`https://realworth.ai/terms`)
3.  **Account Deletion:** Implement a feature that allows users to delete their account **from within the app**. This is a strict Apple requirement.
4.  **Appraisal Disclaimer:** Consider adding a one-time, dismissible alert when a user performs their first appraisal, stating that the valuation is an estimate and not a certified appraisal.
5.  **Screenshots:** Provide Gavin with screenshots for all required device sizes (6.7", 6.5") once the UI is ready.

### For the Website (`realworth.ai`):

1.  **Create Legal Pages:** Build the three new pages (`/privacy`, `/terms`, `/support`) using the provided Markdown content.
2.  **Footer Links:** Add links to these new pages in the website's footer.
3.  **Email:** Ensure all support links and contact forms point to `support@whynotus.ai`.

---

This package should provide everything you need. Please let Gavin know if you have any questions.
