export type PricingTier = 'budget' | 'standard' | 'luxury';

export type TravelerSegment = 'students' | 'families' | 'groups' | 'couples' | 'solo';

export type SeasonalDiscountType = 'seasonal' | 'early_booking' | 'group_booking' | 'student' | 'festival';

export type AppliedDiscount = {
  type: SeasonalDiscountType;
  label: string;
  percent: number;
  amount: number;
};

export type PriceBreakdown = {
  hotel: number;
  transport: number;
  food: number;
  activities: number;
  taxes: number;
  subtotal: number;
  totalDiscount: number;
  total: number;
  currency: 'INR';
};

export type PaymentPlan = {
  kind: 'full' | 'emi';
  months?: 3 | 6 | 9 | 12;
  monthlyAmount?: number;
  processingFeePercent?: number;
  label: string;
};

export type UpgradeOption = {
  id: string;
  label: string;
  pricePerPerson: number;
};

export type DynamicPricing = {
  finalPricePerPerson: number;
  basePricePerPerson: number;
  savingsPerPerson: number;
  totalDiscountPercent: number;
  discounts: AppliedDiscount[];
  breakdown: PriceBreakdown;
  paymentPlans: PaymentPlan[];
  upgradeOptions: UpgradeOption[];
};

type PackagePricingInput = {
  price: number;
  budgetType: 'low' | 'medium' | 'premium';
  season: 'off-season' | 'shoulder' | 'peak';
  availableDates?: string[];
  durationDays: number;
  peopleCount: number;
  hotelType: 'budget' | 'comfort' | 'premium';
  affordabilityScore: number;
  categories: string[];
  destination: string;
  rating: number;
  reviews: number;
};

export type PricingContext = {
  travelers?: number;
  travelerSegment?: TravelerSegment;
  selectedDate?: string;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const inferPricingTier = (budgetType: 'low' | 'medium' | 'premium', price: number): PricingTier => {
  if (budgetType === 'low' || price <= 30000) return 'budget';
  if (budgetType === 'premium' || price >= 90000) return 'luxury';
  return 'standard';
};

const resolvePrimaryDate = (pkg: PackagePricingInput, selectedDate?: string) => {
  if (selectedDate) return selectedDate;
  return pkg.availableDates?.[0] || new Date().toISOString().slice(0, 10);
};

const computeDaysAhead = (dateIso: string) => {
  const today = new Date();
  const target = new Date(dateIso);
  const ms = target.getTime() - today.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
};

const isFestivalSeason = (dateIso: string) => {
  const month = new Date(dateIso).getUTCMonth() + 1;
  return month === 10 || month === 11 || month === 12;
};

const travelerMultiplier = (travelers: number) => {
  if (travelers >= 10) return 0.78;
  if (travelers >= 6) return 0.84;
  if (travelers >= 4) return 0.9;
  return 1;
};

export const computeDynamicPricing = (pkg: PackagePricingInput, context: PricingContext = {}): DynamicPricing => {
  const travelers = Math.max(1, context.travelers || pkg.peopleCount || 2);
  const travelDate = resolvePrimaryDate(pkg, context.selectedDate);
  const daysAhead = computeDaysAhead(travelDate);

  const seasonalDiscount = pkg.season === 'off-season' ? 12 : pkg.season === 'shoulder' ? 6 : 0;
  const earlyBookingDiscount = daysAhead >= 60 ? 10 : daysAhead >= 30 ? 6 : 0;
  const groupDiscount = travelers >= 8 ? 12 : travelers >= 4 ? 7 : 0;
  const studentDiscount = context.travelerSegment === 'students' || pkg.categories.includes('educational') ? 8 : 0;
  const festivalDiscount = isFestivalSeason(travelDate) ? 5 : 0;

  const discounts: AppliedDiscount[] = ([
    { type: 'seasonal', label: 'Seasonal Offer', percent: seasonalDiscount, amount: 0 },
    { type: 'early_booking', label: 'Early Booking', percent: earlyBookingDiscount, amount: 0 },
    { type: 'group_booking', label: 'Group Booking', percent: groupDiscount, amount: 0 },
    { type: 'student', label: 'Student Offer', percent: studentDiscount, amount: 0 },
    { type: 'festival', label: 'Festival Offer', percent: festivalDiscount, amount: 0 },
  ] as const).filter((item) => item.percent > 0) as AppliedDiscount[];

  const basePrice = Math.max(2000, pkg.price);
  const scaledBase = Math.round(basePrice * travelerMultiplier(travelers));
  const totalDiscountPercent = clamp(discounts.reduce((sum, item) => sum + item.percent, 0), 0, 35);
  const totalDiscountAmount = Math.round((scaledBase * totalDiscountPercent) / 100);
  const finalPricePerPerson = Math.max(2000, scaledBase - totalDiscountAmount);

  const discountLines = discounts.map((item) => ({
    ...item,
    amount: Math.round((scaledBase * item.percent) / 100),
  }));

  const hotelRatio = pkg.hotelType === 'premium' ? 0.37 : pkg.hotelType === 'comfort' ? 0.32 : 0.28;
  const transportRatio = pkg.durationDays <= 3 ? 0.28 : 0.31;
  const foodRatio = 0.14;
  const activitiesRatio = 0.12;
  const taxRatio = 0.1;

  const breakdown: PriceBreakdown = {
    hotel: Math.round(finalPricePerPerson * hotelRatio),
    transport: Math.round(finalPricePerPerson * transportRatio),
    food: Math.round(finalPricePerPerson * foodRatio),
    activities: Math.round(finalPricePerPerson * activitiesRatio),
    taxes: Math.round(finalPricePerPerson * taxRatio),
    subtotal: finalPricePerPerson,
    totalDiscount: totalDiscountAmount,
    total: finalPricePerPerson,
    currency: 'INR',
  };

  const emiPrincipal = finalPricePerPerson * travelers;
  const paymentPlans: PaymentPlan[] = [
    { kind: 'full', label: 'Pay in full (best price)' },
    {
      kind: 'emi',
      months: 3,
      monthlyAmount: Math.round(emiPrincipal / 3),
      processingFeePercent: 0,
      label: '3 month no-cost EMI',
    },
    {
      kind: 'emi',
      months: 6,
      monthlyAmount: Math.round((emiPrincipal * 1.03) / 6),
      processingFeePercent: 3,
      label: '6 month flexible EMI',
    },
  ];

  const upgradeOptions: UpgradeOption[] = [
    { id: 'hotel-premium', label: 'Upgrade to premium hotel', pricePerPerson: 2800 },
    { id: 'private-transfer', label: 'Private airport transfers', pricePerPerson: 1600 },
  ];

  return {
    finalPricePerPerson,
    basePricePerPerson: scaledBase,
    savingsPerPerson: Math.max(scaledBase - finalPricePerPerson, 0),
    totalDiscountPercent,
    discounts: discountLines,
    breakdown,
    paymentPlans,
    upgradeOptions,
  };
};

export const inferTravelerSegments = (pkg: PackagePricingInput): TravelerSegment[] => {
  const segments = new Set<TravelerSegment>();

  if (pkg.categories.includes('educational')) segments.add('students');
  if (pkg.categories.includes('group')) segments.add('groups');
  if (pkg.categories.includes('honeymoon')) segments.add('couples');
  if (pkg.categories.includes('domestic') || pkg.categories.includes('nearby') || pkg.categories.includes('south') || pkg.categories.includes('north')) segments.add('families');

  if (!segments.size) segments.add('solo');
  if (pkg.affordabilityScore >= 72 || pkg.budgetType === 'low') segments.add('students');
  if (pkg.peopleCount >= 4) segments.add('groups');

  return Array.from(segments);
};

export const computePopularityScore = (rating: number, reviews: number) => {
  return Math.round(rating * 20 + Math.log10(Math.max(10, reviews)) * 22);
};

export const getValueBadges = ({
  pricingTier,
  affordabilityScore,
  finalPricePerPerson,
}: {
  pricingTier: PricingTier;
  affordabilityScore: number;
  finalPricePerPerson: number;
}) => ({
  bestValue: affordabilityScore >= 75 || (pricingTier === 'standard' && finalPricePerPerson <= 45000),
  mostAffordable: pricingTier === 'budget' && finalPricePerPerson <= 28000,
});

export const suggestAffordableAlternatives = <T extends { destination: string; categories: string[]; price: number }>(
  packages: T[],
  targetDestination: string,
  thresholdPrice: number
): string[] => {
  const normalized = targetDestination.trim().toLowerCase();
  if (!normalized) return [];

  const alternatives = packages
    .filter((item) => item.destination.toLowerCase() !== normalized)
    .filter((item) => item.price <= thresholdPrice)
    .filter((item) => item.categories.includes('nearby') || item.categories.includes('budget') || item.categories.includes('domestic') || item.categories.includes('south') || item.categories.includes('north'))
    .sort((a, b) => a.price - b.price)
    .slice(0, 3)
    .map((item) => item.destination);

  return Array.from(new Set(alternatives));
};
