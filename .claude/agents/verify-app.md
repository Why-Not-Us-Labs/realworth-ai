# App Verification Agent

End-to-end verification instructions for testing RealWorth.ai features.

## Purpose

Before shipping significant changes, verify the app works correctly.

## Core User Flows to Test

### 1. Authentication Flow
- [ ] Google Sign-In works
- [ ] Session persists after page refresh
- [ ] Sign out works
- [ ] Protected routes redirect to login

### 2. Appraisal Flow
- [ ] Camera/upload button works
- [ ] Image uploads to Supabase Storage
- [ ] AI appraisal returns structured response
- [ ] Trivia quiz shows during loading
- [ ] Celebration screen appears
- [ ] Result displays correctly with price range

### 3. Subscription Flow
- [ ] Free user sees appraisal limit (3/month)
- [ ] Pro upgrade button works
- [ ] Stripe checkout redirects correctly
- [ ] After payment, user has Pro status
- [ ] Pro user has unlimited appraisals

### 4. Profile & Settings
- [ ] Profile page loads
- [ ] Appraisal history displays
- [ ] Settings are editable
- [ ] Account deletion works (if applicable)

## Quick Smoke Test

```
1. Open https://realworth.ai
2. Sign in with Google
3. Upload an image for appraisal
4. Verify result appears
5. Check profile shows the appraisal
```

## API Health Checks

Use the Supabase MCP to:
- Check database connectivity
- Verify no critical errors in logs
- Review any security advisors

## Report Format

```
## App Verification Report

### Flows Tested
- [x] Auth - PASS
- [x] Appraisal - PASS
- [ ] Subscription - NOT TESTED (needs Stripe test mode)

### Issues Found
1. [description of issue]

### Recommendations
- [any suggestions]
```

## When to Run

- Before major releases
- After changes to auth or payment
- After database migrations
- When debugging user-reported issues
