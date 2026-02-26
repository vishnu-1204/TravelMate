export const PACKAGE_CATEGORIES = [
  'international',
  'domestic',
  'nearby',
  'budget',
  'honeymoon',
  'group',
  'educational',
] as const;

export type PackageCategory = (typeof PACKAGE_CATEGORIES)[number];

export type GroupDeparture = {
  date: string;
  maxCapacity: number;
  currentBookings: number;
};

export type PackageItinerary = {
  days: { day: number; title: string; activities: string[] }[];
  nights: { night: number; accommodation: string; meals: string }[];
};

export type BudgetType = 'low' | 'medium' | 'premium';
export type HotelType = 'budget' | 'comfort' | 'premium';
export type TransportMode = 'public' | 'shared' | 'flight';
export type SeasonType = 'off-season' | 'shoulder' | 'peak';
export type PricingTier = 'budget' | 'standard' | 'luxury';
export type TravelerSegment = 'students' | 'families' | 'groups' | 'couples' | 'solo';

export type AppliedDiscount = {
  type: 'seasonal' | 'early_booking' | 'group_booking' | 'student' | 'festival';
  label: string;
  percent: number;
  amount: number;
};

export type DynamicPricing = {
  finalPricePerPerson: number;
  basePricePerPerson: number;
  savingsPerPerson: number;
  totalDiscountPercent: number;
  discounts: AppliedDiscount[];
  breakdown: {
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
  paymentPlans: {
    kind: 'full' | 'emi';
    months?: 3 | 6 | 9 | 12;
    monthlyAmount?: number;
    processingFeePercent?: number;
    label: string;
  }[];
  upgradeOptions: { id: string; label: string; pricePerPerson: number }[];
};

export type TravelPackage = {
  id: string;
  packageId: string;
  source: 'amadeus';
  category: PackageCategory;
  categories: PackageCategory[];
  categoryLabel: string;
  country: string;
  title: string;
  destination: string;
  location: string;
  duration: string;
  durationDays: number;
  price: number;
  discount: number;
  rating: number;
  reviews: number;
  shortDescription: string;
  inclusions: string[];
  exclusions: string[];
  imageUrl: string;
  imageAlt: string;
  imageSource: "pexels" | "unsplash" | "fallback" | "admin";
  availableDates: string[];
  image: string;
  description: string;
  highlights: string[];
  included: string[];
  excluded: string[];
  itinerary?: PackageItinerary;
  trendingScore: number;
  budgetFriendly: boolean;
  budgetType: BudgetType;
  priceRange: string;
  uniqueImageId: string;
  affordabilityScore: number;
  peopleCount: number;
  hotelType: HotelType;
  transportMode: TransportMode;
  season: SeasonType;
  specialTags: string[];
  isLuxury: boolean;
  lastUpdatedAt: string;
  pricingTier: PricingTier;
  travelerSegments: TravelerSegment[];
  dynamicPricing: DynamicPricing;
  badges: { bestValue: boolean; mostAffordable: boolean };
  popularityScore: number;
  nearbyAlternatives: string[];
  isGroupTour?: boolean;
  groupDepartures?: GroupDeparture[];
};

export type PackageListQuery = {
  q?: string;
  destination?: string;
  searchTerms?: string[];
  category?: PackageCategory;
  categories?: PackageCategory[];
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
  minRating?: number;
  budgetType?: BudgetType;
  pricingTier?: PricingTier;
  travelerSegment?: TravelerSegment;
  premiumUser?: boolean;
  peopleCount?: number;
  travelDate?: string;
  sortBy?: 'price' | 'rating' | 'duration' | 'trending' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  limit: number;
  offset: number;
};

export type PackageListResponse = {
  packages: TravelPackage[];
  count: number;
  total: number;
  offset: number;
  limit: number;
  sortBy: NonNullable<PackageListQuery['sortBy']>;
  sortOrder: NonNullable<PackageListQuery['sortOrder']>;
  source: 'cache' | 'external';
  refreshedAt: string;
};
