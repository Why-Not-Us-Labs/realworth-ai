# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RealWorth.ai is an AI-powered appraisal platform that uses Google Gemini to analyze images of items (books, collectibles, antiques) and provide detailed valuations. Production site: https://realworth.ai

## Commands

```bash
npm run dev          # Start dev server on port 3001
npm run build        # Production build
npm run lint         # ESLint
git push origin main # Auto-deploys to Vercel
```

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **AI**: Google Gemini (`@google/genai`) - `gemini-3-pro-preview` for appraisals
- **Auth**: Supabase Auth (Google OAuth)
- **Database**: Supabase PostgreSQL with RLS
- **Storage**: Supabase Storage (appraisal-images bucket)
- **Payments**: Stripe (subscriptions, webhooks, customer portal)
- **Email**: Resend (transactional emails)
- **SMS**: Twilio (seller verification)
- **UI Components**: shadcn/ui (Button, Card, Dialog via Radix primitives)
- **Hosting**: Vercel (300s timeout for appraise, 60s for chat)

## Architecture

### Core Data Flow
1. User uploads images via `AppraisalForm.tsx` → images uploaded to Supabase Storage
2. API route `/api/appraise/route.ts` fetches images, sends to Gemini for structured JSON appraisal
3. Results stored in Supabase via `services/dbService.ts`
4. Auth state managed globally via `AuthContext.tsx` wrapping the app
5. Layout provider order: `AuthProvider` → `AppraisalProvider` → `ErrorBoundary` (in `app/layout.tsx`)

### View State Machine (`app/page.tsx`)
The main page uses a state machine for the appraisal flow:
```
HOME → FORM → LOADING (trivia quiz) → CELEBRATION → RESULT
```

### Partner Portal / White-Label
- `middleware.ts` handles subdomain routing: `bullseyesb.realworth.ai` → `/partner/bullseye/*`
- Partner pages at `app/partner/bullseye/` with separate layout (strips RealWorth branding)
- Partner-specific components in `components/partner/`

### Key Patterns

**Authentication Flow**:
- `AuthContext` (`components/contexts/AuthContext.tsx`) provides user state app-wide
- `AppraisalContext` (`components/contexts/AppraisalContext.tsx`) provides appraisal state
- `authService.ts` wraps Supabase Auth (signInWithGoogle, onAuthStateChange)
- API routes validate auth via `Authorization: Bearer <token>` header
- RLS policies enforce data isolation at database level

**Subscription System**:
- `subscriptionService.ts` manages Pro tier logic with Stripe integration
- Free tier: 2 appraisals/month (tracked in `users.monthly_appraisal_count`, constant `FREE_APPRAISAL_LIMIT` in `lib/constants.ts`)
- Pro tier: $19.99/mo or $149.99/yr (V2 prices with legacy $9.99 grandfathering)
- **Pay-per-appraisal**: $1.99 one-time for 1 credit (tracked in `users.appraisal_credits`)
- Free limit defined in `lib/constants.ts` as `FREE_APPRAISAL_LIMIT`
- Super admin emails bypass limits (hardcoded in subscriptionService)
- `useSubscription` hook provides subscription state to components
- Stripe webhooks (`/api/stripe/webhook`) handle subscription lifecycle

**Pay-Per-Appraisal System** (`/api/stripe/pay-per-appraisal`):
- POST: Creates PaymentIntent for $1.99, returns clientSecret for Stripe Elements
- PUT: Confirms payment, records in `appraisal_purchases`, adds credits to user
- Credits only consumed on successful appraisal (errors don't deduct)
- `subscriptionService.canCreateAppraisal()` checks both free count AND credits
- `subscriptionService.consumeCredit()` deducts credit after appraisal success

**Appraisal API** (`/api/appraise/route.ts`):
- Uses Gemini structured output with JSON schema for consistent responses
- Two-step process: (1) Gemini identification, (2) eBay price lookup
- **v2 Hybrid Valuation Engine**: Gemini identifies items, eBay API provides real sold prices
- Supports collection validation when `collectionId` provided
- Uses original uploaded images (no AI regeneration)
- Returns `valuationBreakdown`, `ebayComparables`, `futureValuePredictions` for transparency

**eBay Price Service** (`services/ebayPriceService.ts`):
- Integrates with eBay Average Selling Price API via RapidAPI
- 48-hour caching in `price_cache` table to minimize API costs
- Returns average, median, price range from real sold listings
- Falls back to Gemini estimates when insufficient eBay data (<5 results)

**Gamification System**:
- Streak tracking via `updateUserStreak()` in `dbService.ts`
- Trivia quiz (`TriviaQuiz.tsx`, `lib/triviaQuestions.ts`) shown during AI processing
- Celebration screen (`CelebrationScreen.tsx`) with confetti and value-based messages
- API returns `streakInfo` object with current/longest streak data

**Social/Friends System**:
- User search via `dbService.searchUsers()` (case-insensitive name/@username)
- Friends page (`app/friends/page.tsx`) with Search, Requests, and Friends tabs
- Bottom nav badge (`BottomTabNav.tsx`) shows pending request count with 30s polling
- Friendship states: `none` → `pending` → `accepted`/`declined`

**Feature Flags** (`services/featureFlagService.ts`, `hooks/useFeatureFlag.ts`):
- Database-driven feature flags with admin UI at `/admin`
- Supports: global toggle, pro-only, percentage rollout, specific user targeting
- Known flags: `ai_chat`, `insurance_certificates`, `dealer_network`, `one_click_selling`, `price_tracking`
- 1-minute client-side cache to reduce database queries
- Use `useFeatureFlag()` hook in components

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/appraise` | POST | Core appraisal (120s timeout) |
| `/api/appraise/[id]` | GET/PATCH | Get/update appraisal |
| `/api/chat` | POST | AI chat (Pro only, 60s timeout) |
| `/api/stripe/webhook` | POST | Stripe event handler |
| `/api/stripe/checkout` | POST | Create checkout session |
| `/api/stripe/portal` | POST | Customer portal redirect |
| `/api/stripe/cancel` | POST | Cancel subscription |
| `/api/stripe/pay-per-appraisal` | POST/PUT | Pay-per-appraisal ($1.99 credits) |
| `/api/treasure/[id]` | GET/PATCH | Public appraisal endpoint |
| `/api/queue/add` | POST | Add to batch queue |
| `/api/queue/status` | GET | Poll queue status |
| `/api/access-code` | POST | Validate pro access codes |
| `/api/feedback` | POST | Internal feedback submission |
| `/api/surveys/*` | GET/POST | Survey management |
| `/api/transactions` | GET/POST | List/create transactions |
| `/api/transactions/[id]` | GET/PATCH | View/update transaction |
| `/api/listings` | GET/POST | List/create marketplace listings |
| `/api/listings/[id]` | GET/PATCH/DELETE | Manage listing |
| `/api/events` | GET/POST | List/create local events |
| `/api/events/[id]` | GET/PATCH/DELETE | Manage event |
| `/api/seller/*` | Various | Seller onboarding (Stripe Connect, phone) |
| `/api/feed` | GET | Instagram-style discovery feed |
| `/api/feed/like` | POST | Toggle like on appraisal |
| `/api/feed/save` | POST | Toggle save/bookmark |
| `/api/feed/comment` | GET/POST/DELETE | Comments CRUD |
| `/api/feed/saved` | GET | User's saved/bookmarked items |
| `/api/feed/engagement` | GET | Engagement metrics |
| `/api/discover` | GET | Discovery/trending feed |
| `/api/leaderboard/weekly` | GET | Weekly leaderboard |
| `/api/friends` | Various | Friend requests and management |
| `/api/admin/flags` | Various | Feature flag management |
| `/api/apple/verify-purchase` | POST | StoreKit 2 IAP verification |
| `/api/apple/webhook` | POST | App Store Server notifications |
| `/api/notifications/register` | POST | Push notification registration |
| `/api/certificate/[id]` | GET | Insurance certificate generation |
| `/api/account/delete` | POST | Account deletion |
| `/api/appraise/can-create` | GET | Check if user can create appraisal |

### Services Layer (`services/`)
- `authService.ts` - Supabase Auth wrapper
- `dbService.ts` - Appraisals CRUD, user streaks, friend operations (largest service, ~1100 lines)
- `subscriptionService.ts` - Pro tier, usage limits, Stripe customer management, token balance
- `tokenService.ts` - Token/credit system (WNU Platform)
- `collectionService.ts` - Collection management with validation
- `chatService.ts` - AI chat history for Pro users
- `featureFlagService.ts` - Database-driven feature flag management
- `ebayPriceService.ts` - eBay API integration with 48-hour `price_cache` table
- `transactionService.ts` - Marketplace transactions with Stripe Connect
- `listingService.ts` - Marketplace listings management
- `eventService.ts` - Local events/garage sales
- `sellerService.ts` - Seller onboarding (Stripe Connect, Twilio SMS)
- `socialService.ts` - Social features (friends, follows)
- `notificationService.ts` - Push notifications
- `metalPriceService.ts` - Precious metal market prices
- `numismaticContextService.ts` - Coin/numismatic specialized data
- `buyOfferService.ts` - Buy offer calculations for partner portal

### Custom Hooks (`hooks/`)
- `useAppraisal.ts` - Appraisal submission and state
- `useSubscription.ts` - Subscription state with Supabase Realtime listener + polling fallback
- `useChat.ts` - AI chat functionality
- `useQueue.ts` - Batch processing queue state with polling
- `useScanQueue.tsx` - Scan mode queue management
- `useSeller.ts` - Seller onboarding flow
- `useStoreKit.ts` - Apple StoreKit 2 IAP integration
- `useSurvey.ts` - Feature validation survey management
- `useFeatureFlag.ts` - Feature flag state for components

### Database Schema

Main tables (see `supabase/schema.sql` and migrations):
- `users` - Extends auth.users with profile, subscription, streak, and credit fields
  - Has both `name`/`picture` AND `display_name`/`avatar_url` (synced via trigger)
- `rw_appraisals` - Appraisal results (**NOT `appraisals`** — always use `.from('rw_appraisals')`)
  - `input_images` (text[], NOT NULL) and `status` (text, NOT NULL default 'pending') required for INSERT
  - FK join syntax: use `rw_appraisals:appraisal_id` in Supabase select queries
- `subscriptions` - Subscription records (separate from users table)
- `token_balances` - Token/credit tracking (WNU Platform)
- `collections` - User collections with validation metadata
- `price_cache` - eBay price data with 48-hour TTL
- `friendships` - Friend requests (user_id, friend_id, status)
- `chat_messages` - Pro user AI chat history
- `likes`, `saves`, `comments` - Social engagement (comments support threading via parent_id)
- `listings`, `transactions` - Marketplace
- `events` - Local events/garage sales
- `feature_flags` - Database-driven flags
- `surveys` - Feature validation survey responses
- `appraisal_purchases` - Pay-per-appraisal transaction history

User profile auto-created via `handle_new_user()` trigger on auth signup.

## Environment Variables

Required in `.env.local`:
```bash
GEMINI_API_KEY="..."                      # Server-side only
NEXT_PUBLIC_SUPABASE_URL="..."            # Public
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."       # Public
SUPABASE_SERVICE_ROLE_KEY="..."           # Server-side only (bypasses RLS)
STRIPE_SECRET_KEY="..."                   # Server-side only
STRIPE_WEBHOOK_SECRET="..."               # For webhook verification
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="..."  # Public - for Stripe Elements
NEXT_PUBLIC_MAPBOX_TOKEN="..."            # Public - for map views
RAPIDAPI_KEY="..."                        # Server-side only - eBay Average Selling Price API
```

## MCP Integrations

**Stripe MCP** - Configured for this project. To verify:
```
List my Stripe products to confirm the Stripe MCP is connected.
```

**Supabase MCP** - Configured for database operations. To verify:
```
List my Supabase projects to confirm the Supabase MCP is connected.
```
Project ID: `ahwensdtjsvuqxbjgkgv`

## Design Conventions

- **Colors**: Teal (#14B8A6) primary, Navy (#1e293b) secondary
- **Icons**: Use SVG icons from `components/icons.tsx` (no emojis in code)
- **Import paths**: Use `@/` alias (e.g., `@/lib/types`)
- **TypeScript**: Strict mode, all files must pass type checks

## Important Notes

- API route timeouts configured in `vercel.json`: 300s for `/api/appraise`, 60s for `/api/chat` - requires Vercel Pro
- Supabase client in `lib/supabase.ts` is for client-side; API routes create authenticated clients with user tokens
- `getSupabaseAdmin()` returns a service-role client that bypasses RLS - use only in API routes/webhooks
- **All API routes** that read user data must use `getSupabaseAdmin()` (anon client has no auth context in API routes, RLS blocks everything)
- Free tier limit of 2 appraisals/month enforced via `FREE_APPRAISAL_LIMIT` constant in `lib/constants.ts`
- Super admin emails are hardcoded in `subscriptionService.ts` and bypass all limits
- Admin dashboard at `/admin` requires super admin authentication; manages feature flags
- See `LESSONS_LEARNED.md` for detailed debugging history (Stripe webhooks, env var issues, RLS gotchas)

## Project Management

### Linear Integration
- Team ID: `29ce6072-3771-4391-9ef6-4f2ccaf88acb`
- Project: RealWorth.ai (`1bbc9e45-98dd-4bc6-9526-f3a7c435db8d`)
- Assignee (Gavin): `ab6f874f-1af3-4a8a-8d1a-71ae542bf019`
- See `HISTORY.md` for development changelog

## Mobile App

The project has two mobile approaches:
1. **Capacitor** (primary) - `capacitor.config.ts` at root, wraps the Next.js web app for iOS
2. **React Native** - Located in `mobile/`, separate native app for iOS/Android

**Commands** (run from `mobile/` directory):
```bash
npm start              # Start Metro bundler
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
bundle install         # First-time Ruby/CocoaPods setup
bundle exec pod install  # Install iOS dependencies
```

**Setup**: See `MOBILE_APP_SETUP.md` for Apple Developer Account and App Store Connect configuration.

## Development Workflow

**Always verify changes:**
```sh
# 1. Build (includes TypeScript check)
npm run build

# 2. Lint before committing
npm run lint

# 3. Push deploys automatically to Vercel
git push origin main
```

**After making significant changes, run build to verify.**

## Slash Commands

Use these commands for common workflows:
- `/commit-push-pr` - Commit, push, and create PR in one command
- `/typecheck` - Run TypeScript type checking
- `/lint-fix` - Run ESLint with auto-fix
- `/deploy-status` - Check Vercel deployment status
- `/test` - Run tests (or build verification)
- `/supabase-status` - Check Supabase project health

## Custom Subagents

Use these subagents for verification:
- `build-validator` - Verify build after changes
- `code-simplifier` - Review code for over-engineering
- `verify-app` - End-to-end app verification

## Learnings (Claude Guidance)

This section records patterns and corrections. Add to it when Claude makes mistakes.

### General
- Prefer `type` over `interface`; **never use `enum`** (use string literal unions instead)
- Always run `npm run build` after making changes to verify TypeScript
- Don't create new files unless explicitly asked - prefer editing existing files
- Use `@/` import alias for all imports (e.g., `@/lib/types`)
- No emojis in code unless user explicitly requests them

### Backend/Auth
- For Supabase: always use RLS policies, never expose service role key client-side
- For Stripe: use webhooks for subscription state changes, don't trust client-side status
- Auth providers: Google OAuth + Apple Sign-In (no email/password)

### Mobile App (React Native)
- **Native iOS Apple Sign-In requires manual nonce handling** - unlike web OAuth which handles it automatically
- Pass RAW nonce to both Apple and Supabase - iOS hashes internally, do NOT pre-hash (causes double-hashing)
- Mobile uses `signInWithIdToken()` vs web uses `signInWithOAuth()` - different nonce requirements
- Always check Supabase Auth logs first when debugging auth issues (Dashboard > Authentication > Logs)
- Test auth on real device - simulator can't complete biometric authentication
- Full rebuild required after native changes: `rm -rf ios/build && bundle exec pod install`
- See `MOBILE_APP_SETUP.md` for detailed debugging guide and common errors

### Database (WNU Platform - Feb 2026)
- **The app uses `wnu-platform` Supabase project** (ID: `ahwensdtjsvuqxbjgkgv`), NOT `realworth-db`
- See Database Schema section above for table details and naming conventions
