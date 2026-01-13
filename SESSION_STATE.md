# RealWorth Session State

**Last Updated:** January 12, 2026
**Purpose:** Resume context after session breaks. Read this at the start of each session.

---

## Current Task: StoreKit IAP Integration

### Status: DEBUGGING BRIDGE CONNECTION - 90% Complete

Native plugin loads correctly but JS-to-native method calls aren't working. The native `load()` runs, but `getProducts()` never reaches native side.

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

## Current Issue: Bridge Method Calls (Jan 12, 2026)

### What's Working
- Native plugin compiles and loads: `[StoreKit Native] Plugin loaded and initializing...`
- Bridge is connected: `Bridge: Optional(<Capacitor.CapacitorBridge: 0x...>)`
- Plugin is registered: `Plugin ID: StoreKitPlugin`, `Plugin Name: StoreKit`
- MyViewController registers the plugin instance correctly

### What's NOT Working
- JS calls `StoreKit.getProducts()` but native `getProducts(_ call:)` is never invoked
- No `[StoreKit Native] getProducts called` log appears
- App times out and falls back to Stripe

### Key Changes Made
1. Changed `CAPPlugin` → `CAPInstancePlugin` (required for `registerPluginInstance`)
2. Removed `StoreKitPlugin.m` (not needed with CAPBridgedPlugin approach)
3. Created `MyViewController.swift` with `capacitorDidLoad()` override
4. Updated `Main.storyboard` to use `MyViewController`
5. Added `echo` test method for debugging bridge connectivity

### Next Steps to Debug
1. Check if the `echo` test method works (added logging, deployed to production)
2. Verify Capacitor 8 bridge resolution mechanism
3. Check if method signatures match what bridge expects
4. Consider adding CAP_PLUGIN macro back for method registration

### Key Files
- `ios/App/App/StoreKitPlugin.swift` - Native plugin (CAPInstancePlugin)
- `ios/App/App/MyViewController.swift` - Plugin registration
- `hooks/useStoreKit.ts` - JS hook (loads from production at realworth.ai)

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
