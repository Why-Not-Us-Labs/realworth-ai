
export interface AppraisalRequest {
  files: File[];
  condition?: string; // Optional - AI will determine from photos if not provided
  collectionId?: string;
}

export interface Reference {
  title: string;
  url: string;
}

export interface ConfidenceFactor {
  factor: string;
  impact: 'positive' | 'neutral' | 'negative';
  detail: string;
}

export interface CollectibleDetails {
  mintMark?: string; // For coins: D, S, O, CC, W, P, or 'none'
  gradeEstimate?: string; // Sheldon scale (MS-65, VF-30) or descriptive
  keyDate?: boolean; // True if known key date or rarity
  certificationRecommended?: boolean; // True if PCGS/NGC grading would add value
  metalContent?: string; // Composition (e.g., '90% silver', 'copper')
  faceValue?: number; // Face/denomination value
  collectiblePremium?: string; // Why this item is worth more than face value
}

export interface CollectionOpportunity {
  isPartOfSet: boolean;
  setName?: string;
  totalItemsInSet?: number;
  thisItemPosition?: string;
  completeSetValueMultiplier?: number;
  completeSetValueRange?: {
    low: number;
    high: number;
  };
  userQuestion?: string;
  photographyTips?: string;
}

export interface RarityFactor {
  factor: string;   // e.g., "Low Mintage", "Key Date", "Condition Rarity"
  score: number;    // 0-10 scale
  detail: string;   // 1-2 sentence explanation
}

export interface AppraisalResult {
  id: string;
  image: string; // Primary/result image (backward compatible)
  images?: string[]; // All images (uploads + result)
  itemName: string;
  author?: string;
  era: string;
  category: string;
  description: string;
  priceRange: {
    low: number;
    high: number;
  };
  currency: string;
  reasoning: string;
  references?: Reference[];
  confidenceScore?: number; // 0-100 confidence rating
  confidenceFactors?: ConfidenceFactor[]; // Factors contributing to confidence
  collectibleDetails?: CollectibleDetails; // Additional details for coins, stamps, currency
  collectionOpportunity?: CollectionOpportunity; // Detected set/collection opportunity
  careTips?: string[]; // Preservation and care recommendations
  rarityScore?: number; // 0-10 scale (e.g., 6.3)
  rarityFactors?: RarityFactor[]; // Factors contributing to rarity score
  futureValuePredictions?: FutureValuePrediction[]; // Future value projections
  timestamp: number;
  isPublic?: boolean; // Whether this treasure is publicly shareable
}

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export type CollectionVisibility = 'private' | 'unlisted' | 'public';
export type ValidationStatus = 'valid' | 'warning' | 'mismatch' | 'duplicate';

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category?: string;
  expectedCount?: number;
  expectedItems?: string[];
  visibility: CollectionVisibility;
  shareToken?: string;
  goalDate?: string;
  createdAt: number;
  updatedAt: number;
  // Computed fields (populated by service)
  itemCount?: number;
  totalValueLow?: number;
  totalValueHigh?: number;
  items?: AppraisalResult[];
}

export interface CollectionItem extends AppraisalResult {
  collectionId?: string;
  seriesIdentifier?: string;
  validationStatus?: ValidationStatus;
  validationNotes?: string;
}

export interface CollectionSummary {
  id: string;
  name: string;
  description?: string;
  category?: string;
  itemCount: number;
  expectedCount?: number;
  completionPercentage: number;
  totalValueLow: number;
  totalValueHigh: number;
  visibility: CollectionVisibility;
  goalDate?: string;
  thumbnailUrl?: string;
}

// ============================================
// v2 Hybrid Valuation Engine Types
// ============================================

/**
 * Comparable item from eBay sold listings
 */
export type EbayComparable = {
  title: string;
  price: number;
  soldDate: string;
  listingType: 'auction' | 'buy_it_now' | 'fixed_price';
  url?: string;
};

/**
 * Market data from eBay API
 */
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

/**
 * Breakdown of how the final value was calculated
 */
export type ValuationBreakdown = {
  baseMarketValue: number;
  source: 'ebay' | 'gemini' | 'hybrid';
  conditionModifier: number; // 0.15-1.0
  conditionNote?: string; // e.g., "Minor scratches noted"
  sampleSize: number;
  comparablesUsed: number;
  ebayData?: EbayMarketData;
};

/**
 * Future value prediction (Antiques Roadshow style)
 */
export type FutureValuePrediction = {
  years: 1 | 5 | 10 | 25;
  probability: number; // 0-100
  multiplierLow: number; // e.g., 1.5 = 1.5x current value
  multiplierHigh: number; // e.g., 3.0 = 3x current value
  reasoning: string;
};

/**
 * Extended appraisal result with v2 valuation data
 */
export type AppraisalResultV2 = AppraisalResult & {
  valuationBreakdown?: ValuationBreakdown;
  futureValuePredictions?: FutureValuePrediction[];
  ebayComparables?: EbayComparable[];
};
