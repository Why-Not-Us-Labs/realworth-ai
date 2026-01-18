# RealWorth.ai Development History

This document tracks significant features, fixes, and improvements made to the platform.

---

## January 18, 2026

### Instagram-Style Discovery Feed
**Commits:** `7380f50`

Replaced TikTok-style vertical snap scroll with Instagram-style card feed for the Discover page.

**New Components Created:**
- `components/InstagramFeed.tsx` - Main scrollable feed with infinite scroll
- `components/FeedPost.tsx` - Individual post card with user header, carousel, engagement
- `components/ImageCarousel.tsx` - Swipeable image gallery with dot pagination
- `components/PostHeader.tsx` - User avatar, name, timestamp header
- `components/HeartAnimation.tsx` - Double-tap like animation (CSS keyframes)
- `lib/formatters.ts` - Shared `formatCurrency()` and `timeAgo()` utilities

**New API Endpoint:**
- `GET /api/feed` - Returns public appraisals with user data, like/save state

**Features:**
- 4:5 aspect ratio images (Instagram standard)
- Horizontal swipe carousel with dot indicators
- Double-tap to like with heart animation
- Optimistic UI updates for likes/saves
- Efficient batch queries (no N+1)
- Integrated with existing `CommentSheet` component

**Components Modified:**
- `components/HomeFeed.tsx` - Now uses InstagramFeed
- `components/EngagementButtons.tsx` - Added `onLikeChange` callback

**Components Deleted:**
- `components/FullScreenFeed.tsx` - Replaced by InstagramFeed

---

### $1.99 Pay-Per-Appraisal
**Feature:** Low-barrier pay-as-you-go option for users who exceed free tier.

**Stripe Setup:**
- Created price `price_1Sr3C9CVhCc8z8wiP8xC3VCs` ($1.99 one-time)
- Product: RealWorth Pro (`prod_TTQ9nVd9uSkgvu`)

**Pricing Tiers:**
| Tier | Price | Appraisals |
|------|-------|------------|
| Free | $0 | 2/month |
| Pay-As-You-Go | $1.99 | 1 credit (success only) |
| Pro Monthly | $19.99/mo | Unlimited |
| Pro Annual | $149.99/yr | Unlimited |

**Files Modified:**
- `app/api/stripe/pay-per-appraisal/route.ts` - `APPRAISAL_PRICE_CENTS = 199`
- `app/api/appraise/route.ts` - Error message shows $1.99
- `components/UpgradeModal.tsx` - UI displays $1.99

**User Flow:**
1. User exhausts 2 free appraisals
2. Shown "Buy for $1.99" option in UpgradeModal
3. Stripe Elements payment form
4. On success: 1 credit added to `users.appraisal_credits`
5. Credit consumed only on successful appraisal (errors don't deduct)

**Database:**
- `users.appraisal_credits` - Balance field
- `appraisal_purchases` - Transaction history (idempotency)

---

### Remove AI Image Regeneration
**Reason:** User trust - regenerated images confused users when they didn't match their original photos.

**Previous Behavior:**
- Used `gemini-3-pro-image-preview` to regenerate uploaded images
- Prompt: "Regenerate this image exactly as it is, without any changes."
- Result: Stylized images with different backgrounds (not faithful copies)

**New Behavior:**
- Display the user's original uploaded image directly
- No AI image generation step
- Faster appraisals (removed extra API call)
- All original images preserved in `image_urls` array

**Files Modified:**
- `app/api/appraise/route.ts` - Removed regeneration, use `imageUrls[0]` directly

---

## January 2, 2026

### shadcn/ui Integration & Mobile Optimization
**Commits:** `c65c70c`, `48f2f07`, `3884539`, `f1efaa3`

Major UI/UX overhaul integrating shadcn/ui component library and comprehensive mobile optimizations.

**shadcn/ui Components Added:**
- `components/ui/button.tsx` - Button with variants (default, destructive, outline, secondary, ghost, link, premium)
- `components/ui/card.tsx` - Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- `components/ui/dialog.tsx` - Dialog components using Radix UI primitives
- `components/ui/sonner.tsx` - Toast notifications with theme support
- `components.json` - shadcn configuration (style: "new-york", icons: "lucide")

**Design System Updates:**
- `tailwind.config.ts` - CSS variable-based color system with HSL values
- `app/globals.css` - Added CSS custom properties (--background, --foreground, --primary, etc.)
- Added `cn()` utility function in `lib/utils.ts` for Tailwind class merging
- Installed dependencies: `@radix-ui/react-dialog`, `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `lucide-react`, `next-themes`, `sonner`, `tailwind-merge`, `tailwindcss-animate`

**Form Simplification:**
- **Combined Upload Buttons**: Merged "Take Photo" and "Upload" into single unified button
  - Shows both camera and upload icons with "Take Photo or Upload" text
  - On mobile, tapping lets users choose camera or photo library
  - Desktop still supports drag & drop
- **Removed Condition Selector**: AI now determines condition from photos automatically
  - Eliminated 5-button condition picker (Mint/Excellent/Good/Fair/Poor)
  - Updated `/api/appraise` to handle optional condition parameter
  - Simpler, cleaner form with just upload area and submit button

**Mobile Optimization Fixes:**
- Touch targets increased to 44-48px minimum throughout
- Fixed ResultCard content overflowing on mobile screens
- Added `min-w-0` to flex children to allow proper shrinking
- Added `result-card-content` class with proper word-wrap/overflow-wrap
- Added `overflow-wrap-anywhere` utility class
- Reduced font sizes on mobile for better fit
- Added `overflow-hidden` to main card container

**New Components:**
- `components/ErrorBoundary.tsx` - Production-ready error boundary using shadcn Card and Button
- `Toaster` component integrated in app layout for notifications

**Files Modified:**
- `components/AppraisalForm.tsx` - Uses shadcn Button, removed condition selector
- `components/FileUpload.tsx` - Combined upload buttons
- `components/ResultCard.tsx` - Mobile overflow fixes, proper text wrapping
- `components/UpgradeModal.tsx` - Uses shadcn Button for CTA
- `components/SignInModal.tsx` - Improved mobile accessibility
- `app/page.tsx` - Added overflow-hidden to card wrapper
- `app/layout.tsx` - Added ErrorBoundary and Toaster
- `app/globals.css` - CSS variables and utility classes
- `lib/types.ts` - Made condition optional in AppraisalRequest
- `app/api/appraise/route.ts` - Handle optional condition

**Mobile App Scaffolding:**
- Created `mobile/` directory with React Native/Expo project (not committed to main repo)
- Added `MOBILE_APP_SETUP.md` with Apple Developer Account setup instructions
- Mobile directory added to `.gitignore`

---

## December 7, 2025

### Duolingo-Style Gamification System
**Commits:** `7057412`

Transformed the appraisal experience into an engaging, game-like flow inspired by Duolingo.

**Features Added:**
- **Interactive Trivia Quiz** (`components/TriviaQuiz.tsx`, `lib/triviaQuestions.ts`)
  - 20+ questions across 7 categories (books, toys, tech, art, coins, fashion, general)
  - Point system: 5 pts (easy), 10 pts (medium), 15 pts (hard)
  - Instant feedback with green/red highlights and explanations
  - Auto-advances after 3 seconds

- **Celebration Screen** (`components/CelebrationScreen.tsx`)
  - Duolingo-style praise screen shown after appraisal completes
  - Dynamic messages based on item value tiers ($10k+, $5k+, $1k+, etc.)
  - Displays streak info with flame icon, trivia points with gem icon
  - Confetti animation for high-value items ($500+) or milestone streaks (7+ days)
  - "New Record!" badge when beating personal best streak

- **Streak Fix** (`app/api/appraise/route.ts`, `services/dbService.ts`)
  - Root cause: Streaks were being read but never updated
  - Added `updateUserStreak()` function with proper day calculation
  - API now returns `streakInfo` with: currentStreak, longestStreak, isNewDay, streakIncreased, streakBroken

- **Updated App Flow**
  - New view state: `LOADING` → `CELEBRATION` → `RESULT`
  - Trivia points tracked during loading, passed to celebration
  - Streak info from API displayed in celebration screen

---

### Friends & Social Features
**Commits:** `bdfb973`

Added comprehensive friend system with user search and friend request management.

**Features Added:**
- **User Search** (`services/dbService.ts`)
  - `searchUsers()` - Case-insensitive search by name or @username
  - `getSentRequests()` - Get outgoing pending friend requests
  - `cancelFriendRequest()` - Cancel sent requests

- **Friends Page** (`app/friends/page.tsx`)
  - Three-tab interface: Search, Requests, Friends
  - **Search Tab**: Debounced search (300ms), shows relationship status per user
  - **Requests Tab**: Incoming requests (accept/decline) + sent requests (cancel)
  - **Friends Tab**: View all friends with profile links and remove option

- **Navigation Update** (`components/BottomTabNav.tsx`)
  - Added Friends tab between Discover and Collections
  - Red badge shows pending incoming request count
  - Auto-refreshes count every 30 seconds

**Database Methods Used:**
- `sendFriendRequest()`, `respondToFriendRequest()`, `getFriendshipStatus()`
- `getPendingRequests()`, `getFriends()`, `removeFriend()`

---

## December 6, 2025

### Help Center & FAQ System
**Commits:** `8cddcaf`

- Added Help Center page with searchable FAQ
- Integrated chat widget for support questions

### User Survey System
**Commits:** `3735e6f`

- Added survey modal system for feature validation
- Triggers after certain appraisal counts
- Collects user feedback for product decisions

### Branding Update
**Commits:** `d2ecbce`

- Updated branding to "Why Not Us Labs"
- Added email notification infrastructure

### Internal Feedback System
**Commits:** `1cc6e0b`

- Added internal feedback collection (Linear ticket WNU-312)
- Feedback widget for quick user input

---

## Architecture Notes

### Key Patterns
- **View State Machine**: `HOME` | `FORM` | `LOADING` | `CELEBRATION` | `RESULT` | `SCAN`
- **Friendship States**: `none` → `pending` → `accepted`/`declined`
- **Gamification Flow**: Loading (trivia) → Celebration (praise) → Result (details)

### Tech Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (Auth, PostgreSQL, Storage)
- Google Gemini AI for appraisals
- Stripe for subscriptions
