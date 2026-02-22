import type {
  BudgetType,
  DynamicPricing,
  PackageCategory,
  PricingTier,
  SeasonType,
  TravelPackage,
  TravelerSegment,
} from '../types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const inferPricingTier = (budgetType: BudgetType, price: number): PricingTier => {
  if (budgetType === 'low' || price <= 30000) return 'budget';
  if (budgetType === 'premium' || price >= 90000) return 'luxury';
  return 'standard';
};

const travelerMultiplier = (travelers: number) => {
  if (travelers >= 10) return 0.78;
  if (travelers >= 6) return 0.84;
  if (travelers >= 4) return 0.9;
  return 1;
};

const isFestivalSeason = (dateIso: string) => {
  const month = new Date(dateIso).getUTCMonth() + 1;
  return month === 10 || month === 11 || month === 12;
};

const resolvePrimaryDate = (availableDates: string[]) => availableDates[0] || new Date().toISOString().slice(0, 10);

const computeDaysAhead = (dateIso: string) => {
  const ms = new Date(dateIso).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
};

export const inferTravelerSegments = ({
  categories,
  affordabilityScore,
  budgetType,
  peopleCount,
}: {
  categories: PackageCategory[];
  affordabilityScore: number;
  budgetType: BudgetType;
  peopleCount: number;
}): TravelerSegment[] => {
  const segments = new Set<TravelerSegment>();
  if (categories.includes('educational')) segments.add('students');
  if (categories.includes('group')) segments.add('groups');
  if (categories.includes('honeymoon')) segments.add('couples');
  if (categories.includes('domestic') || categories.includes('nearby')) segments.add('families');
  if (!segments.size) segments.add('solo');
  if (affordabilityScore >= 72 || budgetType === 'low') segments.add('students');
  if (peopleCount >= 4) segments.add('groups');
  return Array.from(segments);
};

export const computePopularityScore = (rating: number, reviews: number) => {
  return Math.round(rating * 20 + Math.log10(Math.max(10, reviews)) * 22);
};

export const computeDynamicPricing = ({
  price,
  budgetType,
  season,
  availableDates,
  durationDays,
  peopleCount,
  hotelType,
  categories,
}: {
  price: number;
  budgetType: BudgetType;
  season: SeasonType;
  availableDates: string[];
  durationDays: number;
  peopleCount: number;
  hotelType: 'budget' | 'comfort' | 'premium';
  categories: PackageCategory[];
}): DynamicPricing => {
  const travelDate = resolvePrimaryDate(availableDates);
  const daysAhead = computeDaysAhead(travelDate);

  const seasonalDiscount = season === 'off-season' ? 12 : season === 'shoulder' ? 6 : 0;
  const earlyBookingDiscount = daysAhead >= 60 ? 10 : daysAhead >= 30 ? 6 : 0;
  const groupDiscount = peopleCount >= 8 ? 12 : peopleCount >= 4 ? 7 : 0;
  const studentDiscount = categories.includes('educational') ? 8 : 0;
  const festivalDiscount = isFestivalSeason(travelDate) ? 5 : 0;

  const rawDiscounts = [
    { type: 'seasonal' as const, label: 'Seasonal Offer', percent: seasonalDiscount },
    { type: 'early_booking' as const, label: 'Early Booking', percent: earlyBookingDiscount },
    { type: 'group_booking' as const, label: 'Group Booking', percent: groupDiscount },
    { type: 'student' as const, label: 'Student Offer', percent: studentDiscount },
    { type: 'festival' as const, label: 'Festival Offer', percent: festivalDiscount },
  ].filter((item) => item.percent > 0);

  const scaledBase = Math.round(Math.max(2000, price) * travelerMultiplier(Math.max(1, peopleCount)));
  const totalDiscountPercent = clamp(rawDiscounts.reduce((sum, item) => sum + item.percent, 0), 0, 35);
  const totalDiscountAmount = Math.round((scaledBase * totalDiscountPercent) / 100);
  const finalPricePerPerson = Math.max(2000, scaledBase - totalDiscountAmount);

  const discounts = rawDiscounts.map((item) => ({
    ...item,
    amount: Math.round((scaledBase * item.percent) / 100),
  }));

  const hotelRatio = hotelType === 'premium' ? 0.37 : hotelType === 'comfort' ? 0.32 : 0.28;
  const transportRatio = durationDays <= 3 ? 0.28 : 0.31;
  const foodRatio = 0.14;
  const activitiesRatio = 0.12;
  const taxRatio = 0.1;

  return {
    finalPricePerPerson,
    basePricePerPerson: scaledBase,
    savingsPerPerson: Math.max(scaledBase - finalPricePerPerson, 0),
    totalDiscountPercent,
    discounts,
    breakdown: {
      hotel: Math.round(finalPricePerPerson * hotelRatio),
      transport: Math.round(finalPricePerPerson * transportRatio),
      food: Math.round(finalPricePerPerson * foodRatio),
      activities: Math.round(finalPricePerPerson * activitiesRatio),
      taxes: Math.round(finalPricePerPerson * taxRatio),
      subtotal: finalPricePerPerson,
      totalDiscount: totalDiscountAmount,
      total: finalPricePerPerson,
      currency: 'INR',
    },
    paymentPlans: [
      { kind: 'full', label: 'Pay in full (best price)' },
      { kind: 'emi', months: 3, monthlyAmount: Math.round((finalPricePerPerson * peopleCount) / 3), processingFeePercent: 0, label: '3 month no-cost EMI' },
      { kind: 'emi', months: 6, monthlyAmount: Math.round((finalPricePerPerson * peopleCount * 1.03) / 6), processingFeePercent: 3, label: '6 month flexible EMI' },
    ],
    upgradeOptions: [
      { id: 'hotel-premium', label: 'Upgrade to premium hotel', pricePerPerson: 2800 },
      { id: 'private-transfer', label: 'Private airport transfers', pricePerPerson: 1600 },
    ],
  };
};

export const withPricingFields = (pkg: TravelPackage): TravelPackage => {
  const dynamicPricing = computeDynamicPricing({
    price: pkg.price,
    budgetType: pkg.budgetType,
    season: pkg.season,
    availableDates: pkg.availableDates,
    durationDays: pkg.durationDays,
    peopleCount: pkg.peopleCount,
    hotelType: pkg.hotelType,
    categories: pkg.categories,
  });

  const pricingTier = inferPricingTier(pkg.budgetType, dynamicPricing.finalPricePerPerson);
  const travelerSegments = inferTravelerSegments({
    categories: pkg.categories,
    affordabilityScore: pkg.affordabilityScore,
    budgetType: pkg.budgetType,
    peopleCount: pkg.peopleCount,
  });

  return {
    ...pkg,
    price: dynamicPricing.finalPricePerPerson,
    discount: dynamicPricing.totalDiscountPercent,
    pricingTier,
    travelerSegments,
    dynamicPricing,
    badges: {
      bestValue: pkg.affordabilityScore >= 75 || (pricingTier === 'standard' && dynamicPricing.finalPricePerPerson <= 45000),
      mostAffordable: pricingTier === 'budget' && dynamicPricing.finalPricePerPerson <= 28000,
    },
    popularityScore: computePopularityScore(pkg.rating, pkg.reviews),
    nearbyAlternatives: pkg.nearbyAlternatives || [],
  };
};
