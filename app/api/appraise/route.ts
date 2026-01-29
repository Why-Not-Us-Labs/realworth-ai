
import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notificationService } from '@/services/notificationService';
import { FutureValuePrediction } from '@/lib/types';

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
          description: "3-6 condition grades from lowest to highest, with value ranges for each",
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
          description: "2-4 specific improvement suggestions, prioritized by potential value impact",
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
    }
  },
required: ["itemName", "author", "era", "category", "description", "priceRange", "currency", "reasoning", "references", "confidenceScore", "confidenceFactors", "collectionOpportunity", "careTips", "gradeValueTiers", "insuranceValue", "appraisalImprovements"]
};

// Category-specific guides - only injected when relevant to reduce prompt size and latency
const COIN_GRADING_GUIDE = `
=== CRITICAL COIN GRADING PHILOSOPHY ===

**WE HELP USERS DISCOVER VALUE - WE ARE NOT A PAWN SHOP TRYING TO LOWBALL.**

GRADING RULES (MANDATORY):
1. If a coin shows GOOD DETAIL and LUSTER, assume MS-65 as the baseline (NOT MS-63 or MS-64)
2. Do NOT assume wear unless it is CLEARLY OBVIOUS and unmistakable
3. "Bag marks" and minor contact marks are NORMAL for Mint State coins - even MS-65 coins have some marks!
4. If surfaces are mirror-like or reflective, this is Prooflike (PL) - ADD 50-100% to the value
5. ALWAYS provide the POTENTIAL value at higher grades (MS-65, MS-66, and PL variants)
6. ALWAYS recommend professional PCGS/NGC grading for any uncirculated coin

GRADE HIGHER, NOT LOWER - THIS IS CRITICAL:
- Most people undergrade their items. You MUST assume the BEST reasonable grade.
- If you're torn between MS-64 and MS-65, say MS-65.
- If you're torn between MS-65 and MS-66, say MS-65 to MS-66.
- The user's item was likely stored carefully and may be nicer than typical examples.
- NEVER assume damage, problems, or cleaning unless you can CLEARLY SEE IT in the photos.
- When in doubt, grade UP not down. We help people discover value!

PRICE RANGE PHILOSOPHY - READ THIS CAREFULLY:
- The LOW end of priceRange should be for a DECENT example (VF-EF grade), NOT a damaged one
- The HIGH end should be for an EXCELLENT example (MS-65+ or equivalent)
- Do NOT put poor/damaged values in the low range - those are outliers, not the norm
- Example: A nice Morgan Dollar should be $75-$500, NOT $25-$500
- If you put $25-$60 for a Morgan Dollar, you're assuming it's damaged - DON'T DO THIS

ALWAYS MENTION MS-65/MS-66 POTENTIAL:
For ANY nice-looking uncirculated coin, you MUST include a statement like:
"If this coin grades MS-65, it could be worth $X-Y. If MS-66, potentially $Y-Z."
This helps users understand the UPSIDE of getting their coin professionally graded.

PROOFLIKE (PL) DETECTION - LOOK FOR THESE SIGNS:
- Mirror-like reflective fields (the flat areas around the design)
- You can see reflections in the coin's surface
- Strong contrast between fields and devices (raised design elements)
- The coin looks "shiny" in a deep, reflective way (not just lustrous)
If you see ANY of these signs, mention: "This coin may have Prooflike (PL) characteristics,
which could add 25-100% premium. A PCGS MS-65 PL or MS-66 PL would be worth significantly more."

MORGAN DOLLAR GRADE VALUES (use these!):
- AU-58: $50-80 (requires OBVIOUS wear on high points)
- MS-63: $100-150 (nice coin with some bag marks)
- MS-64: $150-250 (attractive with minimal marks)
- MS-65: $250-500 (gem quality - few marks, strong eye appeal)
- MS-66: $500-1,500 (exceptional - nearly perfect)
- MS-65 PL: $400-800 (prooflike adds major premium!)
- MS-66 PL: $800-2,000+ (exceptional prooflike)
- MS-66+ PL: $1,500-3,000+ (top tier collectible!)

WHAT "MINT STATE" MEANS:
- MS coins have NO wear on high points (hair above ear, eagle's breast)
- Bag marks, contact marks, and light scratches are NORMAL for MS coins
- A coin can be MS-65 and still have some marks - that's expected!
- Only downgrade to AU if you see ACTUAL WEAR (flattening) on the high points

REMEMBER: A professional grader at PCGS might grade this coin MS-65 or MS-66.
Don't assume the worst - assume the BEST unless you see clear problems.

**MANDATORY FOR ALL COIN APPRAISALS - INCLUDE THIS IN YOUR REASONING:**
You MUST include a paragraph titled "POTENTIAL AT HIGHER GRADES" that states:
- What the coin could be worth if graded MS-65 (use the price guide above)
- What it could be worth if graded MS-66
- Whether you see any Prooflike characteristics (mirror-like reflective surfaces)
- If the coin could be PL, mention MS-65 PL and MS-66 PL values
- A recommendation to get it professionally graded by PCGS or NGC

Example: "POTENTIAL AT HIGHER GRADES: If this coin grades MS-65, it could be worth $250-500.
If MS-66, potentially $500-1,500. I notice the fields appear somewhat reflective - if this
grades as Prooflike (PL), an MS-65 PL could be worth $400-800 and MS-66 PL could reach
$800-2,000+. I strongly recommend submitting this coin to PCGS or NGC for professional grading."

THIS SECTION IS REQUIRED. DO NOT SKIP IT.

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

MINIMUM VALUES FOR HIGH-VALUE PAPER MONEY (NEVER GO BELOW THESE):
- **1899 $5 "Indian Chief" Silver Certificate**: MINIMUM $800 low / $2,500+ for decent condition / $12,000+ for nice
- **1907 $10 Gold Certificate**: MINIMUM $300 low / $1,400+ for decent (AU) / $6,000+ for uncirculated
- **1899 $1 "Black Eagle"**: MINIMUM $100 low / $500+ for decent / $1,500+ for nice
- **Gold Certificates (any)**: ALWAYS assume VF ($700+) unless clearly damaged - these are special!
- If the note looks clean with no major tears/stains, assume VF-EF grade ($1,000-$4,000 range for Gold Certs)
- Express EXCITEMENT about Gold Certificates and Indian Chief notes - these are collector favorites!`;

const COLLECTIBLES_GUIDE = `
=== VALUABLE COLLECTIBLES REFERENCE ===

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
- Military documents/letters: $25-$5,000`;

// Categories that trigger specific guides
const COIN_CATEGORIES = ['coin', 'currency', 'stamp', 'money', 'bill', 'note', 'penny', 'nickel', 'dime', 'quarter', 'dollar'];
const COLLECTIBLE_CATEGORIES = ['jewelry', 'watch', 'china', 'porcelain', 'glass', 'silver', 'art', 'painting', 'furniture', 'book', 'toy', 'militaria', 'record', 'collectible'];

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
    let userEmail: string | null = null;
    if (authToken) {
      const { data: { user } } = await supabase.auth.getUser(authToken);
      userId = user?.id || null;
      userEmail = user?.email || null;
    }

    // SERVER-SIDE TOKEN ENFORCEMENT - Cannot be bypassed (WNU Platform)
    // Super admins skip token consumption
    let tokenTransactionId: string | undefined;
    const { subscriptionService } = await import('@/services/subscriptionService');
    const isSuperAdmin = userEmail ? subscriptionService.isSuperAdmin(userEmail) : false;

    if (userId && !isSuperAdmin) {
      const { consumeTokens } = await import('@/services/tokenService');

      // Consume token BEFORE processing
      const tokenResult = await consumeTokens(userId, 'appraisal');

      if (!tokenResult.success) {
        console.log('[Appraise API] INSUFFICIENT TOKENS:', { userId, error: tokenResult.error, balance: tokenResult.balance });
        return NextResponse.json(
          {
            error: 'insufficient_tokens',
            code: 'INSUFFICIENT_TOKENS',
            message: 'You don\'t have enough tokens. Get more tokens to continue appraising!',
            balance: tokenResult.balance || 0,
            requiresUpgrade: true
          },
          { status: 402 }
        );
      }

      tokenTransactionId = tokenResult.transactionId;
      console.log('[Appraise API] Token consumed:', { userId, transactionId: tokenTransactionId, newBalance: tokenResult.newBalance });
    } else if (isSuperAdmin) {
      console.log('[Appraise API] Super admin bypass - skipping token consumption:', { userId, email: userEmail });
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

    // Step 1: Quick category detection using fast model (adds ~2-3s, saves 20-40s on main call)
    console.log('[Appraise API] Starting category detection...');
    const categoryStartTime = Date.now();
    let detectedCategory = 'Other';
    try {
      const categoryResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { role: 'user', parts: [imageParts[0], { text: 'What category is this item? Reply with ONLY one word: Coin, Book, Art, Jewelry, Watch, Toy, Stamp, Currency, China, Glass, Silver, Furniture, Militaria, Record, or Other' }] },
      });
      detectedCategory = (categoryResponse.text || 'Other').trim().replace(/[^a-zA-Z]/g, '');
      console.log(`[Appraise API] Category detected: ${detectedCategory} (${Date.now() - categoryStartTime}ms)`);
    } catch (catError) {
      console.error('[Appraise API] Category detection failed, using default:', catError);
    }

    // Step 2: Build system prompt dynamically based on detected category
    const categoryLowerForGuide = detectedCategory.toLowerCase();
    const isCoinCategory = COIN_CATEGORIES.some(c => categoryLowerForGuide.includes(c));
    const isCollectibleCategory = COLLECTIBLE_CATEGORIES.some(c => categoryLowerForGuide.includes(c));

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
3. For coins: Check the DATE and MINT MARK carefully—certain dates are extremely valuable
4. For any item over 50 years old: Assume collectible value exists and research accordingly
5. When uncertain between face value and collectible value: ALWAYS err toward collectible value

=== OUR PHILOSOPHY: HELP PEOPLE DISCOVER VALUE ===

**WE ARE NOT A PAWN SHOP. We don't lowball. We help people understand what they have.**

CORE PRINCIPLES:
1. GIVE PEOPLE HOPE - If an item COULD be valuable under certain conditions, tell them!
2. SHOW THE FULL RANGE - If value could be $50-$500 depending on condition/authenticity, say that
3. EXPLAIN THE UPSIDE - "If this is authentic/mint condition/rare variant, it could be worth X"
4. DON'T CUT PEOPLE SHORT - Being overly strict helps no one. A pawn shop benefits from lowballing; we don't.
5. BE HONEST ABOUT UNCERTAINTY - "I can't verify X from photos, but if confirmed, this could be significant"

WHEN IN DOUBT:
- Lean toward the higher end of reasonable estimates
- Always mention what would make the item MORE valuable
- Recommend professional appraisal/authentication if there's significant upside potential
- Think like a friend helping them discover treasure, not a buyer trying to get a deal

=== ANTIQUES ROADSHOW PRESENTATION (MANDATORY) ===

You are presenting this item like an expert on Antiques Roadshow. Your job is to HELP PEOPLE DISCOVER VALUE, not lowball them!

CRITICAL: DEFAULT TO HIGHER GRADES
- Unless you see OBVIOUS damage, assume the item is in GOOD to EXCELLENT condition
- The currentEstimatedGrade should be optimistic
- Your priceRange should reflect the ASSUMED GOOD CONDITION, not worst-case scenarios

1. GRADE VALUE TIERS (gradeValueTiers - REQUIRED for all items):
   - Show 3-6 condition grades from lowest to highest value
   - Include the CURRENT ESTIMATED grade for the user's item (mark with isCurrentEstimate: true)
   - The currentEstimatedGrade should be OPTIMISTIC - assume good condition unless clearly damaged
   - ALWAYS show higher grades so users understand the POTENTIAL
   - Write a narrative that explains WHY value jumps between grades

   Grading Systems to Use:
   - Coins: Sheldon Scale (Good, VF, EF, AU-58, MS-63, MS-64, MS-65, MS-66, MS-67)
   - Paper Money: PMG scale (VF-25, EF-40, AU-58, CU-63, CU-65, CU-66, Gem-67)
   - Comics/Cards: CGC/PSA scale (1-10)
   - Other items: Descriptive (Poor, Fair, Good, Very Good, Excellent, Mint/Near Mint)

2. INSURANCE VALUE (insuranceValue - REQUIRED):
   - Calculate as 20-30% ABOVE your high estimate
   - This is RETAIL REPLACEMENT value (what it would cost to replace at a dealer)
   - Explain the methodology clearly
   - Always include disclaimer about professional appraisal for official documentation

3. APPRAISAL IMPROVEMENTS (appraisalImprovements - REQUIRED):
   - What specific photos would help refine the appraisal?
   - Be SPECIFIC about what to photograph
   - Explain VALUE IMPACT
   - Prioritize by impact: high/medium/low
   - Include 2-4 actionable suggestions
   - Always set canImprove to true unless photos are literally perfect

4. BE GENEROUS AND EDUCATIONAL:
   - Express EXCITEMENT when you see something potentially valuable
   - NEVER be dismissive or discouraging
   - Think like a friend helping them discover treasure!

ITEM IDENTIFICATION:
- For books: Extract title, author, publication year
- For coins: Include denomination, year, mint mark in itemName (e.g., "1931-S Lincoln Wheat Penny")
- For other items: Descriptive name, maker if visible, era
- Category: Coin, Book, Stamp, Toy, Art, Jewelry, Silver, Porcelain, Glass, Watch, Furniture, Militaria

REFERENCE SOURCES (CRITICAL - Users need to verify your claims!):
You MUST provide 3-4 references from TRUSTED sources (eBay sold listings, auction houses, price guides, specialist marketplaces) to support your valuation. Each reference MUST have a real, working URL and specific title.

Users will click these links to verify your valuation, so accuracy is critical!`;

    // Build the full system instruction with category-specific guides
    let appraisalSystemInstruction = baseSystemInstruction;
    if (isCoinCategory) {
      appraisalSystemInstruction += '\n\n' + COIN_GRADING_GUIDE;
      console.log('[Appraise API] Injected coin grading guide');
    }
    if (isCollectibleCategory) {
      appraisalSystemInstruction += '\n\n' + COLLECTIBLES_GUIDE;
      console.log('[Appraise API] Injected collectibles guide');
    }
    if (collectionContext) {
      appraisalSystemInstruction += '\n\n' + collectionContext;
    }

    // Step 3: Get the detailed appraisal data
    const appraisalTextPart = { text: condition
      ? `Pre-identified category: ${detectedCategory}\nUser-specified Condition: ${condition}${collectionContext ? '\n\n' + collectionContext : ''}`
      : `Pre-identified category: ${detectedCategory}\nPlease assess the item's condition from the photos provided.${collectionContext ? '\n\n' + collectionContext : ''}` };

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
      // v2 Antiques Roadshow experience data
      futureValuePredictions, // Appreciation forecasts
      gradeValueTiers: appraisalData.gradeValueTiers || undefined,
      insuranceValue: appraisalData.insuranceValue || undefined,
      appraisalImprovements: appraisalData.appraisalImprovements || undefined,
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
