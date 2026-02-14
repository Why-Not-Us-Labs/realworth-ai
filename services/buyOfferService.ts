import type {
  SneakerDetails,
  BuyOffer,
  BuyOfferBreakdown,
  BuyOfferRules,
  SneakerConditionGrade,
  FlawSeverity,
} from '@/lib/types';

const DEFAULT_RULES: BuyOfferRules = {
  baseMarginPercent: 35,
  conditionModifiers: { DS: 0, VNDS: -3, Excellent: -8, Good: -15, Fair: -25, Beater: -40 },
  flawDeductions: { major: -8, moderate: -4, minor: -1 },
  authThreshold: 70,
  maxOfferAmount: 500,
  minOfferAmount: 10,
  noBoxDeduction: -10,
};

/**
 * Calculate a buy offer from appraisal data + partner rules.
 *
 * Flow:
 * 1. Market value = midpoint of price range
 * 2. Base offer = market value * (1 - margin%)
 * 3. Condition adjustment = base offer * conditionModifier%
 * 4. Flaw deductions = sum of flaw severity deductions (% of base)
 * 5. Accessory deductions (no box, missing items)
 * 6. Clamp between min/max
 * 7. Flag for review if needed
 */
export function calculateBuyOffer(
  priceRange: { low: number; high: number },
  sneakerDetails: SneakerDetails,
  rules: BuyOfferRules = DEFAULT_RULES
): BuyOffer {
  // 1. Market value
  const marketValue = (priceRange.low + priceRange.high) / 2;

  // 2. Base offer after margin
  const baseOffer = marketValue * (1 - rules.baseMarginPercent / 100);

  // 3. Condition adjustment
  const conditionPct = rules.conditionModifiers[sneakerDetails.conditionGrade as SneakerConditionGrade] ?? 0;
  const conditionAdjustment = baseOffer * (conditionPct / 100);

  // 4. Flaw deductions (each flaw's severity maps to a % of base offer)
  let flawDeductions = 0;
  for (const flaw of sneakerDetails.flaws) {
    const pct = rules.flawDeductions[flaw.severity as FlawSeverity] ?? 0;
    flawDeductions += baseOffer * (pct / 100);
  }

  // 5. Accessory deductions
  let accessoryDeductions = 0;
  if (!sneakerDetails.hasOriginalBox) {
    accessoryDeductions += baseOffer * (rules.noBoxDeduction / 100);
  }

  // Sum up
  let finalOffer = baseOffer + conditionAdjustment + flawDeductions + accessoryDeductions;

  // 6. Clamp
  finalOffer = Math.max(rules.minOfferAmount, Math.min(rules.maxOfferAmount, finalOffer));
  finalOffer = Math.round(finalOffer * 100) / 100; // round to cents

  // 7. Review flags
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
    baseOffer: Math.round(baseOffer * 100) / 100,
    conditionAdjustment: Math.round(conditionAdjustment * 100) / 100,
    flawDeductions: Math.round(flawDeductions * 100) / 100,
    accessoryDeductions: Math.round(accessoryDeductions * 100) / 100,
    finalOffer,
  };

  // Offer valid for 48 hours
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  return {
    amount: finalOffer,
    breakdown,
    requiresManagerReview: reviewReasons.length > 0,
    reviewReasons,
    expiresAt,
  };
}
