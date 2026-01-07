# Monthly Limit Reset: How Free Users Get Appraisals Back

*Internal documentation explaining how the monthly appraisal limit works.*

---

## Overview

Free users get **2 appraisals per month**. This resets automatically - no cron job needed.

---

## The Trick: Distributed Reset

Instead of resetting all users at midnight on the 1st, each user's count resets **when they use the app in a new month**.

```
┌─────────────────────────────────────────────────────────────┐
│ User's data:                                                │
│                                                             │
│ monthly_appraisal_count: 2                                  │
│ appraisal_count_reset_at: 2026-01-15T10:30:00Z              │
│                                                             │
│ ↑ Last time count was updated                               │
└─────────────────────────────────────────────────────────────┘
```

---

## When User Tries to Appraise

```
┌─────────────────────────────────────────────────────────────┐
│ 1. API: Check if user can create appraisal                  │
│    subscriptionService.canCreateAppraisal(userId)           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. QUERY: Get user's current data                           │
│                                                             │
│    SELECT monthly_appraisal_count,                          │
│           appraisal_count_reset_at,                         │
│           subscription_tier,                                │
│           email                                             │
│    FROM users WHERE id = userId                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CHECK: Is it a new month?                                │
│                                                             │
│    const resetAt = new Date(appraisal_count_reset_at);      │
│    const now = new Date();                                  │
│                                                             │
│    const isNewMonth =                                       │
│      now.getMonth() !== resetAt.getMonth() ||               │
│      now.getFullYear() !== resetAt.getFullYear();           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4a. IF NEW MONTH: Reset count to 0                          │
│                                                             │
│    currentCount = 0;  // Fresh start!                       │
│    User can create appraisal                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 4b. IF SAME MONTH: Use existing count                       │
│                                                             │
│    currentCount = monthly_appraisal_count;                  │
│    Check if currentCount < FREE_APPRAISAL_LIMIT (2)         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. RETURN: Can they create?                                 │
│                                                             │
│    return {                                                 │
│      canCreate: currentCount < 2,                           │
│      remaining: Math.max(0, 2 - currentCount),              │
│      isPro: false,                                          │
│      currentCount                                           │
│    };                                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## After Appraisal Completes

```
┌─────────────────────────────────────────────────────────────┐
│ subscriptionService.incrementAppraisalCount(userId)         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. QUERY: Get current data (same as above)                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CHECK: New month? → Reset to 0 first                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. INCREMENT: Add 1 to count                                │
│                                                             │
│    newCount = currentCount + 1;                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. UPDATE: Save new count and timestamp                     │
│                                                             │
│    UPDATE users SET                                         │
│      monthly_appraisal_count = newCount,                    │
│      appraisal_count_reset_at = NOW()                       │
│    WHERE id = userId                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Visual Timeline

```
January 15: User signs up
├── Does appraisal #1 → count: 1, reset_at: Jan 15
├── Does appraisal #2 → count: 2, reset_at: Jan 15
└── Tries #3 → BLOCKED (limit reached)

February 1: New month begins
└── Nothing happens automatically (no cron!)

February 5: User opens app
└── Tries appraisal → System checks: Feb ≠ Jan
    → Resets count to 0
    → Does appraisal #1 → count: 1, reset_at: Feb 5
```

---

## Why This Design?

| Approach | Pros | Cons |
|----------|------|------|
| **Cron job at midnight** | Predictable | Needs infrastructure, time zones, failures |
| **Distributed reset** (ours) | Simple, serverless, no cron | Users reset at different times |

The distributed approach is simpler and works perfectly for serverless (Vercel).

---

## Bypasses

These users are **never limited**:

1. **Pro subscribers** (`subscription_tier = 'pro'` AND `subscription_status = 'active'`)
2. **Super admins** (hardcoded emails in subscriptionService)

```typescript
// Check order in canCreateAppraisal:
if (isSuperAdmin(email)) return unlimited;
if (isPro && isActive) return unlimited;
// else: check monthly count
```

---

## Database Fields

| Field | Type | Purpose |
|-------|------|---------|
| `monthly_appraisal_count` | integer | How many this month |
| `appraisal_count_reset_at` | timestamp | When count was last updated |

---

## Key Code Locations

```typescript
// lib/constants.ts
export const FREE_APPRAISAL_LIMIT = 2;

// services/subscriptionService.ts
canCreateAppraisal(userId)    // Check if allowed
incrementAppraisalCount(userId)  // After appraisal done

// app/api/appraise/route.ts (line ~250)
const { canCreate } = await subscriptionService.canCreateAppraisal(userId);
if (!canCreate) {
  return NextResponse.json({ error: 'Monthly limit reached' }, { status: 403 });
}
```

---

## Edge Cases

**Q: What if user creates 2 appraisals, then upgrades to Pro, then downgrades?**
A: Count persists. If they used 2 in January, downgraded in January, they're blocked until February.

**Q: What if the database update fails after appraisal?**
A: We log `CRITICAL` but the appraisal already happened. User might get a "free" one, but this is rare.

**Q: What about time zones?**
A: We use UTC consistently. "Month" is based on UTC month boundaries.

---

*Last updated: January 2026*
