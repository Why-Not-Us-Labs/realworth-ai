# RealWorth.ai - Project Documentation

## Overview
RealWorth.ai is an AI-powered appraisal platform that uses Google Gemini to analyze images of items (books, collectibles, antiques, etc.) and provide detailed valuations with market pricing estimates.

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4.1
- **Runtime**: React 18

### Backend & APIs
- **AI Service**: Google Gemini 2.5 Flash
  - `gemini-2.5-flash` for appraisal analysis
  - `gemini-2.5-flash-image-preview` for image regeneration
- **Authentication**: Google Identity Services (OAuth 2.0 Token Client)
- **Storage**: localStorage (migrating to Supabase)

### Infrastructure
- **Hosting**: Vercel
- **Git**: GitHub (the-prod-father/realworth-ai)
- **Domains**:
  - Production: https://real-worth.vercel.app
  - Custom: realworth.ai (pending DNS)

## Project Structure

```
realworth-ai/
├── app/
│   ├── layout.tsx              # Root layout with Google OAuth script
│   ├── page.tsx                # Main page with auth and appraisal logic
│   └── api/
│       └── appraise/
│           └── route.ts        # AI appraisal API endpoint
├── components/
│   ├── AppraisalForm.tsx       # Upload form with file picker and condition selector
│   ├── FileUpload.tsx          # Drag-and-drop file upload component
│   ├── HistoryList.tsx         # Display user's appraisal history
│   ├── ResultCard.tsx          # Display appraisal results
│   ├── contexts/
│   │   └── AuthContext.tsx     # React Context for authentication state
│   └── icons.tsx               # SVG icon components
├── hooks/
│   └── useAppraisal.tsx        # Custom hook for appraisal logic
├── lib/
│   ├── types.ts                # TypeScript type definitions
│   └── constants.ts            # App constants (CONDITIONS array)
├── services/
│   ├── authService.ts          # Google OAuth authentication logic
│   └── dbService.ts            # localStorage wrapper (migrating to Supabase)
├── types/
│   └── google.d.ts             # Google Identity Services type declarations
├── .env.local                  # Environment variables (NOT in git)
├── package.json                # Dependencies and scripts
├── tailwind.config.ts          # Tailwind CSS configuration
└── tsconfig.json               # TypeScript configuration
```

## Core Features

### 1. Google OAuth Authentication
- Button-based sign-in using OAuth 2.0 Token Client
- Fetches user profile from Google's userinfo endpoint
- Stores user session in localStorage
- Supports sign-out with auto-select disabled

**Implementation**: `services/authService.ts:10-79`

### 2. AI Appraisal Workflow
Two-step process:
1. **Analysis**: Uploads images to Gemini 2.5 Flash with structured JSON response schema
2. **Image Regeneration**: Uses Gemini 2.5 Flash Image Preview to recreate item image

**API Endpoint**: `app/api/appraise/route.ts:35-104`

**Response Schema**:
```typescript
{
  itemName: string;        // Book title or item name
  author: string;          // Author (N/A if not a book)
  era: string;             // Publication year or estimated period
  category: string;        // Single-word category
  description: string;     // Content summary or physical description
  priceRange: {
    low: number;           // Minimum estimated value
    high: number;          // Maximum estimated value
  };
  currency: string;        // USD, EUR, etc.
  reasoning: string;       // Step-by-step valuation explanation
}
```

### 3. Condition-Based Valuation
Users specify item condition:
- Mint
- Excellent
- Good
- Fair
- Poor

Condition is passed to AI for accurate pricing.

### 4. Appraisal History
- Stored per user in localStorage (key: `appraisalHistory_${userId}`)
- Displays in grid layout with thumbnails
- Click to view full appraisal details

## Environment Variables

### Required for Local Development
Create `.env.local` with:

```bash
# Google Gemini API Key
GEMINI_API_KEY="your-gemini-api-key"

# Google OAuth Client ID (public)
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id"

# Google OAuth Client Secret (not currently used)
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Production (Vercel)
All environment variables are configured in Vercel dashboard:
- `GEMINI_API_KEY` - Production
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Production

## Google OAuth Configuration

### Authorized JavaScript Origins
Add these to Google Cloud Console:
- `http://localhost:3001` (local development)
- `https://real-worth.vercel.app` (production)
- `https://realworth.ai` (custom domain - after DNS setup)
- `https://www.realworth.ai` (www subdomain - after DNS setup)

### Redirect URIs
Not required for OAuth 2.0 Token Client (popup-based flow)

## Development Workflow

### Initial Setup
```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
# App runs on http://localhost:3001
```

### Available Scripts
- `npm run dev` - Start dev server on port 3001
- `npm run build` - Create production build
- `npm start` - Run production build
- `npm run lint` - Run ESLint

### Git Workflow
```bash
# Add changes
git add .

# Commit with descriptive message
git commit -m "Your message"

# Push to GitHub (triggers Vercel deployment)
git push origin main
```

## Deployment

### Vercel Setup
1. Project connected to GitHub repo: `the-prod-father/realworth-ai`
2. Auto-deploys on push to `main` branch
3. Environment variables configured in Vercel dashboard

### Production URLs
- **Vercel**: https://real-worth.vercel.app
- **Custom Domain**: realworth.ai (requires DNS configuration)

### DNS Configuration for Custom Domain
Add these A records at your domain registrar:

```
Type: A
Name: @
Value: 76.76.21.21

Type: A
Name: www
Value: 76.76.21.21
```

Verification takes 5-30 minutes after DNS propagation.

## TypeScript Configuration

### Strict Mode Enabled
All files must pass TypeScript strict checks for production builds.

### Common Type Definitions

**User** (`lib/types.ts:3-8`):
```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}
```

**AppraisalRequest** (`lib/types.ts:10-13`):
```typescript
export interface AppraisalRequest {
  files: File[];
  condition: string;
}
```

**AppraisalResult** (`lib/types.ts:15-31`):
```typescript
export interface AppraisalResult {
  id: string;
  itemName: string;
  author: string;
  era: string;
  category: string;
  description: string;
  priceRange: {
    low: number;
    high: number;
  };
  currency: string;
  reasoning: string;
  image: string;
  timestamp: number;
}
```

## Architecture Patterns

### Client-Side State Management
- React Context for authentication (`components/contexts/AuthContext.tsx`)
- Custom hooks for appraisal logic (`hooks/useAppraisal.tsx`)
- localStorage for persistence (temporary, migrating to Supabase)

### API Design
- Next.js API Routes for server-side logic
- FormData for multi-file uploads
- Structured JSON responses with error handling

### Error Handling
- Try-catch blocks in all async operations
- User-friendly error messages
- Console logging for debugging

## Known Issues & Future Improvements

### Current Limitations
1. **localStorage Storage**: Not suitable for production scale
   - No server-side persistence
   - Limited to 5-10MB per domain
   - Data lost if user clears browser data

2. **No Database**: Appraisal history is not shared across devices

3. **No User Management**: No password reset, email verification, etc.

### Planned Improvements
1. **Supabase Integration**:
   - PostgreSQL database for appraisal history
   - Server-side user authentication
   - Real-time data sync across devices

2. **Enhanced Features**:
   - PDF export of appraisals
   - Comparison tool for multiple items
   - Price tracking over time
   - Share appraisals via link

## Troubleshooting

### OAuth Issues
**Problem**: "Error retrieving a token"
**Solution**: Ensure JavaScript origins are configured correctly in Google Cloud Console

**Problem**: "Google OAuth services failed to load"
**Solution**: Check internet connection, verify Google script is loading (check Network tab)

### Build Issues
**Problem**: TypeScript errors in production build
**Solution**: All import paths must use `@/lib/types` not `@/types`

**Problem**: "Cannot find module" errors
**Solution**: Check `tsconfig.json` paths configuration and file locations

### API Issues
**Problem**: "GEMINI_API_KEY environment variable not set"
**Solution**: Create `.env.local` file with correct API key

**Problem**: AI response is incomplete
**Solution**: Check Gemini API quota and rate limits

## Testing

### Manual Testing Checklist
- [ ] Google sign-in works
- [ ] File upload (drag-and-drop and file picker)
- [ ] Appraisal returns valid JSON response
- [ ] Image regeneration displays correctly
- [ ] History saves and displays properly
- [ ] Sign-out clears session
- [ ] Responsive design on mobile/tablet

### Test Credentials
Use your own Google account for OAuth testing.

## Performance Considerations

### Image Optimization
- Images converted to base64 for AI processing
- Regenerated images stored as data URLs
- Consider adding image compression in future

### API Response Times
- Appraisal: ~3-5 seconds
- Image regeneration: ~5-10 seconds
- Total workflow: ~8-15 seconds

### Caching Strategy
Currently no caching. Future improvements:
- Cache appraisal results in Supabase
- Add Redis for frequently accessed data

## Security Notes

### Environment Variables
- Never commit `.env.local` to git
- Use `NEXT_PUBLIC_` prefix only for client-safe variables
- Rotate API keys if accidentally exposed

### OAuth Security
- Uses Google's secure OAuth 2.0 flow
- Access tokens are short-lived
- No password storage required

### API Security
- API routes are server-side only
- FormData validation on file uploads
- Error messages don't expose sensitive info

## Contributing

### Code Style
- Use TypeScript strict mode
- Follow existing file structure
- Use Tailwind utility classes (no inline styles)
- Add type definitions for all functions

### Commit Messages
Format: `<type>: <description>`

Types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

### Pull Request Process
1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Test locally
4. Push and create PR
5. Wait for review and deployment

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [Google Identity Services](https://developers.google.com/identity/gsi/web)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vercel Deployment](https://vercel.com/docs)

### Support
- GitHub Issues: https://github.com/the-prod-father/realworth-ai/issues
- Email: [your-email]

## License
[Add your license here]

## Credits
Built with Claude Code by Anthropic.
