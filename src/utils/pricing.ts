export interface BundlePriceSummary {
  cost: number;
  savings: number;
  avgPerUnit: number;
  tier: string;
}

// South African Rand (R) tiers: R50 x1, R250 x6 (R41.67/unit), R40/unit for 10+.
export function calculateBundlePrice(totalQty: number): BundlePriceSummary {
  if (totalQty === 0) {
    return { cost: 0, savings: 0, avgPerUnit: 0, tier: 'N/A' };
  }

  let cost = 0;
  let tier = '';

  if (totalQty === 1) {
    cost = 50;
    tier = 'Single Shot Trial';
  } else if (totalQty < 6) {
    cost = totalQty * 50;
    tier = 'Standard Tier';
  } else if (totalQty < 10) {
    const extra = totalQty - 6;
    cost = 250 + extra * 41.67;
    tier = 'Tribe Half-Dozen Discount';
  } else {
    cost = totalQty * 40;
    tier = 'Ultimate Pack Bulk Rate';
  }

  const savings = totalQty * 50 - cost;
  const avgPerUnit = cost / totalQty;

  return {
    cost: Math.round(cost),
    savings: Math.round(savings),
    avgPerUnit: Math.round(avgPerUnit * 100) / 100,
    tier,
  };
}
