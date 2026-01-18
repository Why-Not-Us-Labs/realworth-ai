/**
 * Metal Price Service
 *
 * Fetches real-time precious metal spot prices for accurate appraisals.
 * Uses metals.dev API with 1-hour caching to avoid rate limits.
 */

export type MetalPrices = {
  silver: number;  // USD per troy ounce
  gold: number;    // USD per troy ounce
  platinum: number; // USD per troy ounce
  palladium: number; // USD per troy ounce
  timestamp: Date;
};

// Cache for metal prices (1 hour TTL)
let cachedPrices: MetalPrices | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Fallback prices (updated periodically as safety net)
// These are used if API fails - better than nothing
const FALLBACK_PRICES: MetalPrices = {
  silver: 90.00,    // Updated Jan 2026
  gold: 2650.00,    // Updated Jan 2026
  platinum: 980.00, // Updated Jan 2026
  palladium: 950.00, // Updated Jan 2026
  timestamp: new Date('2026-01-15'),
};

/**
 * Fetch current precious metal spot prices
 * Uses metals.dev API with caching
 */
export async function getMetalPrices(): Promise<MetalPrices> {
  // Return cached prices if still valid
  if (cachedPrices && Date.now() < cacheExpiry) {
    return cachedPrices;
  }

  try {
    // Try metals.dev API (free tier: 50 requests/day)
    const response = await fetch('https://api.metals.dev/v1/latest?api_key=demo&currency=USD&unit=toz', {
      headers: {
        'Accept': 'application/json',
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Metals API returned ${response.status}`);
    }

    const data = await response.json();

    // metals.dev returns prices in metals object
    const prices: MetalPrices = {
      silver: data.metals?.silver || FALLBACK_PRICES.silver,
      gold: data.metals?.gold || FALLBACK_PRICES.gold,
      platinum: data.metals?.platinum || FALLBACK_PRICES.platinum,
      palladium: data.metals?.palladium || FALLBACK_PRICES.palladium,
      timestamp: new Date(),
    };

    // Cache the result
    cachedPrices = prices;
    cacheExpiry = Date.now() + CACHE_TTL_MS;

    console.log('[MetalPrices] Fetched fresh prices:', {
      silver: `$${prices.silver.toFixed(2)}/oz`,
      gold: `$${prices.gold.toFixed(2)}/oz`,
    });

    return prices;

  } catch (error) {
    console.error('[MetalPrices] Failed to fetch prices, using fallback:', error);

    // Return fallback prices if API fails
    // Still cache them briefly to avoid hammering a failing API
    cachedPrices = FALLBACK_PRICES;
    cacheExpiry = Date.now() + (5 * 60 * 1000); // 5 minute cache for fallback

    return FALLBACK_PRICES;
  }
}

/**
 * Common US coin silver content (troy ounces)
 * Pre-1965 US coins are 90% silver
 */
export const COIN_SILVER_CONTENT: Record<string, number> = {
  // Half Dollars (1964 and earlier, also 1965-1970 40% Kennedy)
  'half_dollar_90': 0.3617,      // 1964 and earlier (90% silver)
  'half_dollar_40': 0.1479,      // 1965-1970 Kennedy (40% silver)

  // Quarters (1964 and earlier)
  'quarter_90': 0.1808,          // 90% silver

  // Dimes (1964 and earlier)
  'dime_90': 0.0723,             // 90% silver

  // Silver Dollars
  'morgan_dollar': 0.7734,       // Morgan/Peace dollars
  'peace_dollar': 0.7734,
  'eisenhower_40': 0.3161,       // 1971-1976 40% silver Ikes

  // American Silver Eagles (1986-present)
  'silver_eagle': 1.0,           // 1 troy oz pure silver
};

/**
 * Common gold coin content (troy ounces of pure gold)
 */
export const COIN_GOLD_CONTENT: Record<string, number> = {
  // American Gold Eagles
  'gold_eagle_1oz': 1.0,
  'gold_eagle_half': 0.5,
  'gold_eagle_quarter': 0.25,
  'gold_eagle_tenth': 0.1,

  // Pre-1933 US Gold
  'double_eagle': 0.9675,        // $20 gold piece
  'eagle': 0.4838,               // $10 gold piece
  'half_eagle': 0.2419,          // $5 gold piece
  'quarter_eagle': 0.1209,       // $2.50 gold piece
  'gold_dollar': 0.04837,        // $1 gold piece

  // Modern Bullion
  'gold_buffalo': 1.0,           // 1 oz pure gold
  'krugerrand': 1.0,             // 1 oz pure gold
  'maple_leaf_gold': 1.0,        // 1 oz pure gold
};

/**
 * Calculate melt value for a coin based on current metal prices
 * Returns null if coin type is unknown
 */
export function calculateCoinMeltValue(
  coinType: string,
  metalPrices: MetalPrices
): { meltValue: number; metal: 'silver' | 'gold'; ozContent: number } | null {
  // Check silver coins first
  const silverOz = COIN_SILVER_CONTENT[coinType];
  if (silverOz) {
    return {
      meltValue: silverOz * metalPrices.silver,
      metal: 'silver',
      ozContent: silverOz,
    };
  }

  // Check gold coins
  const goldOz = COIN_GOLD_CONTENT[coinType];
  if (goldOz) {
    return {
      meltValue: goldOz * metalPrices.gold,
      metal: 'gold',
      ozContent: goldOz,
    };
  }

  return null;
}

/**
 * Format metal prices for injection into AI prompt
 */
export function formatMetalPricesForPrompt(prices: MetalPrices): string {
  return `
CURRENT PRECIOUS METAL SPOT PRICES (as of ${prices.timestamp.toISOString()}):
- Silver: $${prices.silver.toFixed(2)} per troy ounce
- Gold: $${prices.gold.toFixed(2)} per troy ounce
- Platinum: $${prices.platinum.toFixed(2)} per troy ounce
- Palladium: $${prices.palladium.toFixed(2)} per troy ounce

COMMON US COIN MELT VALUES (at current spot prices):
- 1964 Kennedy Half Dollar (90% silver, 0.3617 oz): $${(0.3617 * prices.silver).toFixed(2)}
- Pre-1965 Quarter (90% silver, 0.1808 oz): $${(0.1808 * prices.silver).toFixed(2)}
- Pre-1965 Dime (90% silver, 0.0723 oz): $${(0.0723 * prices.silver).toFixed(2)}
- Morgan/Peace Silver Dollar (0.7734 oz): $${(0.7734 * prices.silver).toFixed(2)}
- American Silver Eagle (1 oz): $${prices.silver.toFixed(2)}
- 1 oz Gold Coin: $${prices.gold.toFixed(2)}

CRITICAL INSTRUCTION FOR PRECIOUS METAL ITEMS:
The price_low value MUST be at least the melt value. This is the absolute floor.
Collectible/numismatic premium is added ON TOP of melt value.
- Heavily circulated = melt value + small premium (5-15%)
- Uncirculated (MS60-63) = melt value + 20-50% premium
- Choice Uncirculated (MS64-65) = melt value + 100-500% premium
- Gem (MS66+) = exponentially higher based on population reports
`.trim();
}
