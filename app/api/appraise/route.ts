
import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notificationService } from '@/services/notificationService';
import { FutureValuePrediction, SneakerDetails, BuyOfferRules } from '@/lib/types';
import { calculateBuyOffer } from '@/services/buyOfferService';
import { getEbayMarketValue, buildSearchKeywords, type EbayMarketData } from '@/services/ebayPriceService';

// App Router config - extend timeout for AI processing
// Requires Vercel Pro plan for > 60 seconds
export const maxDuration = 300;

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
      description: "2-3 reference sources (eBay sold listings, auction houses, price guides) supporting the valuation.",
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
      description: "List of 2-3 factors that contributed to the confidence score, both positive and negative.",
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
      description: "2-3 specific preservation and care tips. Be practical and actionable.",
      items: { type: Type.STRING }
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
    },
    // Antiques Roadshow Experience Fields
    gradeValueTiers: {
      type: Type.OBJECT,
      description: "REQUIRED: Grade-based value breakdown showing what the item would be worth at different condition grades. Like Antiques Roadshow, show the full potential!",
      properties: {
        grades: {
          type: Type.ARRAY,
          description: "3-4 condition grades from lowest to highest, with value ranges for each",
          items: {
            type: Type.OBJECT,
            properties: {
              grade: { type: Type.STRING, description: "Grade name (e.g., 'Good', 'VF', 'MS-63', 'MS-65', 'MS-67')" },
              valueRange: {
                type: Type.OBJECT,
                properties: {
                  low: { type: Type.NUMBER },
                  high: { type: Type.NUMBER }
                },
                required: ["low", "high"]
              },
              description: { type: Type.STRING, description: "Brief description of this grade level (e.g., 'Heavy wear, readable text')" },
              isCurrentEstimate: { type: Type.BOOLEAN, description: "True if this is the estimated grade for the user's item" }
            },
            required: ["grade", "valueRange"]
          }
        },
        currentEstimatedGrade: { type: Type.STRING, description: "The grade you estimate this item to be (e.g., 'MS-65')" },
        gradingNarrative: { type: Type.STRING, description: "Antiques Roadshow style explanation of why grades matter. Explain the VALUE JUMPS between grades! E.g., 'Notice how value jumps from $300 at MS-63 to $6,000 at MS-65? MS-65 is the threshold where serious collectors pay serious money.'" },
        gradingSystemUsed: { type: Type.STRING, description: "The grading system used (e.g., 'Sheldon Scale 1-70', 'CGC 0.5-10', 'Descriptive')" }
      },
      required: ["grades", "currentEstimatedGrade", "gradingNarrative", "gradingSystemUsed"]
    },
    insuranceValue: {
      type: Type.OBJECT,
      description: "REQUIRED: Insurance replacement value recommendation. This should be 20-30% ABOVE the high estimate (retail replacement cost).",
      properties: {
        recommended: { type: Type.NUMBER, description: "Recommended insurance value in dollars (20-30% above your high estimate)" },
        methodology: { type: Type.STRING, description: "Explain the calculation (e.g., 'Retail replacement value: 25% above market high to cover dealer markups and replacement difficulty')" },
        disclaimer: { type: Type.STRING, description: "Always include: 'For official insurance documentation, consult a certified appraiser.'" }
      },
      required: ["recommended", "methodology", "disclaimer"]
    },
    appraisalImprovements: {
      type: Type.OBJECT,
      description: "REQUIRED: Specific suggestions for photos or information that would improve this appraisal's accuracy.",
      properties: {
        suggestions: {
          type: Type.ARRAY,
          description: "2-3 specific improvement suggestions, prioritized by potential value impact",
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: "'photo' or 'info'" },
              description: { type: Type.STRING, description: "Specific suggestion (e.g., 'Close-up of mint mark area below eagle')" },
              impact: { type: Type.STRING, description: "'high', 'medium', or 'low' based on potential value impact" },
              reason: { type: Type.STRING, description: "Why this matters (e.g., 'Could confirm Carson City mint mark, which would increase value 3-5x')" },
              areaOfInterest: { type: Type.STRING, description: "Optional: specific area to photograph (e.g., 'reverse, bottom center')" }
            },
            required: ["type", "description", "impact", "reason"]
          }
        },
        canImprove: { type: Type.BOOLEAN, description: "True if there are meaningful improvements possible" },
        potentialValueIncrease: {
          type: Type.OBJECT,
          description: "Estimated additional value if improvements are provided",
          properties: {
            low: { type: Type.NUMBER },
            high: { type: Type.NUMBER }
          }
        }
      },
      required: ["suggestions", "canImprove"]
    },
    // Sneaker-specific fields (only populated for sneaker appraisals)
    sneakerDetails: {
      type: Type.OBJECT,
      description: "Sneaker-specific details. Only populate when appraising sneakers/athletic shoes.",
      properties: {
        brand: { type: Type.STRING, description: "Brand name (Nike, Jordan, adidas, New Balance, etc.)" },
        model: { type: Type.STRING, description: "Model name (Air Jordan 1, Dunk Low, Yeezy 350, etc.)" },
        colorway: { type: Type.STRING, description: "Official colorway name (Chicago, Bred, University Blue)" },
        styleCode: { type: Type.STRING, description: "Style code from size tag (e.g., DQ8426-100). Use 'unknown' if not visible." },
        size: { type: Type.STRING, description: "US size from tag. Use 'unknown' if not visible." },
        releaseType: { type: Type.STRING, description: "'general_release', 'limited', 'collab', or 'exclusive'" },
        conditionGrade: { type: Type.STRING, description: "'DS', 'VNDS', 'Excellent', 'Good', 'Fair', or 'Beater'" },
        hasOriginalBox: { type: Type.BOOLEAN, description: "Whether the original shoe box is present in photos" },
        hasOriginalAccessories: { type: Type.BOOLEAN, description: "Whether extra laces, hang tags, or other accessories are present" },
        flaws: {
          type: Type.ARRAY,
          description: "List of visible flaws with location, description, severity, and price impact",
          items: {
            type: Type.OBJECT,
            properties: {
              location: { type: Type.STRING, description: "Where on the shoe (toe box, heel, midsole, upper, outsole, tongue, laces)" },
              description: { type: Type.STRING, description: "Description of the flaw" },
              severity: { type: Type.STRING, description: "'major', 'moderate', or 'minor'" },
              priceImpact: { type: Type.NUMBER, description: "Percentage price reduction this flaw causes" }
            },
            required: ["location", "description", "severity", "priceImpact"]
          }
        },
        authenticityScore: { type: Type.NUMBER, description: "Authentication confidence 0-100 based on visible markers" },
        authenticityNotes: { type: Type.STRING, description: "Notes on authentication markers observed or concerns" }
      },
      required: ["brand", "model", "colorway", "styleCode", "size", "releaseType", "conditionGrade", "hasOriginalBox", "hasOriginalAccessories", "flaws", "authenticityScore", "authenticityNotes"]
    }
  },
required: ["itemName", "author", "era", "category", "description", "priceRange", "currency", "reasoning", "references", "confidenceScore", "confidenceFactors", "collectionOpportunity", "careTips", "gradeValueTiers", "insuranceValue", "appraisalImprovements"]
};

// Category-specific guides - only injected when relevant to reduce prompt size and latency
const COIN_GRADING_GUIDE = `
=== COIN GRADING GUIDE ===

GRADING RULES:
1. Good detail + luster = assume MS-65 baseline (not MS-63/64)
2. Don't assume wear unless CLEARLY OBVIOUS
3. Bag marks are NORMAL for MS coins - even MS-65 has some marks
4. Mirror-like/reflective surfaces = Prooflike (PL) - ADD 50-100% premium
5. ALWAYS show potential at MS-65, MS-66, and PL variants
6. ALWAYS recommend PCGS/NGC grading for uncirculated coins
7. When torn between grades, grade UP not down

PRICE RANGE: Low = decent example (VF-EF), High = excellent (MS-65+). Never use damaged values for low end.

MORGAN DOLLAR VALUES: AU-58: $50-80 | MS-63: $100-150 | MS-64: $150-250 | MS-65: $250-500 | MS-66: $500-1,500 | MS-65 PL: $400-800 | MS-66 PL: $800-2,000+

MANDATORY: Include "POTENTIAL AT HIGHER GRADES" in reasoning with MS-65/MS-66/PL values and PCGS/NGC recommendation.

MINT MARKS: D=Denver, S=San Francisco, CC=Carson City (ALWAYS valuable!), O=New Orleans, W=West Point, P/none=Philadelphia

KEY DATES (highest value):
Pennies: 1909-S VDB($800-2K), 1914-D($250-500), 1922 No D($600-1.5K), 1943 Copper($100K+), 1955 DDO($1K-25K)
Nickels: 1918/7-D($1K-5K), 1937-D 3-Leg($500-2K)
Dimes: 1916-D Mercury($1K-10K+)
Quarters: 1932-D($100-300+), 1932-S($100-250+)
Half Dollars: 1921($150-500), 1921-D($200-600)
Morgan Dollars: Any CC($100-500+ min), 1889-CC($500-3K), 1893-S($3K-50K+), 1895 proof($30K-100K+)
Peace Dollars: 1921($100-300), 1928($300-600)

Pre-1965 silver: 90% silver content. 1965-1970 halves: 40% silver.

ERROR COINS: Double Die, Off-Center, Wrong Planchet(1943 copper/1944 steel), Clipped, Die Cracks, Broadstrike

SHELDON SCALE: P-1 to G-6(worn) | VG-8 to F-15 | VF-20 to EF-45 | AU-50 to AU-58 | MS-60 to MS-70(uncirculated) | PR/PF(proof)

PAPER MONEY MINIMUMS: 1899 $5 "Indian Chief": $800+ | 1907 $10 Gold Cert: $300+ | 1899 $1 "Black Eagle": $100+ | Gold Certificates: assume VF($700+) unless clearly damaged`;

const COLLECTIBLES_GUIDE = `
=== COLLECTIBLES REFERENCE ===

JEWELRY: Tiffany(2-10x gold value), Cartier, Van Cleef, Harry Winston premium. Art Deco(1920s-30s), Victorian(1837-1901). Signed > unsigned.
WATCHES: Rolex vintage($2K-100K+), Patek Philippe($5K-500K+), Omega Speedmaster($3K-10K), Cartier Tank($2K-20K)
CHINA: Meissen($100-10K+), Royal Copenhagen($50-500+), Limoges($25-300), Flow Blue($50-500)
GLASS: Tiffany Studios($5K-500K+), Steuben($100-5K), Lalique($100-10K), Depression Glass($10-200), Murano($50-5K)
SILVER: Sterling=melt+20-100%. Tiffany sterling 2-5x melt. Georg Jensen premium.
ART: Hudson River School($5K-500K+), Currier & Ives($100-5K), Audubon($500-50K). Look for signatures.
FURNITURE: Chippendale($1K-100K+), Mid-Century Modern hot market. Stickley, Eames, Herman Miller.
BOOKS: First editions 10-1000x. Signed 2-10x. Dust jacket=90% of value. Pre-1800 almost always valuable.
TOYS: Cast iron pre-1940($100-10K), Early Barbie($500-25K), Star Wars original($20-5K), Baseball cards pre-1970($10-1M+)
MILITARIA: Civil War($100-50K+), WWI/WWII medals($50-5K), Swords pre-1900($200-10K)`;

const SNEAKER_GRADING_GUIDE = `
=== SNEAKER GRADING & AUTHENTICATION GUIDE ===

IDENTIFICATION:
- Brand (Nike, Jordan, adidas, New Balance, etc.)
- Model (Air Jordan 1, Dunk Low, Yeezy 350, 550, etc.)
- Colorway (official name: "Chicago", "Bred", "University Blue")
- Style Code (found on size tag inside shoe, e.g., "DQ8426-100")
- Size (US sizing from tag)

CONDITION GRADES (sneaker-industry standard):
- DS (Deadstock): Brand new, never worn, no flaws. Original packaging intact.
- VNDS (Very Near Deadstock): Tried on/worn once briefly. No visible wear on soles.
- Excellent: Worn 2-5 times. Minimal sole wear, no creasing, no stains.
- Good: Moderate wear. Light creasing, minor sole yellowing, intact upper.
- Fair: Heavy wear visible. Noticeable creasing, toe box damage, sole wear.
- Beater: Significantly worn. Major creasing, stains, separation, or damage.

FLAW ASSESSMENT:
For each flaw, note:
1. Location (toe box, heel, midsole, upper, outsole, tongue, laces)
2. Description (crease, stain, yellowing, separation, discoloration, scuff)
3. Severity: major (structural/very visible), moderate (noticeable), minor (cosmetic only)
4. Price impact percentage (major: 15-30%, moderate: 5-15%, minor: 1-5%)

AUTHENTICATION MARKERS (0-100 confidence score):
- Stitching quality and pattern consistency
- Materials feel and quality (from visible texture)
- Shape and proportions (toe box height, heel shape, midsole thickness)
- Tags and labels (font, placement, sizing format)
- Color accuracy vs retail
- Visible glue work and construction quality
Score: 90-100=Very High, 70-89=High, 50-69=Moderate (recommend in-person check), <50=Suspicious

MARKET CONTEXT:
- Release type: General Release (GR), Limited, Collab, Exclusive
- Size liquidity: Men's 8-12 most liquid; small/large sizes slower
- Platform pricing: StockX, GOAT, eBay for sold comps
- Seasonal factors: Jordan 1s spike during back-to-school and holidays`;

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
 * Returns probability-based appreciation forecasts for 1, 5, 10, 25 years
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

  // Generate predictions for different time horizons (1, 5, 10, 25 years)
  const timeframes: Array<1 | 5 | 10 | 25> = [1, 5, 10, 25];

  return timeframes.map((years) => {
    // Compound growth with uncertainty
    const baseMultiplier = Math.pow(1 + adjustedRate, years);
    // Volatility scales with time - less volatility for shorter periods
    const timeVolatility = rates.volatility * Math.sqrt(years / 10);
    const lowMultiplier = Math.max(0.8, baseMultiplier * (1 - timeVolatility));
    const highMultiplier = baseMultiplier * (1 + timeVolatility);

    // Probability is higher for shorter timeframes (more certainty)
    // 1 year: ~80%, 5 years: ~70%, 10 years: ~60%, 25 years: ~50%
    const baseProbability = 85 - (years * 1.4) - (rates.volatility * 15);
    const probability = Math.round(Math.max(40, Math.min(85, baseProbability)));

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
      multiplierLow: Math.round(lowMultiplier * 100) / 100,
      multiplierHigh: Math.round(highMultiplier * 100) / 100,
      reasoning: reasoning.trim(),
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    // Accept JSON body with image URLs (uploaded directly to Supabase Storage)
    const body = await req.json();
    const { imageUrls, imagePaths, condition, collectionId, partnerId, storeLocation } = body as {
      imageUrls: string[];
      imagePaths: string[];
      condition?: string;
      collectionId?: string;
      partnerId?: string; // Partner mode — skips auth, adds sneaker prompt & buy offer
      storeLocation?: string; // Partner store attribution from QR code
    };

    // ---- Partner config lookup (if partner mode) ----
    let partnerConfig: { buy_offer_rules: BuyOfferRules; partner_name: string } | null = null;
    if (partnerId) {
      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey!, {
        auth: { persistSession: false },
      });
      const { data: pc } = await adminSupabase
        .from('partner_configs')
        .select('buy_offer_rules, partner_name')
        .eq('partner_id', partnerId)
        .eq('is_active', true)
        .single();
      partnerConfig = pc;
      if (!partnerConfig) {
        return NextResponse.json({ error: 'Unknown or inactive partner.' }, { status: 400 });
      }
    }

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

    // --- Parallelize auth/tokens, image fetching, and collection fetch ---

    // Auth + token consumption — SKIP in partner mode (no auth required)
    const authAndTokensPromise = (async () => {
      if (partnerId) {
        console.log(`[Appraise API] Partner mode (${partnerId}) — skipping auth/token consumption`);
        return { userId: null, userEmail: null, tokenTransactionId: undefined, isSuperAdmin: false, insufficientTokens: false, balance: 0 };
      }

      let userId: string | null = null;
      let userEmail: string | null = null;
      let tokenTransactionId: string | undefined;

      if (authToken) {
        const { data: { user } } = await supabase.auth.getUser(authToken);
        userId = user?.id || null;
        userEmail = user?.email || null;
      }

      const { subscriptionService } = await import('@/services/subscriptionService');
      const isSuperAdmin = userEmail ? subscriptionService.isSuperAdmin(userEmail) : false;

      if (userId && !isSuperAdmin) {
        const { consumeTokens } = await import('@/services/tokenService');
        const tokenResult = await consumeTokens(userId, 'appraisal');

        if (!tokenResult.success) {
          console.log('[Appraise API] INSUFFICIENT TOKENS:', { userId, error: tokenResult.error, balance: tokenResult.balance });
          return { userId, userEmail, tokenTransactionId, isSuperAdmin, insufficientTokens: true, balance: tokenResult.balance || 0 };
        }

        tokenTransactionId = tokenResult.transactionId;
        console.log('[Appraise API] Token consumed:', { userId, transactionId: tokenTransactionId, newBalance: tokenResult.newBalance });
      } else if (isSuperAdmin) {
        console.log('[Appraise API] Super admin bypass - skipping token consumption:', { userId, email: userEmail });
      }

      return { userId, userEmail, tokenTransactionId, isSuperAdmin, insufficientTokens: false, balance: 0 };
    })();

    // Image fetching (runs in parallel with auth)
    const imagePartsPromise = Promise.all(imageUrls.map(async (url) => {
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

    // Collection fetch (runs in parallel - needs auth result for userId, but we start it optimistically)
    const collectionPromise = (async () => {
      if (!collectionId || !authToken) return { collectionContext: '', collectionName: '' };
      // We need userId, so await auth first for this path
      const authResult = await authAndTokensPromise;
      if (!authResult.userId) return { collectionContext: '', collectionName: '' };

      const { data: collection } = await supabase
        .from('collections')
        .select('name, description, category, expected_items')
        .eq('id', collectionId)
        .eq('user_id', authResult.userId)
        .single();

      if (!collection) return { collectionContext: '', collectionName: '' };

      const existingItems = collection.expected_items || [];
      return {
        collectionName: collection.name,
        collectionContext: `
IMPORTANT - Collection Validation:
This item is being added to a collection called "${collection.name}".
${collection.description ? `Collection description: ${collection.description}` : ''}
${collection.category ? `Collection category: ${collection.category}` : ''}
${existingItems.length > 0 ? `Expected items in collection: ${existingItems.join(', ')}` : ''}

You must also provide validation feedback:
- If this item clearly belongs to this collection, set validationStatus to "valid"
- If this item might belong but has issues (wrong edition, condition mismatch), set validationStatus to "warning" with explanation
- If this item does NOT belong to this collection (wrong series, different author), set validationStatus to "mismatch" with explanation
- Identify the item's position in the series if applicable (e.g., "Book 3", "1942 Penny")`,
      };
    })();

    // Await all parallel work
    const [authResult, imageParts, collectionResult] = await Promise.all([
      authAndTokensPromise,
      imagePartsPromise,
      collectionPromise,
    ]);

    const { userId, userEmail, isSuperAdmin } = authResult;
    let tokenTransactionId = authResult.tokenTransactionId;
    const { collectionContext, collectionName } = collectionResult;

    // Check if tokens were insufficient (early return after parallel work completes)
    if (authResult.insufficientTokens) {
      return NextResponse.json(
        {
          error: 'insufficient_tokens',
          code: 'INSUFFICIENT_TOKENS',
          message: 'You don\'t have enough tokens. Get more tokens to continue appraising!',
          balance: authResult.balance,
          requiresUpgrade: true
        },
        { status: 402 }
      );
    }

    // Always include both guides - saves a full Gemini round-trip (~2-3s)
    // The extra ~6K input tokens cost ~$0.005 and are negligible vs the latency savings

    const baseSystemInstruction = `You are a senior appraiser at RealWorth.ai, trained in the tradition of the world's finest auction houses and the legendary experts from Antiques Roadshow. You bring decades of combined expertise from Christie's, Sotheby's, Heritage Auctions, and specialty dealers.

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
3. For coins: Check DATE and MINT MARK carefully—certain dates are extremely valuable
4. For items over 50 years old: Assume collectible value exists
5. When uncertain: ALWAYS err toward collectible value, show the full range, explain upside
6. Lean toward higher end of reasonable estimates. Recommend professional appraisal when significant upside exists
7. Be honest about uncertainty but frame it positively ("if confirmed, this could be significant")

=== PRESENTATION STYLE ===

Default to HIGHER grades unless you see OBVIOUS damage. Be optimistic and educational.

REQUIRED FIELDS:
1. gradeValueTiers: Show 3-4 condition grades with value ranges. Mark current estimate with isCurrentEstimate:true. Explain WHY value jumps between grades.
   Grading: Coins=Sheldon Scale, Paper Money=PMG, Comics/Cards=CGC/PSA, Other=Descriptive(Poor-Mint)
2. insuranceValue: 20-30% above high estimate (retail replacement cost). Include disclaimer.
3. appraisalImprovements: 2-3 specific photo/info suggestions with value impact. Set canImprove=true.

ITEM IDENTIFICATION:
- For books: Extract title, author, publication year
- For coins: Include denomination, year, mint mark in itemName (e.g., "1931-S Lincoln Wheat Penny")
- For other items: Descriptive name, maker if visible, era
- Category: Coin, Book, Stamp, Toy, Art, Jewelry, Silver, Porcelain, Glass, Watch, Furniture, Militaria

REFERENCE SOURCES: Provide 2-3 references from trusted sources (eBay sold listings, auction houses, price guides) with real URLs.`;

    // Always include both guides to avoid category pre-detection latency
    let appraisalSystemInstruction = baseSystemInstruction + '\n\n' + COIN_GRADING_GUIDE + '\n\n' + COLLECTIBLES_GUIDE;
    if (partnerId) {
      appraisalSystemInstruction += '\n\n' + SNEAKER_GRADING_GUIDE;
    }
    if (collectionContext) {
      appraisalSystemInstruction += '\n\n' + collectionContext;
    }

    // Build the user prompt for the main appraisal
    let promptText = '';
    if (partnerId) {
      // Partner mode: sneaker-focused prompt
      promptText = `IMPORTANT: This is a SNEAKER appraisal for a buy/sell partner. You MUST populate the sneakerDetails field with full sneaker-specific data including brand, model, colorway, style code, size, condition grade, flaws, and authenticity score. Set category to "Sneaker".`;
      if (condition) promptText += `\nUser-specified condition: ${condition}`;
    } else if (condition) {
      promptText = `User-specified Condition: ${condition}`;
    } else {
      promptText = 'Please assess the item\'s condition from the photos provided.';
    }
    if (collectionContext) promptText += '\n\n' + collectionContext;
    const appraisalTextPart = { text: promptText };

    console.log(`[Appraise API] Starting main appraisal (prompt size: ~${Math.round(appraisalSystemInstruction.length / 4)} tokens)...`);
    const appraisalStartTime = Date.now();
    const appraisalResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { role: 'user', parts: [...imageParts, appraisalTextPart] },
      config: {
        systemInstruction: appraisalSystemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });
    console.log(`[Appraise API] Main appraisal completed (${Date.now() - appraisalStartTime}ms)`);

    if (!appraisalResponse.text) {
      throw new Error("No text response from AI for appraisal.");
    }
    let appraisalData = JSON.parse(appraisalResponse.text.trim());

    // Validate appraisal to catch face-value errors for collectibles
    appraisalData = validateAppraisal(appraisalData as AppraisalData);

// Ensure insurance value is always present (fallback calculation)
    if (!appraisalData.insuranceValue) {
      appraisalData.insuranceValue = {
        recommended: Math.round(appraisalData.priceRange.high * 1.25),
        methodology: 'Retail replacement value: 25% above market high to cover dealer markups and replacement difficulty',
        disclaimer: 'For official insurance documentation, consult a certified appraiser.'
      };
    }

    // Ensure appraisal improvements has a default if not provided
    if (!appraisalData.appraisalImprovements) {
      appraisalData.appraisalImprovements = {
        suggestions: [{
          type: 'photo',
          description: 'Additional angles or close-up shots',
          impact: 'medium',
          reason: 'More photos can help confirm condition and reveal details that affect value'
        }],
        canImprove: true
      };
    }

    // Generate future value predictions
    const futureValuePredictions = generateFutureValuePredictions(
      appraisalData.category,
      appraisalData.era,
      (appraisalData.priceRange.low + appraisalData.priceRange.high) / 2
    );

    // Use the first uploaded image directly (skip AI image regeneration to avoid timeout)
    // The image regeneration step was taking 30-60+ seconds and causing 504 timeouts
    // when combined with the appraisal analysis (which also takes 30-60+ seconds)
    const imageDataUrl = imageUrls[0];
    const imagePath = imagePaths?.[0];

    // Step 4: Update user streak if authenticated
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

      // Token was already consumed at the start - no increment needed in WNU Platform
      // The tokenTransactionId can be stored with the appraisal record for auditing

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

    // ---- Partner mode: compute buy offer + save to DB ----
    let buyOfferResult = null;
    let sneakerDetailsResult: SneakerDetails | null = null;
    let partnerAppraisalId: string | undefined;
    let ebayMarketData: EbayMarketData | null = null;

    if (partnerId && partnerConfig && appraisalData.sneakerDetails) {
      sneakerDetailsResult = appraisalData.sneakerDetails as SneakerDetails;

      // Fetch eBay sold data for real market comps
      try {
        const keywords = buildSearchKeywords({
          itemName: appraisalData.itemName,
          category: appraisalData.category,
          sneakerDetails: sneakerDetailsResult,
        });
        console.log(`[Appraise API] eBay lookup for partner: "${keywords}"`);
        ebayMarketData = await getEbayMarketValue({
          keywords,
          categoryId: '93427', // Athletic Shoes
          maxResults: 120,
          removeOutliers: true,
        });
        if (ebayMarketData) {
          console.log(`[Appraise API] eBay: ${ebayMarketData.sampleSize} results, median $${ebayMarketData.median.toFixed(2)}, confidence ${ebayMarketData.confidence.toFixed(2)}`);
        }
      } catch (ebayError) {
        console.error('[Appraise API] eBay lookup failed (non-blocking):', ebayError);
      }

      buyOfferResult = calculateBuyOffer(
        appraisalData.priceRange,
        sneakerDetailsResult,
        partnerConfig.buy_offer_rules,
        ebayMarketData
      );
      console.log(`[Appraise API] Partner buy offer: $${buyOfferResult.amount} (source: ${buyOfferResult.breakdown.marketSource}, review: ${buyOfferResult.requiresManagerReview})`);

      // Save partner appraisal to DB (admin client to bypass RLS since no user auth)
      partnerAppraisalId = crypto.randomUUID();
      try {
        const adminSupabase = createClient(supabaseUrl, supabaseServiceKey!, {
          auth: { persistSession: false },
        });
        await adminSupabase.from('rw_appraisals').insert({
          id: partnerAppraisalId,
          item_name: appraisalData.itemName,
          author: appraisalData.author || null,
          era: appraisalData.era || null,
          category: appraisalData.category,
          description: appraisalData.description || null,
          price_low: appraisalData.priceRange.low,
          price_high: appraisalData.priceRange.high,
          currency: appraisalData.currency || 'USD',
          confidence_score: appraisalData.confidenceScore || null,
          reasoning: appraisalData.reasoning || null,
          references: appraisalData.references || [],
          image_urls: imageUrls,
          input_images: imageUrls,
          status: 'complete',
          is_public: true,
          partner_id: partnerId,
          sneaker_details: sneakerDetailsResult,
          buy_offer: buyOfferResult,
          buy_offer_status: buyOfferResult.requiresManagerReview ? 'review' : 'pending',
          ...(storeLocation && { source_store: storeLocation }),
          ...(ebayMarketData && { ebay_market_data: ebayMarketData }),
        });
        console.log(`[Appraise API] Partner appraisal saved to DB (id: ${partnerAppraisalId})`);
      } catch (dbError) {
        console.error('[Appraise API] Failed to save partner appraisal (non-blocking):', dbError);
      }
    }

    return NextResponse.json({
      appraisalData,
      imageDataUrl,
      imagePath,
      imageUrls,
      userId: userId || undefined,
      usedStorage: !!imagePath,
      collectionId: collectionId || undefined,
      collectionName: collectionName || undefined,
      validation: collectionId ? {
        status: appraisalData.validationStatus || 'valid',
        notes: appraisalData.validationNotes || '',
        seriesIdentifier: appraisalData.seriesIdentifier || ''
      } : undefined,
      streakInfo,
      futureValuePredictions,
      gradeValueTiers: appraisalData.gradeValueTiers || undefined,
      insuranceValue: appraisalData.insuranceValue || undefined,
      appraisalImprovements: appraisalData.appraisalImprovements || undefined,
      // Partner-specific fields
      appraisalId: partnerId ? partnerAppraisalId : undefined,
      sneakerDetails: sneakerDetailsResult || undefined,
      buyOffer: buyOfferResult || undefined,
      ebayMarketData: ebayMarketData || undefined,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error in appraisal API route:', errorMessage);
    console.error('Stack trace:', errorStack);

    // Refund token if appraisal failed after consumption (WNU Platform)
    // Note: We need to track if token was consumed - this is handled by checking userId
    // In production, you might want to pass tokenTransactionId to error handling
    // For now, we'll attempt a refund for authenticated users on AI errors
    try {
      const authHeader = req.headers.get('authorization');
      const authToken = authHeader?.replace('Bearer ', '');
      if (authToken) {
        const supabase = createAuthenticatedClient(authToken);
        const { data: { user } } = await supabase.auth.getUser(authToken);
        if (user?.id) {
          const { grantTokens } = await import('@/services/tokenService');
          await grantTokens(user.id, 1, 'refund', 'Appraisal failed - automatic refund');
          console.log('[Appraise API] Token refunded due to error');
        }
      }
    } catch (refundError) {
      console.error('[Appraise API] Failed to refund token:', refundError);
    }

    // Return more specific error for debugging
    return NextResponse.json({
      error: `Failed to get appraisal from AI. ${errorMessage}`
    }, { status: 500 });
  }
}
