/**
 * eBay Average Selling Price Service
 *
 * Integrates with the eBay Average Selling Price API via RapidAPI
 * to fetch real sold listing data for accurate market valuations.
 *
 * Includes Supabase-based caching to minimize API costs (48-hour TTL).
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

// Types for eBay API responses and our internal data
export type EbayComparable = {
  title: string;
  price: number;
  soldDate: string;
  listingType: 'auction' | 'buy_it_now' | 'fixed_price';
  url?: string;
};

export type EbayMarketData = {
  average: number;
  median: number;
  low: number;
  high: number;
  sampleSize: number;
  source: 'ebay';
  comparables: EbayComparable[];
  confidence: number; // 0-1 based on sample size
  cachedAt?: string;
};

export type EbaySearchAspect = {
  name: string;
  value: string;
};

export type EbaySearchParams = {
  keywords: string;
  excludedKeywords?: string;
  maxResults?: number;
  removeOutliers?: boolean;
  aspects?: EbaySearchAspect[];
  categoryId?: string;
};

// API Configuration
const EBAY_API_URL = 'https://ebay-average-selling-price.p.rapidapi.com/findCompletedItems';
const RAPIDAPI_HOST = 'ebay-average-selling-price.p.rapidapi.com';
const CACHE_TTL_HOURS = 48;
const MIN_CONFIDENCE_TO_CACHE = 0.3; // Only cache if we have at least 30% confidence (15+ results)

/**
 * Generate a cache key from search parameters
 */
function generateCacheKey(params: EbaySearchParams): string {
  const normalized = {
    keywords: params.keywords.toLowerCase().trim(),
    aspects: params.aspects?.sort((a, b) => a.name.localeCompare(b.name)) || [],
    categoryId: params.categoryId || '',
  };
  const data = JSON.stringify(normalized);
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Calculate confidence score based on sample size
 * 50+ results = 100% confidence
 */
function calculateConfidence(sampleSize: number): number {
  return Math.min(1.0, sampleSize / 50);
}

/**
 * Default excluded keywords to filter out damaged/bulk items
 */
const DEFAULT_EXCLUDED_KEYWORDS = 'broken damaged parts lot bulk junk repair as-is for-parts';

/**
 * Check cache for existing eBay data
 */
async function checkCache(cacheKey: string): Promise<EbayMarketData | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('price_cache')
      .select('ebay_data, created_at, expires_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    const ebayData = data.ebay_data as EbayMarketData;
    return {
      ...ebayData,
      cachedAt: data.created_at,
    };
  } catch {
    return null;
  }
}

/**
 * Store eBay data in cache
 */
async function storeInCache(cacheKey: string, keywords: string, category: string | undefined, ebayData: EbayMarketData): Promise<void> {
  // Only cache if confidence is high enough
  if (ebayData.confidence < MIN_CONFIDENCE_TO_CACHE) {
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

    await supabase
      .from('price_cache')
      .upsert({
        cache_key: cacheKey,
        keywords,
        category: category || null,
        ebay_data: ebayData,
        confidence: ebayData.confidence,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'cache_key',
      });
  } catch (error) {
    console.error('Failed to store eBay data in cache:', error);
    // Don't throw - caching failure shouldn't break the appraisal
  }
}

/**
 * Fetch market value from eBay API
 */
export async function getEbayMarketValue(params: EbaySearchParams): Promise<EbayMarketData | null> {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    console.warn('RAPIDAPI_KEY not configured - skipping eBay price lookup');
    return null;
  }

  const cacheKey = generateCacheKey(params);

  // Check cache first
  const cachedData = await checkCache(cacheKey);
  if (cachedData) {
    console.log(`eBay cache hit for: ${params.keywords}`);
    return cachedData;
  }

  // Build request payload
  const payload: Record<string, string | EbaySearchAspect[]> = {
    keywords: params.keywords,
    excluded_keywords: params.excludedKeywords || DEFAULT_EXCLUDED_KEYWORDS,
    max_search_results: String(params.maxResults || 120),
    remove_outliers: String(params.removeOutliers !== false),
  };

  if (params.aspects && params.aspects.length > 0) {
    payload.aspects = params.aspects;
  }

  if (params.categoryId) {
    payload.category_id = params.categoryId;
  }

  try {
    const response = await fetch(EBAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`eBay API error (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();

    // Parse response
    const sampleSize = data.total_results || 0;
    const confidence = calculateConfidence(sampleSize);

    // Extract comparable listings
    const comparables: EbayComparable[] = (data.results || []).slice(0, 10).map((item: Record<string, unknown>) => ({
      title: item.title as string || '',
      price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0,
      soldDate: item.sold_date as string || item.endTime as string || '',
      listingType: (item.listing_type as string || 'auction') as 'auction' | 'buy_it_now' | 'fixed_price',
      url: item.url as string || item.viewItemURL as string || undefined,
    }));

    const ebayData: EbayMarketData = {
      average: data.average_price || 0,
      median: data.median_price || 0,
      low: data.price_range?.min || 0,
      high: data.price_range?.max || 0,
      sampleSize,
      source: 'ebay',
      comparables,
      confidence,
    };

    // Store in cache
    await storeInCache(cacheKey, params.keywords, params.categoryId, ebayData);

    console.log(`eBay API: Found ${sampleSize} results for "${params.keywords}" (avg: $${ebayData.average.toFixed(2)})`);

    return ebayData;
  } catch (error) {
    console.error('eBay API fetch error:', error);
    return null;
  }
}

/**
 * Build search keywords from Gemini appraisal data
 * Extracts the most relevant terms for eBay search
 *
 * IMPORTANT: Keep keywords simple and broad to maximize results.
 * eBay search works best with 3-6 key terms, not full descriptions.
 */
export function buildSearchKeywords(appraisalData: {
  itemName: string;
  category?: string;
  era?: string;
  author?: string;
  collectibleDetails?: {
    mintMark?: string;
    gradeEstimate?: string;
  };
  sneakerDetails?: {
    brand?: string;
    model?: string;
    colorway?: string;
    styleCode?: string;
  };
}): string {
  const parts: string[] = [];
  const category = appraisalData.category?.toLowerCase() || '';

  // Clean the item name - remove parenthetical notes and simplify
  let cleanName = appraisalData.itemName
    .replace(/\([^)]*\)/g, '') // Remove parenthetical text like "(Penny)"
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();

  // For sneakers: style code is the most specific eBay search term
  if (category === 'sneaker' && appraisalData.sneakerDetails) {
    const sd = appraisalData.sneakerDetails;
    if (sd.styleCode && sd.styleCode !== 'unknown') {
      // Style code alone is very precise on eBay (e.g., "DQ8426-100")
      parts.push(sd.styleCode);
    } else {
      // Fallback: brand + model + colorway
      if (sd.brand) parts.push(sd.brand);
      if (sd.model) parts.push(sd.model);
      if (sd.colorway) parts.push(sd.colorway);
    }

  } else if (category === 'coin') {
    // Extract year from item name or era
    const yearMatch = cleanName.match(/\b(1[789]\d{2}|20[0-2]\d)\b/) ||
                      appraisalData.era?.match(/\b(1[789]\d{2}|20[0-2]\d)\b/);

    // Build simple coin search: "1948 Irish Penny" or "1948 Ireland Pingin"
    if (yearMatch) {
      parts.push(yearMatch[0]);
    }

    // Extract country/type keywords (first 2-3 words after year removed)
    const nameWithoutYear = cleanName.replace(/\b(1[789]\d{2}|20[0-2]\d)\b/, '').trim();
    const importantWords = nameWithoutYear.split(' ').slice(0, 3).filter(w => w.length > 1);
    parts.push(...importantWords);

  } else if (category === 'book') {
    // For books: title + author
    parts.push(cleanName);
    if (appraisalData.author && appraisalData.author !== 'N/A' && appraisalData.author.length < 50) {
      // Only include author name, not long descriptions
      const authorName = appraisalData.author.split(/[,(]/)[0].trim();
      if (authorName && !cleanName.toLowerCase().includes(authorName.toLowerCase())) {
        parts.push(authorName);
      }
    }

  } else {
    // For other categories: just use cleaned item name
    parts.push(cleanName);

    // Add era/year if not already included
    if (appraisalData.era && !cleanName.includes(appraisalData.era)) {
      const yearMatch = appraisalData.era.match(/\b(1[789]\d{2}|20[0-2]\d)\b/);
      if (yearMatch && !cleanName.includes(yearMatch[0])) {
        parts.push(yearMatch[0]);
      }
    }
  }

  // Join and limit total length to avoid over-specific searches
  const result = parts.join(' ').substring(0, 80).trim();

  return result;
}

/**
 * Build aspects (filters) based on category
 */
export function buildCategoryAspects(category: string, details?: {
  gradeEstimate?: string;
  mintMark?: string;
}): EbaySearchAspect[] {
  const aspects: EbaySearchAspect[] = [];

  if (category === 'Coin' && details) {
    if (details.gradeEstimate) {
      // For certified coins
      if (details.gradeEstimate.startsWith('MS') || details.gradeEstimate.startsWith('PR')) {
        aspects.push({ name: 'Certification', value: 'PCGS' });
        aspects.push({ name: 'Grade', value: details.gradeEstimate });
      }
    }
  }

  // Add more category-specific aspects as needed

  return aspects;
}

/**
 * Clean up expired cache entries (call periodically)
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('price_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Failed to cleanup expired cache:', error);
      return 0;
    }

    return data?.length || 0;
  } catch {
    return 0;
  }
}
