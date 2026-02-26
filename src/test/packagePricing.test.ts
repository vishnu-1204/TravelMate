import { describe, expect, it } from 'vitest';
import {
  inferPricingTier,
  computeDynamicPricing,
  computePopularityScore,
  getValueBadges,
  inferTravelerSegments,
  suggestAffordableAlternatives,
} from '@/lib/packagePricing';

const basePackage = {
  price: 45000,
  budgetType: 'medium' as const,
  season: 'shoulder' as const,
  durationDays: 5,
  peopleCount: 2,
  hotelType: 'comfort' as const,
  affordabilityScore: 65,
  categories: ['domestic'],
  destination: 'Manali',
  rating: 4.2,
  reviews: 85,
};

// ─── inferPricingTier ───────────────────────────────────────────

describe('inferPricingTier', () => {
  it('returns budget for low budget type', () => {
    expect(inferPricingTier('low', 50000)).toBe('budget');
  });

  it('returns budget when price <= 30000', () => {
    expect(inferPricingTier('medium', 25000)).toBe('budget');
  });

  it('returns luxury for premium budget type', () => {
    expect(inferPricingTier('premium', 50000)).toBe('luxury');
  });

  it('returns luxury when price >= 90000', () => {
    expect(inferPricingTier('medium', 95000)).toBe('luxury');
  });

  it('returns standard for mid-range', () => {
    expect(inferPricingTier('medium', 50000)).toBe('standard');
  });
});

// ─── computeDynamicPricing ──────────────────────────────────────

describe('computeDynamicPricing', () => {
  it('returns correct structure', () => {
    const result = computeDynamicPricing(basePackage);
    expect(result).toHaveProperty('finalPricePerPerson');
    expect(result).toHaveProperty('basePricePerPerson');
    expect(result).toHaveProperty('savingsPerPerson');
    expect(result).toHaveProperty('discounts');
    expect(result).toHaveProperty('breakdown');
    expect(result).toHaveProperty('paymentPlans');
    expect(result).toHaveProperty('upgradeOptions');
    expect(result.breakdown.currency).toBe('INR');
  });

  it('enforces a minimum price of 2000', () => {
    const cheapPkg = { ...basePackage, price: 500 };
    const result = computeDynamicPricing(cheapPkg);
    expect(result.finalPricePerPerson).toBeGreaterThanOrEqual(2000);
  });

  it('caps total discount at 35%', () => {
    const offSeasonPkg = {
      ...basePackage,
      season: 'off-season' as const,
      categories: ['educational'],
    };
    // off-season (12%) + possibly early booking + student (8%) + festival could exceed 35
    const result = computeDynamicPricing(offSeasonPkg, { travelers: 12 });
    expect(result.totalDiscountPercent).toBeLessThanOrEqual(35);
  });

  it('applies group discount for large groups', () => {
    const solo = computeDynamicPricing(basePackage, { travelers: 1 });
    const group = computeDynamicPricing(basePackage, { travelers: 10 });
    expect(group.finalPricePerPerson).toBeLessThan(solo.finalPricePerPerson);
  });

  it('includes 3 payment plans', () => {
    const result = computeDynamicPricing(basePackage);
    expect(result.paymentPlans).toHaveLength(3);
    expect(result.paymentPlans[0].kind).toBe('full');
    expect(result.paymentPlans[1].kind).toBe('emi');
  });

  it('savings equals base minus final', () => {
    const result = computeDynamicPricing(basePackage);
    expect(result.savingsPerPerson).toBe(
      result.basePricePerPerson - result.finalPricePerPerson
    );
  });
});

// ─── computePopularityScore ─────────────────────────────────────

describe('computePopularityScore', () => {
  it('returns a positive number', () => {
    expect(computePopularityScore(4.5, 100)).toBeGreaterThan(0);
  });

  it('higher rating gives higher score', () => {
    const low = computePopularityScore(3.0, 50);
    const high = computePopularityScore(5.0, 50);
    expect(high).toBeGreaterThan(low);
  });

  it('more reviews gives higher score', () => {
    const few = computePopularityScore(4.0, 10);
    const many = computePopularityScore(4.0, 1000);
    expect(many).toBeGreaterThan(few);
  });
});

// ─── getValueBadges ─────────────────────────────────────────────

describe('getValueBadges', () => {
  it('bestValue true when affordabilityScore >= 75', () => {
    const badges = getValueBadges({
      pricingTier: 'standard',
      affordabilityScore: 80,
      finalPricePerPerson: 60000,
    });
    expect(badges.bestValue).toBe(true);
  });

  it('mostAffordable true for budget under 28000', () => {
    const badges = getValueBadges({
      pricingTier: 'budget',
      affordabilityScore: 50,
      finalPricePerPerson: 20000,
    });
    expect(badges.mostAffordable).toBe(true);
  });

  it('mostAffordable false for standard tier', () => {
    const badges = getValueBadges({
      pricingTier: 'standard',
      affordabilityScore: 50,
      finalPricePerPerson: 20000,
    });
    expect(badges.mostAffordable).toBe(false);
  });
});

// ─── inferTravelerSegments ──────────────────────────────────────

describe('inferTravelerSegments', () => {
  it('includes students for educational category', () => {
    const pkg = { ...basePackage, categories: ['educational'] };
    expect(inferTravelerSegments(pkg)).toContain('students');
  });

  it('includes groups for group category', () => {
    const pkg = { ...basePackage, categories: ['group'] };
    expect(inferTravelerSegments(pkg)).toContain('groups');
  });

  it('defaults to solo when no matching categories', () => {
    const pkg = { ...basePackage, categories: ['luxury'], affordabilityScore: 40, peopleCount: 1 };
    expect(inferTravelerSegments(pkg)).toContain('solo');
  });
});

// ─── suggestAffordableAlternatives ──────────────────────────────

describe('suggestAffordableAlternatives', () => {
  const packages = [
    { destination: 'Manali', categories: ['domestic'], price: 30000 },
    { destination: 'Goa', categories: ['budget', 'domestic'], price: 15000 },
    { destination: 'Kerala', categories: ['nearby'], price: 20000 },
    { destination: 'Paris', categories: ['international'], price: 120000 },
  ];

  it('returns destinations cheaper than threshold', () => {
    const result = suggestAffordableAlternatives(packages, 'Manali', 25000);
    expect(result).toContain('Goa');
    expect(result).toContain('Kerala');
    expect(result).not.toContain('Paris');
  });

  it('excludes the target destination', () => {
    const result = suggestAffordableAlternatives(packages, 'Goa', 50000);
    expect(result).not.toContain('Goa');
  });

  it('returns empty for no matches', () => {
    const result = suggestAffordableAlternatives(packages, 'Manali', 100);
    expect(result).toEqual([]);
  });

  it('returns at most 3 alternatives', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      destination: `Place${i}`,
      categories: ['budget'],
      price: 10000 + i * 100,
    }));
    const result = suggestAffordableAlternatives(many, 'Target', 100000);
    expect(result.length).toBeLessThanOrEqual(3);
  });
});
