# Next Features Implementation Plan

## Priority 1: Add More Images to Appraisals

### Overview
Allow users to add additional photos to existing appraisals for better AI analysis and valuation accuracy.

### Database Migration
```sql
-- Add to appraisals table
ALTER TABLE appraisals ADD COLUMN image_count INTEGER DEFAULT 1;
ALTER TABLE appraisals ADD COLUMN last_analyzed_at TIMESTAMP WITH TIME ZONE;
```

### Implementation Steps

1. **Database migration** - Add image_count and last_analyzed_at fields
2. **dbService.ts** - Add `addImagesToAppraisal()` and `reanalyzeAppraisal()` methods
3. **API endpoint** - Create `app/api/appraise/[id]/route.ts` with PATCH handler
4. **AddPhotosModal.tsx** - New component for uploading additional images
5. **ResultCard.tsx** - Add "Add Photos" button and image count badge
6. **Gamification** - Show prompts like "Add 2 more photos for better accuracy!"

### User Flow
1. User views existing appraisal
2. Taps "Add Photos" button
3. Uploads additional images (spine, back cover, copyright page, etc.)
4. Images uploaded to Supabase Storage and appended to `image_urls`
5. Optional: User taps "Re-analyze" to get updated valuation
6. AI processes ALL images for richer context
7. Updated valuation displayed (show before/after if changed)

### Files to Create
- `components/AddPhotosModal.tsx`
- `app/api/appraise/[id]/route.ts`

### Files to Modify
- `services/dbService.ts` - Add methods for adding images
- `components/ResultCard.tsx` - Add Photos button, image count
- `lib/types.ts` - Update AppraisalResult if needed

---

## Priority 2: Archive Appraisals

### Overview
Allow users to archive appraisals they don't want visible in their main history.

### Database Migration
```sql
ALTER TABLE appraisals ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
```

### Implementation Steps

1. **Database migration** - Add archived_at field
2. **dbService.ts** - Add `archiveAppraisal()` and `getArchivedHistory()` methods
3. **HistoryList.tsx** - Add archive button and "Show Archived" filter
4. **UI** - Swipe to archive or menu option

### User Flow
1. User swipes or taps menu on appraisal
2. Select "Archive"
3. Item hidden from main history
4. "View Archived" toggle to see archived items
5. Can unarchive anytime

### Files to Modify
- `services/dbService.ts` - Archive/unarchive methods
- `components/HistoryList.tsx` - Archive UI and filter

---

## Priority 3: AI Chat Feature (Future)

### Two Levels

**Item-level Chat:**
- Each appraisal has its own chat
- Context: That specific item's details
- Questions like "What makes this valuable?" "Where to sell?"

**Global Chat:**
- Chat with context of ALL appraised items
- Questions like "What's my most valuable item?" "What should I insure?"

### Database Schema
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  appraisal_id UUID REFERENCES appraisals(id), -- NULL for global chat
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Implementation (when ready)
- `components/ChatInterface.tsx` - iMessage-style UI
- `app/api/chat/route.ts` - Gemini conversation endpoint
- `services/chatService.ts` - Chat CRUD operations

---

## Quick Reference

### Recommended Photo Angles for Best Appraisal
- Front cover/face
- Back cover/reverse
- Spine (for books)
- Copyright/maker's mark page
- Any damage or notable features
- Size reference (with common object)

### Gamification Ideas
- "3/5 recommended photos" progress indicator
- "Add more photos to unlock detailed analysis"
- Achievement: "Thorough Appraiser" - 5+ photos on an item
- Before/after value comparison when re-analyzed
