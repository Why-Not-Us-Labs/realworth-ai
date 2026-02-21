import type {
  SneakerDetails,
  BuyOffer,
  BuyOfferBreakdown,
  BuyOfferRules,
  SneakerConditionGrade,
  FlawSeverity,
  SneakerReleaseType,
} from '@/lib/types';
import type { EbayMarketData } from '@/services/ebayPriceService';

const DEFAULT_RULES: BuyOfferRules = {
  baseMarginPercent: 35,
  conditionModifiers: { DS: 0, VNDS: -3, Excellent: -8, Good: -15, Fair: -25, Beater: -40 },
  flawDeductions: { major: -8, moderate: -4, minor: -1 },
  authThreshold: 70,
  maxOfferAmount: 500,
  minOfferAmount: 10,
  noBoxDeduction: -10,
};

// Release type multipliers applied to market value before margin
const RELEASE_MULTIPLIERS: Record<SneakerReleaseType, number> = {
  general_release: 1.0,
  limited: 1.05,
  collab: 1.08,
  exclusive: 1.10,
};

// Size liquidity modifiers (percentage adjustment)
function getSizeLiquidityModifier(size: string): number {
  const num = parseFloat(size);
  if (isNaN(num)) return 0;
  if (num >= 8 && num <= 12) return 0;
  if (num === 7 || num === 13) return -3;
  if (num === 6 || num === 14) return -7;
  return -12; // outside 6-14
}

/**
 * Resolve market value from eBay data, Gemini estimates, or a hybrid.
 *
 * - eBay confidence >= 0.3 AND sampleSize >= 5 -> use eBay median ('ebay')
 * - eBay sampleSize >= 2 -> hybrid 60% eBay / 40% Gemini ('hybrid')
 * - Otherwise -> Gemini only ('gemini')
 */
export function resolveMarketValue(
  geminiPriceRange: { low: number; high: number },
  ebayData: EbayMarketData | null
): { marketValue: number; source: 'ebay' | 'hybrid' | 'gemini'; ebaySampleSize?: number } {
  const geminiMid = (geminiPriceRange.low + geminiPriceRange.high) / 2;

  if (!ebayData) {
    return { marketValue: geminiMid, source: 'gemini' };
  }

  if (ebayData.confidence >= 0.3 && ebayData.sampleSize >= 5) {
    return { marketValue: ebayData.median, source: 'ebay', ebaySampleSize: ebayData.sampleSize };
  }

  if (ebayData.sampleSize >= 2) {
    const hybrid = ebayData.median * 0.6 + geminiMid * 0.4;
    return { marketValue: hybrid, source: 'hybrid', ebaySampleSize: ebayData.sampleSize };
  }

  return { marketValue: geminiMid, source: 'gemini' };
}

/**
 * Calculate a buy offer from appraisal data + partner rules.
 *
 * Flow:
 * 1. Resolve market value (eBay / hybrid / Gemini)
 * 2. Apply release type multiplier
 * 3. Base offer = market value * (1 - margin%)
 * 4. Condition adjustment = base offer * conditionModifier%
 * 5. Flaw deductions — use Gemini per-flaw priceImpact capped at 3x flat rate
 * 6. Size liquidity modifier
 * 7. Accessory deductions (no box, missing items)
 * 8. Clamp between min/max
 * 9. Flag for review if needed
 */
export function calculateBuyOffer(
  priceRange: { low: number; high: number },
  sneakerDetails: SneakerDetails,
  rules: BuyOfferRules = DEFAULT_RULES,
  ebayData?: EbayMarketData | null
): BuyOffer {
  // 1. Resolve market value
  const { marketValue: rawMarketValue, source, ebaySampleSize } = resolveMarketValue(priceRange, ebayData ?? null);

  // 2. Release type multiplier
  const releaseMultiplier = RELEASE_MULTIPLIERS[sneakerDetails.releaseType] ?? 1.0;
  const marketValue = rawMarketValue * releaseMultiplier;
  const releaseAdjustment = marketValue - rawMarketValue;

  // 3. Base offer after margin
  const baseOffer = marketValue * (1 - rules.baseMarginPercent / 100);

  // 4. Condition adjustment
  const conditionPct = rules.conditionModifiers[sneakerDetails.conditionGrade as SneakerConditionGrade] ?? 0;
  const conditionAdjustment = baseOffer * (conditionPct / 100);

  // 5. Flaw deductions — prefer Gemini per-flaw priceImpact, capped at 3x flat rate
  let flawDeductions = 0;
  for (const flaw of sneakerDetails.flaws) {
    const flatPct = Math.abs(rules.flawDeductions[flaw.severity as FlawSeverity] ?? 0);
    const maxPct = flatPct * 3; // safety cap
    const geminiPct = typeof flaw.priceImpact === 'number' && flaw.priceImpact > 0 ? flaw.priceImpact : flatPct;
    const effectivePct = Math.min(geminiPct, maxPct);
    flawDeductions += baseOffer * (effectivePct / 100) * -1; // negative value
  }

  // 6. Size liquidity modifier
  const sizePct = getSizeLiquidityModifier(sneakerDetails.size);
  const sizeAdjustment = baseOffer * (sizePct / 100);

  // 7. Accessory deductions
  let accessoryDeductions = 0;
  if (!sneakerDetails.hasOriginalBox) {
    accessoryDeductions += baseOffer * (rules.noBoxDeduction / 100);
  }

  // Sum up
  let finalOffer = baseOffer + conditionAdjustment + flawDeductions + sizeAdjustment + accessoryDeductions;

  // 8. Clamp
  finalOffer = Math.max(rules.minOfferAmount, Math.min(rules.maxOfferAmount, finalOffer));
  finalOffer = Math.round(finalOffer * 100) / 100;

  // 9. Review flags
  const reviewReasons: string[] = [];
  if (sneakerDetails.authenticityScore < rules.authThreshold) {
    reviewReasons.push(`Authenticity score ${sneakerDetails.authenticityScore} below threshold ${rules.authThreshold}`);
  }
  if (marketValue > rules.maxOfferAmount * 2) {
    reviewReasons.push(`High market value ($${marketValue.toFixed(0)}) — manager verification recommended`);
  }
  if (finalOffer <= rules.minOfferAmount) {
    reviewReasons.push('Offer at minimum — may not be worth purchasing');
  }

  const breakdown: BuyOfferBreakdown = {
    marketValue: Math.round(marketValue * 100) / 100,
    marketSource: source,
    ebaySampleSize,
    baseOffer: Math.round(baseOffer * 100) / 100,
    conditionAdjustment: Math.round(conditionAdjustment * 100) / 100,
    flawDeductions: Math.round(flawDeductions * 100) / 100,
    releaseAdjustment: Math.round(releaseAdjustment * 100) / 100,
    sizeAdjustment: Math.round(sizeAdjustment * 100) / 100,
    accessoryDeductions: Math.round(accessoryDeductions * 100) / 100,
    finalOffer,
  };

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  return {
    amount: finalOffer,
    breakdown,
    requiresManagerReview: reviewReasons.length > 0,
    reviewReasons,
    expiresAt,
  };
}
