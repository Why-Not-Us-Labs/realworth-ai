# RealWorth Session State

**Last Updated:** January 12, 2026
**Purpose:** Resume context after session breaks. Read this at the start of each session.

---

## Current Task: StoreKit IAP Integration

### Status: READY FOR TESTING - 95% Complete

The native StoreKit 2 code is now compiled and included in the Xcode build. Ready to test on a physical device.

---

## What's Been Completed

### App Store Connect Setup
- [x] Paid Apps Agreement signed
- [x] W-9 Tax Form submitted (WHY NOT US LABS LLC, EIN: 39-2821335)
- [x] Bank Account added (Bank of America Business Checking)
- [x] All statuses showing **Active**

### Subscription Products Created
| Product ID | Type | Price | Status |
|------------|------|-------|--------|
| `ai.realworth.pro.monthly` | Auto-Renewable | $19.99/month | Ready (screenshots uploaded) |
| `ai.realworth.pro.annual` | Auto-Renewable | $149.99/year | Ready (screenshots uploaded) |

### Sandbox Test Accounts
| Email | Password | Purpose |
|-------|----------|---------|
| `rw-monthly-test1@test.com` | `ClutterToCash$2026!` | Monthly testing |
| `rw-annual-test1@test.com` | `ClutterToCash$2026!` | Annual testing |

### Code Written
- [x] `ios/App/App/StoreKitPlugin.swift` - Native StoreKit 2 implementation with logging
- [x] `ios/App/App/StoreKitPlugin.m` - Capacitor bridge registration
- [x] `hooks/useStoreKit.ts` - React hook for JS-side StoreKit calls
- [x] `components/UpgradeModal.tsx` - UI with StoreKit/Stripe fallback

---

## RESOLVED: Build Target Issue (Jan 12, 2026)

Files were added to Xcode project via `xcodeproj` Ruby gem. Commit: `16dc942`

## Next Step: Test on Physical Device

1. Open Xcode: `npx cap open ios`
2. Select your physical iPhone as destination
3. **Cmd+R** to build and run
4. Open UpgradeModal in the app
5. Check Xcode console for:
   ```
   [StoreKit Native] Plugin loaded and initializing...
   [StoreKit Native] getProducts called
   [StoreKit Native] Got 2 products from App Store
   ```

**Important**: StoreKit testing requires a physical device with Sandbox Apple ID signed in (Settings > App Store > Sandbox Account).

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `ios/App/App/StoreKitPlugin.swift` | Native StoreKit 2 API calls |
| `ios/App/App/StoreKitPlugin.m` | Capacitor plugin bridge |
| `hooks/useStoreKit.ts` | React hook wrapping native plugin |
| `components/UpgradeModal.tsx` | Upgrade UI with pricing |
| `app/api/apple/verify-purchase/route.ts` | Server-side receipt verification |
| `MOBILE_APP_SETUP.md` | App Store Connect reference |

---

## Architecture Overview

```
UpgradeModal.tsx (React UI)
       ↓
useStoreKit.ts (React Hook)
       ↓ Capacitor.registerPlugin('StoreKit')
StoreKitPlugin.swift (Native iOS)
       ↓ Product.products(for:)
Apple App Store
```

---

## If Native Logs Appear But Products Don't Load

1. Check App Store Connect subscription status (should be "Ready to Submit")
2. Wait up to 2 hours for App Store propagation
3. Verify device has Sandbox Apple ID signed in:
   - Settings → App Store → Sandbox Account
4. Try on a real device (simulator has limitations)

---

## Quick Commands

```bash
# Rebuild and sync Capacitor
npm run build && npx cap sync ios

# Open Xcode
npx cap open ios

# Check Xcode project structure
ls -la ios/App/App/
```

---

## Session Recovery Checklist

When resuming:
1. Read this file for context
2. Check if StoreKit files were added to Xcode (Build Phases → Compile Sources)
3. If not added, follow "The Fix" section above
4. Run clean build and check for `[StoreKit Native]` logs
5. If products don't load, check App Store Connect status
