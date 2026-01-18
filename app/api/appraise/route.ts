
import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notificationService } from '@/services/notificationService';
import { getEbayMarketValue, buildSearchKeywords, buildCategoryAspects, type EbayMarketData } from '@/services/ebayPriceService';
import { getMetalPrices, formatMetalPricesForPrompt } from '@/services/metalPriceService';
import type { ValuationBreakdown, EbayComparable, FutureValuePrediction } from '@/lib/types';

// App Router config - extend timeout for AI processing
// Requires Vercel Pro plan for > 60 seconds
export const maxDuration = 120;

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Initialize Supabase clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // For server-side operations

// Helper function to create authenticated Supabase client
function createAuthenticatedClient(authToken?: string) {
  if (authToken) {
    // Use the user's access token directly for authenticated requests
    // This ensures RLS policies are enforced correctly
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    });
  }
  // Fallback to anon key (for unauthenticated requests)
  return createClient(supabaseUrl, supabaseAnonKey);
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    itemName: { type: Type.STRING, description: "The title of the book or a concise name for the item." },
    author: { type: Type.STRING, description: "The author of the book. If not a book or not visible, state 'N/A'." },
    era: { type: Type.STRING, description: "The publication year of the book (e.g., '1924') or the estimated time period of the item (e.g., 'c. 1920s')." },
    category: { type: Type.STRING, description: "A single-word category for the item (e.g., 'Book', 'Painting', 'Tool', 'Record', 'Toy', 'Collectible')." },
    description: { type: Type.STRING, description: "A brief summary of the book's content or a physical description of the item. This should be formatted as a readable paragraph." },
    priceRange: {
      type: Type.OBJECT,
      properties: {
        low: { type: Type.NUMBER, description: "The low end of the estimated value range as a number." },
        high: { type: Type.NUMBER, description: "The high end of the estimated value range as a number." }
      },
      required: ["low", "high"]
    },
    currency: { type: Type.STRING, description: "The currency for the price range, e.g., USD." },
    reasoning: { type: Type.STRING, description: "A step-by-step explanation of how the value was determined, considering the item's visual details, condition, rarity, and current market trends." },
    references: {
      type: Type.ARRAY,
      description: "An array of reference sources used to determine the price range. Each reference should include a title and URL to external marketplaces, auction results, or price guides that support the valuation.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A descriptive title for the reference source (e.g., 'AbeBooks - Similar Edition', 'eBay Recent Sales', 'Heritage Auctions')." },
          url: { type: Type.STRING, description: "The URL to the reference source. Use real, publicly accessible URLs to marketplaces like eBay, AbeBooks, Amazon, auction houses, or price guide websites." }
        },
        required: ["title", "url"]
      }
    },
    confidenceScore: { type: Type.NUMBER, description: "A confidence score from 0-100 indicating how certain the appraisal is. Consider: image clarity, item identifiability, market data availability, and condition assessment accuracy. 90-100 = very high (clear images, well-known item, abundant market data), 70-89 = high (good identification, solid comparables), 50-69 = moderate (some uncertainty in identification or pricing), below 50 = low confidence (poor image, rare item, limited data)." },
    confidenceFactors: {
      type: Type.ARRAY,
      description: "List of 2-4 factors that contributed to the confidence score, both positive and negative.",
      items: {
        type: Type.OBJECT,
        properties: {
          factor: { type: Type.STRING, description: "The factor name (e.g., 'Image Quality', 'Market Data', 'Item Identification', 'Condition Assessment')" },
          impact: { type: Type.STRING, description: "Whether this factor is 'positive', 'neutral', or 'negative'" },
          detail: { type: Type.STRING, description: "Brief explanation of how this factor affects confidence" }
        },
        required: ["factor", "impact", "detail"]
      }
    },
    seriesIdentifier: { type: Type.STRING, description: "If this item is part of a series or collection, identify its position (e.g., 'Book 3', '1942-D', 'Issue #47'). Leave empty if not applicable." },
    validationStatus: { type: Type.STRING, description: "If validating for a collection: 'valid' if item belongs, 'warning' if it has issues, 'mismatch' if it doesn't belong. Leave empty if not validating." },
    validationNotes: { type: Type.STRING, description: "Explanation for the validation status. Why does or doesn't this item belong to the collection?" },
    collectionOpportunity: {
      type: Type.OBJECT,
      description: "REQUIRED: Detect if this item is part of a known collection, set, or series that would be MORE valuable as a complete set. Books, coins, trading cards, china patterns, stamp series, etc. The complete set is almost always worth more than individual pieces.",
      properties: {
        isPartOfSet: { type: Type.BOOLEAN, description: "TRUE if this item belongs to a known collection, series, numbered set, matching pattern, author's collected works, or multi-volume edition. Be generous - if there's ANY possibility of a complete set, say true." },
        setName: { type: Type.STRING, description: "The official or commonly known name of the collection (e.g., 'The Writings of Mark Twain - Autograph Edition', 'Mercury Dime Series 1916-1945', 'Blue Willow China Pattern')." },
        totalItemsInSet: { type: Type.NUMBER, description: "Total number of items in the complete set/collection. For open-ended series, estimate the core/essential items." },
        thisItemPosition: { type: Type.STRING, description: "Which item this is in the set (e.g., 'Volume 3 of 25', '1942-D', 'Dinner Plate')." },
        completeSetValueMultiplier: { type: Type.NUMBER, description: "How much more valuable is the COMPLETE set vs individual items? (e.g., 2.0 means complete set worth 2x the sum of individual values, 1.5 means 50% premium)" },
        completeSetValueRange: {
          type: Type.OBJECT,
          properties: {
            low: { type: Type.NUMBER, description: "Low estimate for complete set value in dollars" },
            high: { type: Type.NUMBER, description: "High estimate for complete set value in dollars" }
          }
        },
        userQuestion: { type: Type.STRING, description: "A friendly, conversational question to ask the user about whether they have more items. Make it specific and helpful, e.g., 'This is Volume 3 of the 25-volume Autograph Edition! Do you have any of the other volumes? A complete set would be worth significantly more.'" },
        photographyTips: { type: Type.STRING, description: "Specific tips on what photos would help appraise additional items (e.g., 'For the other books, please photograph: 1) The spine showing volume number, 2) The title page, 3) Any signature pages or special inserts')." }
      },
      required: ["isPartOfSet"]
    },
    careTips: {
      type: Type.ARRAY,
      description: "3-5 specific preservation and care recommendations for this type of item. Include storage, handling, cleaning, and environmental considerations. Be practical and actionable.",
      items: { type: Type.STRING }
    },
    rarityScore: {
      type: Type.NUMBER,
      description: "Rarity score from 0.0 to 10.0 (one decimal place). Consider: production/mintage numbers, survival rate, condition rarity, key dates/varieties, historical significance, collector demand. 9.0-10.0 = extremely rare (< 100 known), 7.0-8.9 = very rare (< 1,000 known), 5.0-6.9 = moderately rare, 3.0-4.9 = somewhat uncommon, 0.0-2.9 = common."
    },
    rarityFactors: {
      type: Type.ARRAY,
      description: "2-4 factors explaining the rarity score with individual scores",
      items: {
        type: Type.OBJECT,
        properties: {
          factor: { type: Type.STRING, description: "Short label like 'Low Mintage', 'Key Date', 'Condition Rarity', 'Limited Production', 'High Demand'" },
          score: { type: Type.NUMBER, description: "This factor's contribution to rarity (0-10)" },
          detail: { type: Type.STRING, description: "1-2 sentence explanation of why this affects rarity" }
        },
        required: ["factor", "score", "detail"]
      }
    },
    collectibleDetails: {
      type: Type.OBJECT,
      description: "Additional details for collectible items like coins, stamps, and currency. Required for Coin, Stamp, and Currency categories.",
      properties: {
        mintMark: { type: Type.STRING, description: "For coins: The mint mark (D, S, O, CC, W, P, or 'none' for Philadelphia pre-1979). Include in item identification." },
        gradeEstimate: { type: Type.STRING, description: "Condition grade using appropriate scale. Coins: Sheldon scale (e.g., 'MS-65', 'VF-30', 'G-4'). Other items: descriptive (Mint, Excellent, Good, Fair, Poor)." },
        keyDate: { type: Type.BOOLEAN, description: "True if this is a known key date, rare variety, or significant rarity in its series." },
        certificationRecommended: { type: Type.BOOLEAN, description: "True if professional grading (PCGS, NGC, PSA) would significantly add value or help authentication." },
        metalContent: { type: Type.STRING, description: "For coins: Composition (e.g., '95% copper, 5% zinc', '90% silver', 'clad'). Important for pre-1965 silver coins." },
        faceValue: { type: Type.NUMBER, description: "The face/denomination value of coins, stamps, or currency (e.g., 0.01 for a penny, 1.00 for a dollar bill)." },
        collectiblePremium: { type: Type.STRING, description: "Explanation of why this item commands a premium over face value (rarity, condition, historical significance, errors, etc.)." }
      }
    }
  },
  required: ["itemName", "author", "era", "category", "description", "priceRange", "currency", "reasoning", "references", "confidenceScore", "confidenceFactors", "collectionOpportunity", "careTips", "rarityScore", "rarityFactors"]
};

// Validation function to catch face-value errors for collectibles
interface AppraisalData {
  itemName: string;
  category: string;
  era: string;
  priceRange: { low: number; high: number };
  confidenceScore: number;
  confidenceFactors: Array<{ factor: string; impact: string; detail: string }>;
  validationNotes?: string;
  careTips?: string[];
  rarityScore?: number;
  rarityFactors?: Array<{ factor: string; score: number; detail: string }>;
  collectibleDetails?: {
    mintMark?: string;
    gradeEstimate?: string;
    keyDate?: boolean;
    certificationRecommended?: boolean;
    metalContent?: string;
    faceValue?: number;
    collectiblePremium?: string;
  };
  [key: string]: unknown;
}

function validateAppraisal(result: AppraisalData): AppraisalData {
  // Define face-value thresholds that indicate potential undervaluation
  const faceValueIndicators = [
    { category: 'coin', maxValue: 1.00, alert: 'Coin valued near face value' },
    { category: 'stamp', maxValue: 1.00, alert: 'Stamp valued near face value' },
    { category: 'currency', maxValue: 100, alert: 'Currency valued at face value' },
  ];

  const categoryLower = result.category.toLowerCase();
  const indicator = faceValueIndicators.find(i =>
    categoryLower.includes(i.category) && result.priceRange.low <= i.maxValue
  );

  // Check if item is old enough to likely have collectible value
  const eraYear = parseInt(result.era?.replace(/\D/g, '') || '0');
  const isVintage = eraYear > 0 && eraYear < 1980;

  // Apply minimum floor values for vintage coins to prevent $0 valuations
  if (categoryLower.includes('coin') && isVintage) {
    // Minimum floors based on age - older coins have higher collector value
    let minimumLow = 0.25; // Default minimum for any vintage coin
    let minimumHigh = 1.00;

    if (eraYear < 1900) {
      minimumLow = 5.00;
      minimumHigh = 25.00;
    } else if (eraYear < 1940) {
      minimumLow = 1.00;
      minimumHigh = 5.00;
    } else if (eraYear < 1965) {
      minimumLow = 0.50;
      minimumHigh = 2.00;
    }

    // Apply floors
    if (result.priceRange.low < minimumLow) {
      console.log(`[Appraisal Validation] Applying minimum floor: $${result.priceRange.low} -> $${minimumLow} for ${result.itemName}`);
      result.priceRange.low = minimumLow;
    }
    if (result.priceRange.high < minimumHigh) {
      result.priceRange.high = Math.max(minimumHigh, result.priceRange.low * 4);
    }
  }

  if (indicator && isVintage) {
    // Old item valued at face value = likely error, add warning
    result.confidenceScore = Math.min(result.confidenceScore, 60);

    // Add warning factor
    if (!result.confidenceFactors) {
      result.confidenceFactors = [];
    }
    result.confidenceFactors.push({
      factor: 'Potential Undervaluation',
      impact: 'negative',
      detail: `${indicator.alert}. Items from ${result.era} typically have collectible value above face value. Consider professional grading.`
    });

    // Add validation note
    const existingNotes = result.validationNotes || '';
    result.validationNotes = `${existingNotes} NOTE: This ${categoryLower} from ${result.era} may have significant collectible value. The low estimate may be conservative - consider having it professionally graded (PCGS, NGC) for accurate valuation.`.trim();

    console.log(`[Appraisal Validation] Potential undervaluation detected: ${result.itemName} from ${result.era} valued at $${result.priceRange.low}-$${result.priceRange.high}`);
  }

  // Additional check: if collectibleDetails shows face value but price range matches, flag it
  if (result.collectibleDetails?.faceValue &&
      result.priceRange.low <= result.collectibleDetails.faceValue * 1.1 &&
      isVintage) {
    console.log(`[Appraisal Validation] Price matches face value for vintage item: ${result.itemName}`);
  }

  return result;
}

/**
 * Generate simple future value predictions based on category and age
 * Returns probability-based appreciation forecasts for 10, 25, 50, 100 years
 */
function generateFutureValuePredictions(
  category: string,
  era: string,
  currentValue: number
): FutureValuePrediction[] {
  // Extract year from era if possible
  const eraYear = parseInt(era?.replace(/\D/g, '') || '0');
  const itemAge = eraYear > 0 ? new Date().getFullYear() - eraYear : 0;

  // Category-based appreciation rates (historical averages)
  const categoryRates: Record<string, { baseRate: number; volatility: number }> = {
    'Coin': { baseRate: 0.05, volatility: 0.3 }, // 5% avg annual, 30% volatility
    'Book': { baseRate: 0.03, volatility: 0.4 }, // Books vary more
    'Art': { baseRate: 0.07, volatility: 0.5 }, // Art can spike
    'Jewelry': { baseRate: 0.04, volatility: 0.2 }, // More stable
    'Watch': { baseRate: 0.06, volatility: 0.3 },
    'Toy': { baseRate: 0.04, volatility: 0.5 }, // Nostalgia driven
    'Collectible': { baseRate: 0.04, volatility: 0.4 },
    'Stamp': { baseRate: 0.02, volatility: 0.3 }, // Declining market
    'Currency': { baseRate: 0.03, volatility: 0.3 },
  };

  const categoryLower = category?.toLowerCase() || '';
  const rates = Object.entries(categoryRates).find(([key]) =>
    categoryLower.includes(key.toLowerCase())
  )?.[1] || { baseRate: 0.03, volatility: 0.4 };

  // Age bonus: older items tend to appreciate more
  const ageBonus = itemAge > 100 ? 0.02 : itemAge > 50 ? 0.01 : 0;
  const adjustedRate = rates.baseRate + ageBonus;

  // Generate predictions for different time horizons
  const timeframes: Array<10 | 25 | 50 | 100> = [10, 25, 50, 100];

  return timeframes.map((years) => {
    // Compound growth with uncertainty
    const baseMultiplier = Math.pow(1 + adjustedRate, years);
    const lowMultiplier = Math.max(0.5, baseMultiplier * (1 - rates.volatility));
    const highMultiplier = baseMultiplier * (1 + rates.volatility);

    // Probability decreases with longer timeframes (more uncertainty)
    // Also affected by category stability
    const baseProbability = 75 - (years * 0.3) - (rates.volatility * 20);
    const probability = Math.round(Math.max(30, Math.min(85, baseProbability)));

    // Generate reasoning based on category
    const reasonings: Record<string, string> = {
      'Coin': `Historical coin values have appreciated 3-7% annually. ${itemAge > 50 ? 'Vintage coins (50+ years) often see premium appreciation.' : ''} Rarity and condition are key factors.`,
      'Book': `First editions and rare books have shown steady appreciation. ${itemAge > 100 ? 'Pre-1900 books are increasingly scarce.' : ''} Condition and provenance matter significantly.`,
      'Art': `Art appreciation varies widely by artist and period. ${itemAge > 50 ? 'Mid-century and older works often appreciate faster.' : ''} Market trends can cause significant swings.`,
      'Jewelry': `Precious metals and gemstones provide baseline value. Designer and vintage pieces command premiums that grow over time.`,
      'Watch': `Luxury watches, especially Swiss brands, have shown strong appreciation. ${itemAge > 30 ? 'Vintage watches are increasingly collectible.' : ''} Limited editions appreciate faster.`,
      'Toy': `Vintage toys appreciate based on nostalgia cycles. ${itemAge > 40 ? 'Pre-1980s toys are highly sought after.' : ''} Condition and original packaging are crucial.`,
      'default': `Collectibles typically appreciate 2-5% annually. Rarity, condition, and market demand are the primary drivers of long-term value.`,
    };

    const reasoning = Object.entries(reasonings).find(([key]) =>
      categoryLower.includes(key.toLowerCase())
    )?.[1] || reasonings['default'];

    return {
      years,
      probability,
      multiplierLow: Math.round(lowMultiplier * 10) / 10,
      multiplierHigh: Math.round(highMultiplier * 10) / 10,
      reasoning: reasoning.trim(),
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    // Accept JSON body with image URLs (uploaded directly to Supabase Storage)
    const body = await req.json();
    const { imageUrls, imagePaths, condition, collectionId } = body as {
      imageUrls: string[];
      imagePaths: string[];
      condition?: string; // Optional - AI determines from photos if not provided
      collectionId?: string;
    };

    // Get auth token from Authorization header
    const authHeader = req.headers.get('authorization');
    const authToken = authHeader?.replace('Bearer ', '');

    // Create Supabase client
    const supabase = createAuthenticatedClient(authToken);

    // Input validation
    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json({ error: 'No images provided.' }, { status: 400 });
    }

    // Limit number of images to prevent abuse
    const MAX_IMAGES = 5;
    if (imageUrls.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IMAGES} images allowed per appraisal.` },
        { status: 400 }
      );
    }

    // Validate image URLs are from our storage
    const validUrlPattern = /^https:\/\/[a-z]+\.supabase\.co\/storage\/v1\/object\/public\//;
    for (const url of imageUrls) {
      if (!validUrlPattern.test(url)) {
        return NextResponse.json(
          { error: 'Invalid image URL. Images must be uploaded through the app.' },
          { status: 400 }
        );
      }
    }

    // Get user ID if authenticated
    let userId: string | null = null;
    if (authToken) {
      const { data: { user } } = await supabase.auth.getUser(authToken);
      userId = user?.id || null;
    }

    // SERVER-SIDE LIMIT ENFORCEMENT - Cannot be bypassed
    let willUseCredit = false;
    if (userId) {
      // Import dynamically to avoid issues with server-side rendering
      const { subscriptionService, FREE_APPRAISAL_LIMIT } = await import('@/services/subscriptionService');

      const { canCreate, remaining, isPro, currentCount, credits, useCredit } = await subscriptionService.canCreateAppraisal(userId);

      if (!canCreate) {
        console.log('[Appraise API] FREE LIMIT REACHED:', { userId, currentCount, limit: FREE_APPRAISAL_LIMIT, credits });
        return NextResponse.json(
          {
            error: 'Monthly appraisal limit reached',
            code: 'LIMIT_REACHED',
            message: `You've used all ${FREE_APPRAISAL_LIMIT} free appraisals this month. Upgrade to Pro for unlimited appraisals or buy a single appraisal for $1.99!`,
            currentCount,
            limit: FREE_APPRAISAL_LIMIT,
            credits,
            requiresUpgrade: true
          },
          { status: 403 }
        );
      }

      willUseCredit = useCredit;
      console.log('[Appraise API] Limit check passed:', { userId, currentCount, remaining, isPro, credits, willUseCredit });
    }

    // Fetch collection details if collectionId is provided
    let collectionContext = '';
    let collectionName = '';
    if (collectionId && userId) {
      const { data: collection } = await supabase
        .from('collections')
        .select('name, description, category, expected_items')
        .eq('id', collectionId)
        .eq('user_id', userId)
        .single();

      if (collection) {
        collectionName = collection.name;
        const existingItems = collection.expected_items || [];
        collectionContext = `
IMPORTANT - Collection Validation:
This item is being added to a collection called "${collection.name}".
${collection.description ? `Collection description: ${collection.description}` : ''}
${collection.category ? `Collection category: ${collection.category}` : ''}
${existingItems.length > 0 ? `Expected items in collection: ${existingItems.join(', ')}` : ''}

You must also provide validation feedback:
- If this item clearly belongs to this collection, set validationStatus to "valid"
- If this item might belong but has issues (wrong edition, condition mismatch), set validationStatus to "warning" with explanation
- If this item does NOT belong to this collection (wrong series, different author), set validationStatus to "mismatch" with explanation
- Identify the item's position in the series if applicable (e.g., "Book 3", "1942 Penny")`;
      }
    }

    // Fetch images from storage URLs and convert to base64
    const imageParts = await Promise.all(imageUrls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from storage: ${url}`);
      }
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      return {
        inlineData: {
          data: Buffer.from(buffer).toString('base64'),
          mimeType: contentType,
        },
      };
    }));

    // Fetch current precious metal prices for accurate coin/jewelry valuations
    const metalPrices = await getMetalPrices();
    const metalPriceContext = formatMetalPricesForPrompt(metalPrices);
    console.log(`[Appraise API] Metal prices fetched: Silver $${metalPrices.silver.toFixed(2)}/oz, Gold $${metalPrices.gold.toFixed(2)}/oz`);

    // Step 1: Get the detailed appraisal data
    const appraisalSystemInstruction = `You are a senior appraiser at RealWorth.ai, trained in the tradition of the world's finest auction houses and the legendary experts from Antiques Roadshow. You bring decades of combined expertise from Christie's, Sotheby's, Heritage Auctions, and specialty dealers.

YOUR APPRAISAL APPROACH:
1. IDENTIFY - What exactly is this item? Look for maker's marks, signatures, dates, materials
2. AUTHENTICATE - What details confirm this is genuine? Point to specific visual evidence
3. CONTEXTUALIZE - What's the history? Why was this made? Who would have owned it?
4. COMPARE - Reference actual auction results and sales of similar items
5. VALUE - Based on current market demand, condition, and rarity

COMMUNICATION STYLE:
- Be specific: "I can see the maker's mark here..." not "This appears to be..."
- Tell the story: Every item has a history that adds to its value
- Educate: Explain WHY something is valuable, not just WHAT it's worth
- Be confident but honest: If you're uncertain, explain what additional information would help
- Channel enthusiasm: When you spot something special, let that excitement show

In your DESCRIPTION: Tell the item's story - who made it, when, why it matters
In your REASONING: Explain exactly what you see that determines the value, like you're showing someone on camera
In your CARE TIPS: Provide 3-5 specific, practical preservation tips for this type of item

CRITICAL VALUATION RULES:
1. NEVER return face value for collectible items (coins, stamps, currency, trading cards)
2. ALWAYS consider rarity, age, condition, and collector demand
3. For coins: Check the DATE and MINT MARK carefully—certain dates are extremely valuable
4. For any item over 50 years old: Assume collectible value exists and research accordingly
5. When uncertain between face value and collectible value: ALWAYS err toward collectible value

=== COMPREHENSIVE US COIN GUIDE ===

MINT MARKS (location varies by coin type):
- D = Denver (1906-present)
- S = San Francisco (1854-present)
- CC = Carson City (1870-1893) - ALWAYS valuable!
- O = New Orleans (1838-1909)
- W = West Point (1984-present)
- P or no mark = Philadelphia

PENNIES - KEY DATES:
Lincoln Wheat (1909-1958):
- 1909-S VDB: $800-$2,000+ (first year, designer initials)
- 1909-S: $100-$300 (no VDB)
- 1914-D: $250-$500+ (only 1.2M minted)
- 1922 No D: $600-$1,500 (error - missing mint mark)
- 1924-D: $40-$150
- 1931-S: $100-$200 (Depression era, only 866K)
- 1943 Copper: $100,000-$1,000,000+ (should be steel!)
- 1944 Steel: $75,000-$400,000 (should be copper!)
- 1955 Double Die: $1,000-$25,000 (famous error)
- 1969-S Double Die: $25,000-$100,000

Lincoln Memorial (1959-2008):
- 1972 Double Die: $300-$500
- 1983 Double Die Reverse: $200-$400
- 1992 Close AM: $200-$500
- 1995 Double Die: $20-$75

NICKELS - KEY DATES:
Buffalo (1913-1938):
- 1913-S Type 2: $50-$200
- 1918/7-D: $1,000-$5,000 (overdate)
- 1921-S: $50-$300
- 1926-S: $30-$200
- 1937-D 3-Legged: $500-$2,000 (missing leg error)

Jefferson (1938-present):
- 1939-D: $10-$50
- 1942-1945 (large mint mark above dome): 35% SILVER - $2-$5 melt
- 1950-D: $15-$40 (lowest mintage)
- 2004-D Wisconsin Extra Leaf: $100-$300

DIMES - KEY DATES:
Mercury (1916-1945):
- 1916-D: $1,000-$10,000+ (KEY DATE - only 264K minted!)
- 1921: $50-$150
- 1921-D: $75-$200
- 1926-S: $20-$75
- 1942/1: $400-$1,500 (overdate)
- 1942/1-D: $500-$2,000

Roosevelt (1946-present):
- Pre-1965: 90% SILVER - $1.80+ melt value
- 1982 No P: $100-$300 (missing mint mark)

QUARTERS - KEY DATES:
Washington (1932-1998):
- 1932-D: $100-$300+ (KEY - only 436K)
- 1932-S: $100-$250+ (KEY - only 408K)
- Pre-1965: 90% SILVER

State Quarters (1999-2008):
- 2004-D Wisconsin Extra Leaf: $100-$500

HALF DOLLARS - KEY DATES:
Walking Liberty (1916-1947):
- 1916-S: $75-$300
- 1921: $150-$500 (KEY)
- 1921-D: $200-$600 (KEY)
- 1921-S: $50-$250
- All pre-1947: 90% SILVER

Kennedy (1964-present):
- 1964: 90% SILVER ($10-$15)
- 1965-1970: 40% SILVER ($4-$6)
- 1970-D: $30-$75 (mint set only)

SILVER DOLLARS - KEY DATES:
Morgan (1878-1921):
- Any CC (Carson City): $100-$500+ minimum
- 1889-CC: $500-$3,000
- 1893-S: $3,000-$50,000+ (KEY - only 100K)
- 1895: $30,000-$100,000+ (proof only, "King of Morgans")

Peace (1921-1935):
- 1921: $100-$300 (high relief)
- 1928: $300-$600 (KEY - only 360K)

ERROR COINS TO WATCH:
- Double Die: Doubled lettering/date (1955, 1969-S, 1972 pennies)
- Off-Center: Image shifted, blank crescent visible
- Wrong Planchet: Wrong metal (1943 copper, 1944 steel penny)
- Clipped Planchet: Missing chunk of metal
- Die Cracks/Cuds: Raised lines or blobs
- Broadstrike: No rim, image spread out

CONDITION GRADING (Sheldon Scale 1-70):
- P-1 to G-6: Poor to Good (heavily worn)
- VG-8 to F-15: Very Good to Fine
- VF-20 to EF-45: Very Fine to Extremely Fine
- AU-50 to AU-58: About Uncirculated
- MS-60 to MS-70: Mint State (uncirculated)
- PR/PF: Proof coins (special strikes)

=== OTHER VALUABLE COLLECTIBLES ===

VINTAGE JEWELRY:
- Tiffany & Co (look for "T&Co" mark): 2-10x gold value
- Cartier, Van Cleef & Arpels, Harry Winston: Premium brands
- Art Deco (1920s-1930s): Geometric designs, platinum popular
- Victorian (1837-1901): Mourning jewelry, cameos, seed pearls
- Signed pieces: Always worth more than unsigned

WATCHES:
- Rolex (any vintage): $2,000-$100,000+
- Patek Philippe: $5,000-$500,000+
- Omega Speedmaster "Moonwatch": $3,000-$10,000
- Vintage Cartier Tank: $2,000-$20,000
- Hamilton, Elgin, Waltham (pre-1970): $100-$1,000+

CHINA & PORCELAIN:
- Meissen (crossed swords mark): $100-$10,000+ per piece
- Royal Copenhagen: $50-$500+
- Wedgwood Jasperware: $50-$500
- Limoges (French): $25-$300
- Flow Blue (Victorian): $50-$500
- Fiesta (vintage, pre-1970): $20-$200
- Occupied Japan (1945-1952): $10-$100+

GLASSWARE:
- Tiffany Studios lamps/glass: $5,000-$500,000+
- Steuben: $100-$5,000
- Lalique (French crystal): $100-$10,000
- Depression Glass (1930s): $10-$200
- Carnival Glass (iridescent): $25-$500
- Fenton Art Glass: $25-$300
- Murano (Italian): $50-$5,000

SILVER:
- Sterling (.925): Worth melt + 20-100% for craftsmanship
- Tiffany sterling: 2-5x melt value
- Georg Jensen: Premium Danish silver
- Paul Revere pieces: Museum quality
- Coin silver (pre-1860s American): Historical premium

ARTWORK:
- Hudson River School (1825-1875): $5,000-$500,000+
- American Impressionism: $1,000-$100,000+
- Currier & Ives prints: $100-$5,000
- Audubon bird prints: $500-$50,000
- WPA-era art (1930s-40s): $500-$50,000
- Look for signatures, provenance

FURNITURE:
- Chippendale (1750-1780): $1,000-$100,000+
- Federal Period (1780-1820): $500-$50,000
- Victorian (1837-1901): $200-$10,000
- Arts & Crafts/Mission (1890-1920): $500-$20,000
- Mid-Century Modern (1945-1969): Hot market now!
- Makers to watch: Stickley, Eames, Knoll, Herman Miller

BOOKS:
- First editions (check number line): 10-1000x later printings
- Signed by author: 2-10x unsigned
- Dust jacket present: Can be 90% of value!
- Pre-1800 books: Almost always valuable
- Children's books (Dr. Seuss, Sendak first editions): $500-$50,000

TOYS & GAMES:
- Cast iron banks/toys (pre-1940): $100-$10,000
- Tin lithograph toys: $50-$5,000
- Early Barbie (1959-1966): $500-$25,000
- Hot Wheels Redlines (1968-1977): $20-$3,000
- Original Star Wars (1977-1985): $20-$5,000
- Baseball cards (pre-1970): $10-$1,000,000+

MILITARIA:
- Civil War items: $100-$50,000+
- WWI/WWII medals, uniforms: $50-$5,000
- Swords (pre-1900): $200-$10,000
- Military documents/letters: $25-$5,000

ITEM IDENTIFICATION:
- For books: Extract title, author, publication year
- For coins: Include denomination, year, mint mark in itemName (e.g., "1931-S Lincoln Wheat Penny")
- For other items: Descriptive name, maker if visible, era
- Category: Coin, Book, Stamp, Toy, Art, Jewelry, Silver, Porcelain, Glass, Watch, Furniture, Militaria

REFERENCE SOURCES (CRITICAL - Users need to verify your claims!):
You MUST provide 3-4 references from these TRUSTED sources to support your valuation:

For COINS:
- https://www.pcgs.com/coinfacts (PCGS CoinFacts - use specific coin URLs)
- https://www.ngccoin.com/price-guide (NGC Price Guide)
- https://www.usacoinbook.com (USA Coin Book values)
- https://coins.ha.com (Heritage Auctions - search for similar items)

For BOOKS:
- https://www.abebooks.com (AbeBooks - search for title)
- https://www.biblio.com (Biblio rare books)
- https://books.ha.com (Heritage Auctions books)
- https://www.rarebookhub.com (Rare Book Hub auction records)

For ART:
- https://www.christies.com (Christie's auction house)
- https://www.sothebys.com (Sotheby's)
- https://www.artnet.com/price-database (Artnet Price Database)
- https://www.mutualart.com (MutualArt artist prices)

For JEWELRY/WATCHES:
- https://www.1stdibs.com (1stDibs luxury marketplace)
- https://www.chrono24.com (Chrono24 watch prices)
- https://www.worthy.com (Worthy auction results)

For COLLECTIBLES/GENERAL:
- https://www.ebay.com/sch (eBay sold listings - add "&LH_Complete=1&LH_Sold=1")
- https://www.liveauctioneers.com (LiveAuctioneers)
- https://www.worthpoint.com (WorthPoint price guide)
- https://www.replacements.com (Replacements for china/crystal)

REFERENCE REQUIREMENTS:
1. Each reference MUST have a real, working URL to a trusted source
2. Reference titles should be specific (e.g., "eBay Sold - Similar 1903 First Edition" not just "eBay")
3. Include at least one auction house or price guide for credibility
4. If exact matches aren't found, cite comparable items and explain the comparison

Users will click these links to verify your valuation, so accuracy is critical!

RARITY SCORING (0-10 scale with one decimal place):
Score the item's rarity and provide 2-4 factors explaining the score.

RARITY SCALE:
- 9.0-10.0: Extremely rare (< 100 known, museum quality, one-of-a-kind)
- 7.0-8.9: Very rare (< 1,000 known, highly sought after, key dates)
- 5.0-6.9: Moderately rare (limited production, growing collector interest)
- 3.0-4.9: Somewhat uncommon (below average availability)
- 0.0-2.9: Common (mass-produced, readily available)

RARITY FACTORS TO CONSIDER:
1. Production/Mintage: How many were originally made?
2. Survival Rate: How many still exist in any condition?
3. Condition Rarity: How rare is THIS specific grade/condition?
4. Key Date/Variety: Is this a special issue, error, or variant?
5. Collector Demand: Current market interest and desirability

For each factor, provide:
- A short label (e.g., "Low Mintage", "High Survival Rate")
- A score (0-10) for that specific factor
- A brief explanation

${metalPriceContext}${collectionContext}`;
    const appraisalTextPart = { text: condition
      ? `User-specified Condition: ${condition}${collectionContext ? '\n\n' + collectionContext : ''}`
      : `Please assess the item's condition from the photos provided.${collectionContext ? '\n\n' + collectionContext : ''}` };
    
    const appraisalResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { role: 'user', parts: [...imageParts, appraisalTextPart] },
      config: {
        systemInstruction: appraisalSystemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    if (!appraisalResponse.text) {
      throw new Error("No text response from AI for appraisal.");
    }
    let appraisalData = JSON.parse(appraisalResponse.text.trim());

    // Validate appraisal to catch face-value errors for collectibles
    appraisalData = validateAppraisal(appraisalData as AppraisalData);

    // Step 1.5: Enhance valuation with real eBay sold data
    let valuationBreakdown: ValuationBreakdown | undefined;
    let ebayComparables: EbayComparable[] | undefined;
    let futureValuePredictions: FutureValuePrediction[] | undefined;

    try {
      // Build search keywords from Gemini's identification
      const searchKeywords = buildSearchKeywords({
        itemName: appraisalData.itemName,
        category: appraisalData.category,
        era: appraisalData.era,
        author: appraisalData.author,
        collectibleDetails: appraisalData.collectibleDetails,
      });

      // Build category-specific aspects for better search
      const aspects = buildCategoryAspects(
        appraisalData.category,
        appraisalData.collectibleDetails
      );

      console.log(`[Appraise API] Searching eBay for: "${searchKeywords}"`);

      // Fetch real market data from eBay
      const ebayData = await getEbayMarketValue({
        keywords: searchKeywords,
        aspects: aspects.length > 0 ? aspects : undefined,
      });

      if (ebayData && ebayData.sampleSize >= 5) {
        // We have sufficient eBay data - use it!
        console.log(`[Appraise API] eBay data found: ${ebayData.sampleSize} results, avg $${ebayData.average.toFixed(2)}`);

        // Store original Gemini prices for comparison
        const geminiPrices = { ...appraisalData.priceRange };

        // Calculate condition modifier from Gemini's assessment
        // Default to 0.85 (Excellent) if no specific condition issues noted
        let conditionModifier = 0.85;
        let conditionNote = '';

        if (appraisalData.collectibleDetails?.gradeEstimate) {
          const grade = appraisalData.collectibleDetails.gradeEstimate.toUpperCase();
          if (grade.includes('MS-6') || grade.includes('MINT')) {
            conditionModifier = 1.0;
            conditionNote = 'Mint/Near Mint condition';
          } else if (grade.includes('MS-') || grade.includes('AU-') || grade.includes('EXCELLENT')) {
            conditionModifier = 0.90;
            conditionNote = 'Excellent condition';
          } else if (grade.includes('VF-') || grade.includes('EF-') || grade.includes('VERY GOOD')) {
            conditionModifier = 0.75;
            conditionNote = 'Very Good condition';
          } else if (grade.includes('F-') || grade.includes('GOOD')) {
            conditionModifier = 0.60;
            conditionNote = 'Good condition';
          } else if (grade.includes('VG-') || grade.includes('FAIR')) {
            conditionModifier = 0.45;
            conditionNote = 'Fair condition';
          } else if (grade.includes('G-') || grade.includes('POOR')) {
            conditionModifier = 0.25;
            conditionNote = 'Poor condition';
          }
        }

        // Use eBay median as base (more reliable than average for outliers)
        const baseMarketValue = ebayData.median > 0 ? ebayData.median : ebayData.average;

        // Apply condition modifier to get adjusted value
        const adjustedValue = baseMarketValue * conditionModifier;

        // Use eBay's range, adjusted for condition
        // Low = eBay low * condition, High = eBay high * condition
        const newPriceLow = Math.round(ebayData.low * conditionModifier);
        const newPriceHigh = Math.round(ebayData.high * conditionModifier);

        // Only override Gemini's prices if eBay data seems reliable
        // (sufficient sample size and prices are in reasonable range)
        if (ebayData.confidence >= 0.2 && newPriceHigh > 0) {
          // Update the price range with real market data
          appraisalData.priceRange = {
            low: Math.max(newPriceLow, 1), // Ensure at least $1
            high: Math.max(newPriceHigh, newPriceLow + 1),
          };

          // Boost confidence if we have good eBay data
          const ebayConfidenceBoost = Math.round(ebayData.confidence * 20); // Up to +20 from eBay
          appraisalData.confidenceScore = Math.min(100,
            (appraisalData.confidenceScore || 50) + ebayConfidenceBoost
          );

          // Add eBay data source to confidence factors
          if (!appraisalData.confidenceFactors) {
            appraisalData.confidenceFactors = [];
          }
          appraisalData.confidenceFactors.unshift({
            factor: 'Real Market Data',
            impact: 'positive',
            detail: `Based on ${ebayData.sampleSize} recent eBay sold listings (avg: $${ebayData.average.toFixed(2)})`,
          });

          console.log(`[Appraise API] Updated prices: $${appraisalData.priceRange.low}-$${appraisalData.priceRange.high} (was $${geminiPrices.low}-$${geminiPrices.high})`);
        }

        // Build valuation breakdown for transparency
        valuationBreakdown = {
          baseMarketValue: Math.round(baseMarketValue),
          source: 'ebay',
          conditionModifier,
          conditionNote: conditionNote || undefined,
          sampleSize: ebayData.sampleSize,
          comparablesUsed: Math.min(ebayData.comparables.length, 5),
          ebayData,
        };

        // Store top comparables for reference
        ebayComparables = ebayData.comparables.slice(0, 5);

        // Update references to include actual eBay comparables
        if (ebayComparables.length > 0 && appraisalData.references) {
          // Add eBay sold listings reference at the top
          const ebayReference = {
            title: `eBay Sold Listings (${ebayData.sampleSize} recent sales)`,
            url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchKeywords)}&LH_Complete=1&LH_Sold=1`,
          };
          appraisalData.references = [ebayReference, ...appraisalData.references.slice(0, 3)];
        }

      } else {
        // Insufficient eBay data - keep Gemini's estimate
        console.log(`[Appraise API] Insufficient eBay data (${ebayData?.sampleSize || 0} results) - using Gemini estimate`);

        valuationBreakdown = {
          baseMarketValue: Math.round((appraisalData.priceRange.low + appraisalData.priceRange.high) / 2),
          source: 'gemini',
          conditionModifier: 1.0,
          sampleSize: 0,
          comparablesUsed: 0,
        };
      }

      // Generate simple future value predictions
      futureValuePredictions = generateFutureValuePredictions(
        appraisalData.category,
        appraisalData.era,
        (appraisalData.priceRange.low + appraisalData.priceRange.high) / 2
      );

    } catch (ebayError) {
      console.error('[Appraise API] eBay lookup failed (non-blocking):', ebayError);
      // Continue with Gemini's estimate - eBay is enhancement only
      valuationBreakdown = {
        baseMarketValue: Math.round((appraisalData.priceRange.low + appraisalData.priceRange.high) / 2),
        source: 'gemini',
        conditionModifier: 1.0,
        sampleSize: 0,
        comparablesUsed: 0,
      };
    }

    // Step 2: Use the original uploaded image (no AI regeneration)
    // We use the first uploaded image as the display image
    // All original images are preserved in imageUrls array
    const imageDataUrl = imageUrls[0];
    const imagePath = imagePaths[0];

    if (!appraisalData) {
      throw new Error("AI response was incomplete.");
    }

    // Step 3: Update user streak if authenticated
    let streakInfo = null;
    if (userId) {
      try {
        // Get current streak data
        const { data: userData } = await supabase
          .from('users')
          .select('current_streak, longest_streak, last_appraisal_date')
          .eq('id', userId)
          .single();

        if (userData) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = today.toISOString().split('T')[0];

          const lastAppraisalDate = userData.last_appraisal_date;
          let currentStreak = userData.current_streak || 0;
          let longestStreak = userData.longest_streak || 0;
          let isNewDay = false;
          let streakIncreased = false;
          let streakBroken = false;

          if (!lastAppraisalDate) {
            // First ever appraisal
            currentStreak = 1;
            isNewDay = true;
            streakIncreased = true;
          } else {
            const lastDate = new Date(lastAppraisalDate);
            lastDate.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff === 0) {
              // Same day
              isNewDay = false;
            } else if (daysDiff === 1) {
              // Yesterday - streak continues!
              currentStreak += 1;
              isNewDay = true;
              streakIncreased = true;
            } else {
              // Streak broken
              streakBroken = currentStreak > 0;
              currentStreak = 1;
              isNewDay = true;
            }
          }

          // Update longest if needed
          if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
          }

          // Save to database
          await supabase
            .from('users')
            .update({
              current_streak: currentStreak,
              longest_streak: longestStreak,
              last_appraisal_date: todayStr,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          streakInfo = {
            currentStreak,
            longestStreak,
            isNewDay,
            streakIncreased,
            streakBroken,
          };
        }
      } catch (streakError) {
        console.error('Error updating streak:', streakError);
        // Don't fail the appraisal if streak update fails
      }

      // SERVER-SIDE INCREMENT / CREDIT CONSUMPTION
      try {
        const { subscriptionService } = await import('@/services/subscriptionService');

        if (willUseCredit) {
          // Consume a paid credit instead of incrementing free count
          const creditResult = await subscriptionService.consumeCredit(userId);
          console.log('[Appraise API] Consumed credit:', creditResult);
        } else {
          // Increment free appraisal count
          const incrementResult = await subscriptionService.incrementAppraisalCount(userId);
          console.log('[Appraise API] Incremented appraisal count:', incrementResult);
        }
      } catch (incrementError) {
        console.error('[Appraise API] Failed to update count/credit (non-blocking):', incrementError);
        // Don't fail the appraisal - the check at the start is the gatekeeper
      }

      // Send push notification for completed appraisal (non-blocking)
      try {
        if (notificationService.isConfigured()) {
          const itemName = appraisalData.name || appraisalData.title || 'item';
          const priceRange = {
            low: appraisalData.low || appraisalData.priceRange?.low || 0,
            high: appraisalData.high || appraisalData.priceRange?.high || 0,
          };
          await notificationService.notifyAppraisalComplete(userId, { itemName, priceRange });
          console.log('[Appraise API] Push notification sent for appraisal');
        }
      } catch (notificationError) {
        console.error('[Appraise API] Failed to send push notification (non-blocking):', notificationError);
        // Don't fail the appraisal if notification fails
      }
    }

    return NextResponse.json({
      appraisalData,
      imageDataUrl,
      imagePath, // Return path if storage was used
      imageUrls, // All uploaded image URLs
      userId: userId || undefined,
      usedStorage: !!imagePath, // Indicate if storage was used
      collectionId: collectionId || undefined,
      collectionName: collectionName || undefined,
      validation: collectionId ? {
        status: appraisalData.validationStatus || 'valid',
        notes: appraisalData.validationNotes || '',
        seriesIdentifier: appraisalData.seriesIdentifier || ''
      } : undefined,
      streakInfo, // Streak data for gamification
      // v2 Hybrid Valuation Engine data
      valuationBreakdown, // How the value was calculated
      ebayComparables, // Actual eBay sold listings used
      futureValuePredictions, // Appreciation forecasts
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error in appraisal API route:', errorMessage);
    console.error('Stack trace:', errorStack);

    // Return more specific error for debugging
    return NextResponse.json({
      error: `Failed to get appraisal from AI. ${errorMessage}`
    }, { status: 500 });
  }
}
