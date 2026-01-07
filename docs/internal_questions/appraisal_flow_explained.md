# Appraisal Flow: Before & After the "Get Appraisal" Button

*Internal documentation explaining exactly what happens when a user requests an appraisal.*

---

## Before "Get Appraisal" Button

1. **User selects photos** - Stored locally in browser state
2. **Button click** - Calls `handleSubmit()` which triggers `onSubmit({ files })`

---

## The Flow (useAppraisal hook)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UPLOAD IMAGES (client → Supabase Storage)                │
│    - Compress images if too large (max 1600px, 80% quality) │
│    - Upload to: appraisal-images/{userId}/uploads/          │
│    - Get public URLs back                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CALL API (POST /api/appraise)                            │
│    - Send: { imageUrls, imagePaths, condition }             │
│    - Header: Authorization Bearer token                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Inside the API Route

```
┌─────────────────────────────────────────────────────────────┐
│ 3. LIMIT CHECK                                              │
│    - subscriptionService.canCreateAppraisal(userId)         │
│    - If limit reached → return 403 error                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. FETCH IMAGES                                             │
│    - Download images from Storage URLs                      │
│    - Convert to base64 for Gemini                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. LLM CALL #1 - APPRAISAL (gemini-3-pro-preview)           │
│                                                             │
│    ai.models.generateContent({                              │
│      model: 'gemini-3-pro-preview',                         │
│      contents: { parts: [images + prompt] },                │
│      config: {                                              │
│        systemInstruction: "You are a senior appraiser...",  │
│        responseMimeType: 'application/json',                │
│        responseSchema: responseSchema  ← structured JSON    │
│      }                                                      │
│    })                                                       │
│                                                             │
│    Returns: itemName, priceRange, reasoning, references...  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. LLM CALL #2 - IMAGE REGEN (gemini-3-pro-image-preview)   │
│                                                             │
│    ai.models.generateContent({                              │
│      model: 'gemini-3-pro-image-preview',                   │
│      contents: "Regenerate this image exactly as is",       │
│      config: { responseModalities: [IMAGE] }                │
│    })                                                       │
│                                                             │
│    Returns: Clean/enhanced version of the photo             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. UPLOAD RESULT IMAGE                                      │
│    - Store regenerated image to: {userId}/results/          │
│    - Get public URL                                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. UPDATE STREAK                                            │
│    - Check if new day → increment streak                    │
│    - Update longest_streak if needed                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. SAVE TO DATABASE (dbService)                             │
│    - Insert into appraisals table                           │
│    - Increment monthly_appraisal_count                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. RETURN RESPONSE                                         │
│     { appraisalData, imageDataUrl, streakInfo, validation } │
└─────────────────────────────────────────────────────────────┘
```

---

## After API Returns

```
UI State: LOADING → CELEBRATION → RESULT
          (trivia)   (confetti)    (show data)
```

---

## Key Points

- **Two LLM calls per appraisal** - One for structured data extraction, one for image regeneration
- **Structured JSON schema** - Forces consistent output from Gemini (itemName, priceRange, reasoning, references, confidenceScore, etc.)
- **120s timeout on Vercel** - Requires Vercel Pro plan for extended function duration
- **Images stored in Supabase** - Not passed through Vercel body limits; uploaded directly to Storage first

---

## Key Files

| File | Purpose |
|------|---------|
| `components/AppraisalForm.tsx` | UI form with file upload |
| `hooks/useAppraisal.ts` | Client-side logic: compress, upload, call API |
| `app/api/appraise/route.ts` | Server-side: limit check, LLM calls, save to DB |
| `services/subscriptionService.ts` | Limit enforcement logic |
| `services/dbService.ts` | Database operations |
| `lib/constants.ts` | `FREE_APPRAISAL_LIMIT` constant |

---

## Response Schema (what Gemini returns)

```typescript
{
  itemName: string,           // "1924 First Edition - The Great Gatsby"
  author: string,             // "F. Scott Fitzgerald"
  era: string,                // "1924"
  category: string,           // "Book"
  description: string,        // Detailed item description
  priceRange: {
    low: number,              // 5000
    high: number              // 15000
  },
  currency: string,           // "USD"
  reasoning: string,          // Why it's worth this much
  references: [{              // Links to verify valuation
    title: string,
    url: string
  }],
  confidenceScore: number,    // 0-100
  confidenceFactors: [{       // What affected confidence
    factor: string,
    impact: string,
    detail: string
  }],
  collectionOpportunity: {    // Is this part of a set?
    isPartOfSet: boolean,
    setName: string,
    // ...more fields
  },
  careTips: string[],         // Preservation recommendations
  collectibleDetails: {       // For coins/stamps/currency
    mintMark: string,
    gradeEstimate: string,
    keyDate: boolean,
    // ...more fields
  }
}
```

---

*Last updated: January 2026*
