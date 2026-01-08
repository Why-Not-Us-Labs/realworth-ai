# Mobile App Development Setup Guide

## Phase 1: Apple Developer Account Setup & Verification

### 1.1 Verify Apple Developer Account Status
**Manual Steps Required:**
1. Log into [developer.apple.com](https://developer.apple.com)
2. Verify:
   - Account is active (paid $99/year)
   - Team ID is accessible (note this for later)
   - Certificates & Profiles section is accessible
   - App Store Connect access is enabled

**Deliverable**: Confirmed active account with Team ID noted

### 1.2 Set Up App Store Connect
**Manual Steps Required:**
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - Platform: iOS
   - Name: "RealWorth" (or "RealWorth.ai" if available)
   - Primary Language: English
   - Bundle ID: `ai.realworth.app` (or similar, must be unique - create in Certificates, Identifiers & Profiles if needed)
   - SKU: `realworth-ios-001`
   - User Access: Full Access

**Deliverable**: App created in App Store Connect with Bundle ID

### 1.3 Configure App Information
**Manual Steps Required:**
1. In App Store Connect, complete:
   - App description (4000 char max)
   - Keywords (100 char max)
   - Support URL: `https://realworth.ai`
   - Marketing URL (optional): `https://realworth.ai`
   - Privacy Policy URL: `https://realworth.ai/privacy`
   - Category: Utilities or Finance
   - Age rating questionnaire (complete honestly)

**Deliverable**: All metadata fields completed

**Note**: These steps must be completed manually before proceeding with iOS build configuration.

---

## Phase 2: Development Environment

### Quick Start
```bash
cd mobile
npm install
bundle install              # First time only - installs CocoaPods
bundle exec pod install     # Install iOS native dependencies
npm run ios                 # Build and run on simulator
```

### Full Rebuild (after native changes)
```bash
cd mobile
rm -rf ios/build
cd ios && bundle exec pod install && cd ..
npx react-native run-ios
```

---

## Phase 3: Apple Sign-In Configuration

### Supabase Dashboard Setup
1. Go to **Authentication > Providers > Apple**
2. Add **both** identifiers to "Client IDs (for native app)":
   - `ai.realworth.app` (iOS Bundle ID - for native app)
   - `ai.realworth.app.web` (Service ID - for web OAuth)
3. Add the generated client secret for web OAuth flow

### iOS Project Configuration
- `ios/RealWorthApp/RealWorthApp.entitlements` - Sign In with Apple capability
- `ios/RealWorthApp/Info.plist` - URL schemes for OAuth callbacks

---

## Debugging Learnings

### The Nonce Problem (Critical)

**Error**: `"Passed nonce and nonce in id_token should either both exist or not"`

**Root Cause**: Native iOS Apple Sign-In **always** embeds a nonce hash in the identity token. Unlike web OAuth (where Supabase SDK handles this automatically), native `signInWithIdToken()` requires manual nonce handling.

**The Working Solution**:
```typescript
// 1. Generate a raw nonce
const rawNonce = generateNonce();

// 2. Pass RAW nonce to Apple (iOS hashes it internally)
const appleAuthResponse = await appleAuth.performRequest({
  requestedOperation: appleAuth.Operation.LOGIN,
  requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
  nonce: rawNonce,  // iOS will SHA256 hash this before embedding in token
});

// 3. Pass RAW nonce to Supabase (they hash and compare)
await supabase.auth.signInWithIdToken({
  provider: 'apple',
  token: appleAuthResponse.identityToken,
  nonce: rawNonce,  // Supabase hashes this to verify against token
});
```

**Key Insight**: iOS hashes the nonce internally before embedding in the token. Pass the **same raw nonce** to both Apple and Supabase. Do NOT pre-hash it yourself (causes "Nonces mismatch" error from double-hashing).

### Web vs Mobile Auth Comparison

| Platform | Method | Nonce Handling |
|----------|--------|----------------|
| Web | `signInWithOAuth()` | Automatic (SDK handles everything) |
| Mobile | `signInWithIdToken()` | Manual (must generate and pass nonce) |

This explains why identical Supabase config works for web but fails for mobile without proper nonce handling.

### Debugging Workflow

1. **Always check Supabase Auth logs first**:
   - Dashboard > Authentication > Logs
   - Filter by email to find exact error messages
   - Key fields: `status_code`, `error_code`, full error message

2. **Common errors and their causes**:
   | Error | Cause | Fix |
   |-------|-------|-----|
   | `"Unacceptable audience"` | Bundle ID not in Supabase | Add iOS Bundle ID to Apple provider Client IDs |
   | `"nonce should either both exist or not"` | Missing nonce | Add nonce generation and pass to signInWithIdToken |
   | `"Nonces mismatch"` | Double-hashed nonce | Pass RAW nonce (not pre-hashed) to Apple |

3. **Test on real device**: Simulator can show the Apple Sign-In sheet but can't complete biometric auth properly. Always test auth flows on a physical device.

### Architecture Decision: Custom Supabase Client

The mobile app uses a **custom lightweight Supabase client** (`src/services/supabase.ts`) instead of the official SDK because:
- Smaller bundle size
- Avoids React Native compatibility issues with official SDK
- Only need auth functionality (not realtime, storage, etc.)

This means we must manually implement features like nonce handling that the official SDK handles automatically.

---

## Common Issues

### Build fails after git pull
```bash
cd mobile/ios
rm -rf Pods build
bundle exec pod install
```

### Metro bundler cache issues
```bash
npx react-native start --reset-cache
```

### "Pod install" command not found
```bash
bundle install  # Installs CocoaPods via Bundler
bundle exec pod install  # Run pod through Bundler
```

---

## Testing Checklist

Before releasing:
- [ ] Apple Sign-In works on real device
- [ ] Session persists after app restart
- [ ] Sign out clears session properly
- [ ] App handles network errors gracefully
- [ ] Build succeeds with `npx react-native run-ios --configuration Release`
