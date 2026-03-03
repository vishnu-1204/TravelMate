import packagesData from '@/data/packages.json';
import { applyCategorization } from '@/lib/packageCategorizer';
import {
  computeDynamicPricing,
  computePopularityScore,
  getValueBadges,
  inferPricingTier,
  inferTravelerSegments,
  suggestAffordableAlternatives,
  type DynamicPricing,
  type PricingTier,
  type TravelerSegment,
} from '@/lib/packagePricing';

export type PackageItinerary = {
  days: { day: number; title: string; activities: string[]; narrative?: string }[];
  nights: { night: number; accommodation: string; meals: string }[];
};

export type PackageCategory =
  | 'international'
  | 'domestic'
  | 'south'
  | 'north'
  | 'solo'
  | 'nearby'
  | 'budget'
  | 'honeymoon'
  | 'group'
  | 'educational';

export type BudgetType = 'low' | 'medium' | 'premium';
export type HotelType = 'budget' | 'comfort' | 'premium';
export type TransportMode = 'public' | 'shared' | 'flight';
export type SeasonType = 'off-season' | 'shoulder' | 'peak';

export type PackageBadges = {
  bestValue: boolean;
  mostAffordable: boolean;
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
  imageSource: 'pexels' | 'unsplash' | 'fallback' | 'admin';
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
  isGroupTour?: boolean;
  groupDepartures?: Array<{ date: string; maxCapacity: number; currentBookings: number }>;
  pricingTier: PricingTier;
  travelerSegments: TravelerSegment[];
  dynamicPricing: DynamicPricing;
  badges: PackageBadges;
  popularityScore: number;
  nearbyAlternatives: string[];
  groupFormLink?: string;
};

export type PackageQuery = {
  category?: string;
  categories?: string[];
  search?: string;
  destination?: string;
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
  limit?: number;
  offset?: number;
  sortBy?: 'price' | 'rating' | 'duration' | 'trending' | 'popularity';
  sortOrder?: 'asc' | 'desc';
};

const PLACE_SYNONYMS: Record<string, string[]> = {
  kodai: ['kodaikanal'],
  kodaikanal: ['kodai'],
  pondy: ['pondicherry', 'puducherry'],
  puducherry: ['pondicherry', 'pondy'],
  bombay: ['mumbai'],
  mumbai: ['bombay'],
  calcutta: ['kolkata'],
  kolkata: ['calcutta'],
  bangalore: ['bengaluru'],
  bengaluru: ['bangalore'],
};

const normalizeTerm = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

const buildPlaceSearchTerms = (input?: string) => {
  const normalized = normalizeTerm(input || '');
  if (!normalized) return [];
  const parts = normalized.split(/\s+/).filter(Boolean);
  const terms = new Set<string>([normalized, ...parts]);
  parts.forEach((part) => {
    (PLACE_SYNONYMS[part] || []).forEach((synonym) => terms.add(synonym));
  });
  (PLACE_SYNONYMS[normalized] || []).forEach((synonym) => terms.add(synonym));
  return Array.from(terms);
};

const editDistance = (a: string, b: string) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[b.length];
};

const fuzzyMatch = (haystack: string, term: string) => {
  const text = normalizeTerm(haystack);
  if (!text || !term) return false;
  if (text.includes(term)) return true;
  const words = text.split(/\s+/).filter(Boolean);
  return words.some((word) => {
    const threshold = term.length >= 8 ? 2 : 1;
    return editDistance(word, term) <= threshold;
  });
};

export type PackagesPage = {
  packages: TravelPackage[];
  count: number;
  total: number;
  offset: number;
  limit: number;
  sortBy: 'price' | 'rating' | 'duration' | 'trending' | 'popularity';
  sortOrder: 'asc' | 'desc';
  source: 'cache' | 'external';
  refreshedAt: string;
};

export type PackageVersionHistory = {
  id: string;
  package_id: string;
  version_number: number;
  created_at: string;
  created_by: string;
  is_active: boolean;
  price: number | null;
  duration_days: number | null;
};

const BACKEND_BASE_URL =
  (import.meta.env.VITE_AUTH_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
const DEFAULT_REFRESHED_AT = new Date().toISOString();
const PAGE_CACHE_TTL_MS = 45_000;
const MIN_PACKAGE_DURATION_DAYS = 3;
const packagesPageCache = new Map<string, { expiresAt: number; value: PackagesPage }>();
const inflightPages = new Map<string, Promise<PackagesPage>>();

const normalizeCategory = (category?: string): PackageCategory | undefined => {
  if (!category) return undefined;
  const lower = category.toLowerCase().trim();
  if (lower === 'indian' || lower === 'domestic') return 'domestic';
  if (lower === 'weekend' || lower === 'solo-trips') return 'solo';
  if (lower === 'budget-travel') return 'budget';
  if (lower === 'south-india' || lower === 'south') return 'south';
  if (lower === 'north-india' || lower === 'north') return 'north';
  if (lower === 'kerala') return 'south';
  
  const valid: PackageCategory[] = [
    'international', 'domestic', 'south', 'north', 'solo', 'nearby', 'budget', 'honeymoon', 'group', 'educational'
  ];
  if (valid.includes(lower as PackageCategory)) return lower as PackageCategory;
  return undefined;
};

const normalizeCountry = (country?: string) => (country || '').trim().toLowerCase();
const isIndiaCountry = (country?: string) => {
  const normalized = normalizeCountry(country);
  return normalized === 'india' || normalized === 'in' || normalized === 'ind';
};
const INDIA_LOCATION_KEYWORDS = [
  'india',
  'ahmedabad',
  'gandhinagar',
  'chennai',
  'mahabalipuram',
  'goa',
  'delhi',
  'mumbai',
  'kerala',
  'jaipur',
  'kolkata',
  'agra',
  'manali',
  'ooty',
  'coorg',
  'rishikesh',
  'kashmir',
  'andaman',
  'kodaikanal',
  'mysore',
  'hampi',
];
const hasIndianLocationKeyword = (value?: string) => {
  const normalized = normalizeTerm(value || '');
  if (!normalized) return false;
  return INDIA_LOCATION_KEYWORDS.some((keyword) => normalized.includes(keyword));
};
const isLikelyIndianPackage = (pkg: Pick<TravelPackage, 'country' | 'destination' | 'location' | 'title'>) =>
  isIndiaCountry(pkg.country) ||
  hasIndianLocationKeyword(pkg.destination) ||
  hasIndianLocationKeyword(pkg.location) ||
  hasIndianLocationKeyword(pkg.title);
const SOUTH_INDIA_KEYWORDS = [
  'kerala',
  'tamil nadu',
  'karnataka',
  'andhra',
  'telangana',
  'ooty',
  'kodaikanal',
  'coorg',
  'mysore',
  'hampi',
  'munnar',
  'alleppey',
  'wayanad',
  'thekkady',
  'kovalam',
  'kochi',
  'varkala',
  'hyderabad',
  'visakhapatnam',
  'tirupati',
  'pondicherry',
  'mahabalipuram',
];
const NORTH_INDIA_KEYWORDS = [
  'himachal',
  'uttarakhand',
  'rajasthan',
  'kashmir',
  'ladakh',
  'manali',
  'shimla',
  'kasol',
  'dharamshala',
  'dalhousie',
  'rishikesh',
  'nainital',
  'mussoorie',
  'auli',
  'haridwar',
  'jaipur',
  'udaipur',
  'jodhpur',
  'jaisalmer',
  'agra',
  'delhi',
];
const hasRegionKeyword = (pkg: Pick<TravelPackage, 'title' | 'destination' | 'location'>, keywords: string[]) => {
  const text = normalizeTerm(`${pkg.title} ${pkg.destination} ${pkg.location}`);
  return keywords.some((keyword) => text.includes(keyword));
};
const isSouthIndianPackage = (pkg: Pick<TravelPackage, 'category' | 'country' | 'title' | 'destination' | 'location'>) =>
  pkg.category === 'south';
const isNorthIndianPackage = (pkg: Pick<TravelPackage, 'category' | 'country' | 'title' | 'destination' | 'location'>) =>
  pkg.category === 'north';
const isSoloTripPackage = (pkg: Pick<TravelPackage, 'category' | 'durationDays' | 'travelerSegments'>) =>
  pkg.category === 'solo';

const inferCountry = (pkg: RawPackage) => {
  const looksIndianByText =
    hasIndianLocationKeyword(String(pkg.destination || '')) ||
    hasIndianLocationKeyword(String(pkg.location || '')) ||
    hasIndianLocationKeyword(String(pkg.title || ''));
  const direct = String(pkg.country || '').trim();
  if (direct) {
    if (isIndiaCountry(direct) || looksIndianByText) return 'India';
    return direct;
  }
  const location = String(pkg.location || '');
  const parts = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const inferredFromLocation = parts[parts.length - 1] || 'Unknown';
  if (looksIndianByText) return 'India';
  return inferredFromLocation;
};

const splitPlaces = (value: string) =>
  normalizeTerm(
    value
      .replace(/\b(tour|trip|escape|getaway|holiday|journey|retreat|circuit)\b/gi, ' ')
      .replace(/\s*&\s*/g, ' and ')
  )
    .split(/\s*,\s*|\s+and\s+/i)
    .map((item) => item.trim())
    .filter(Boolean);

const parseDurationDays = (value?: string) => {
  if (!value) return 0;
  const match = value.match(/(\d+)\s*day/i);
  if (!match) return 0;
  return Number(match[1] || 0);
};

const inferDurationDaysFromPrice = (price: number) => {
  if (!Number.isFinite(price) || price <= 0) return MIN_PACKAGE_DURATION_DAYS;
  if (price <= 7000) return 3;
  if (price <= 12000) return 4;
  if (price <= 20000) return 5;
  if (price <= 35000) return 6;
  if (price <= 50000) return 7;
  return 8;
};

const normalizeDurationDays = (pkg: RawPackage) => {
  const numeric = Number(pkg.durationDays || 0);
  const fromText = parseDurationDays(String(pkg.duration || ''));
  const fromPrice = inferDurationDaysFromPrice(Number(pkg.price || 0));
  const best = Number.isFinite(numeric) && numeric > 0 ? numeric : fromText || fromPrice;
  return Math.max(MIN_PACKAGE_DURATION_DAYS, best || MIN_PACKAGE_DURATION_DAYS);
};

const buildDurationLabel = (days: number) => `${days} Days / ${Math.max(days - 1, 1)} Nights`;

const toTitleCase = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const buildReliableTitle = (pkg: RawPackage, category: PackageCategory) => {
  // If the package already has a well-formatted title with a dash or en-dash, keep it.
  const existingTitle = String(pkg.title || '');
  if (existingTitle.includes(' – ') || existingTitle.includes(' - ')) return existingTitle;

  const destination = String(pkg.destination || '');
  const durationDays = Number(pkg.durationDays || 3);
  
  const suffix =
    category === 'honeymoon'
      ? 'Romantic Getaway'
      : category === 'educational'
      ? 'Educational Tour'
      : category === 'solo'
      ? 'Adventure Escape'
      : category === 'international' || category === 'domestic'
      ? 'Holiday'
      : 'Tour';

  return `${destination} – ${durationDays} Days ${suffix}`.replace(/\s+/g, ' ').trim();
};

const GENERIC_ACTIVITY_BLOCKLIST = new Set(['city visit', 'local market walk', 'budget food stop', 'local sightseeing day']);

const DESTINATION_ACTIVITY_DB: Record<string, string[]> = {
  shillong: [
    'Umiam Lake evening visit',
    'Elephant Falls trail',
    'Shillong Peak viewpoint',
    'Laitlum Canyon walk',
    'Khasi cultural village visit',
    'Police Bazaar shopping',
    'Local cafe and music lane experience',
    "Ward's Lake leisure walk",
  ],
  kerala: [
    'Backwater shikara ride',
    'Tea garden viewpoint walk',
    'Fort Kochi heritage quarter',
    'Kathakali cultural show',
    'Spice plantation visit',
    'Local seafood and Kerala thali tasting',
    'Beach sunset promenade',
    'Handloom and spice market browsing',
  ],
  goa: [
    'North Goa beach circuit',
    'Fontainhas heritage lane walk',
    'Dudhsagar viewpoint excursion',
    'Old Goa church and museum trail',
    'Sunset riverfront cruise point visit',
    'Local seafood shack experience',
    'Mapusa market shopping',
    'Quiet south beach relaxation stop',
  ],
  rajasthan: [
    'City Palace and old quarter walk',
    'Fort and rampart viewpoint tour',
    'Stepwell heritage stop',
    'Local bazaar handicraft browsing',
    'Rajasthani folk performance evening',
    'Traditional thali food trail',
    'Sunset lakefront walk',
    'Artisan workshop interaction',
  ],
  himachal: [
    'Mountain viewpoint drive',
    'Pine forest nature trail',
    'Monastery or temple circuit',
    'Local market and cafe street',
    'Riverfront relaxation stop',
    'Village walk with local guide',
    'Short adventure activity',
    'Handmade woolens shopping',
  ],
};

const normalizeActivityKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const cleanActivityText = (value: string) => value.replace(/\s+/g, ' ').trim();
const sentenceCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const listToSentence = (items: string[]) => {
  const clean = items.map((item) => item.trim()).filter(Boolean);
  if (!clean.length) return '';
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(', ')}, and ${clean[clean.length - 1]}`;
};

const getDestinationSpecificActivities = (destinationLabel: string, locationLabel: string) => {
  const merged = normalizeActivityKey(`${destinationLabel} ${locationLabel}`);
  const matched: string[] = [];
  Object.entries(DESTINATION_ACTIVITY_DB).forEach(([keyword, activities]) => {
    if (merged.includes(keyword)) matched.push(...activities);
  });
  return matched;
};

const buildBaseActivityPool = (destinationLabel: string) => [
  `Guided landmark sightseeing in ${destinationLabel}`,
  `${destinationLabel} nature viewpoint circuit`,
  `Local museum and heritage center visit`,
  `Street food and regional cuisine tasting`,
  `Public transport and old town exploration`,
  `Craft market and souvenir browsing`,
  'Sunset photo walk at a scenic point',
  'Hidden gem neighborhood trail',
  'Budget-friendly adventure activity',
  'Lakeside or riverside leisure stop',
  'Cultural performance or folk art session',
  'Local village interaction experience',
];

const buildUniqueItinerary = (pkg: {
  id: string;
  destination: string;
  location: string;
  durationDays: number;
  category: PackageCategory;
  budgetType: BudgetType;
  transportMode: TransportMode;
}): PackageItinerary => {
  const totalDays = Math.max(MIN_PACKAGE_DURATION_DAYS, Math.min(pkg.durationDays || 4, 9));
  const used = new Set<string>();
  const pool = [...getDestinationSpecificActivities(pkg.destination, pkg.location), ...buildBaseActivityPool(pkg.destination)]
    .map(cleanActivityText)
    .filter((item) => {
      const normalized = normalizeActivityKey(item);
      return normalized && !GENERIC_ACTIVITY_BLOCKLIST.has(normalized);
    });

  const seedString = pkg.id + pkg.destination + pkg.location;
  let seedNum = 0;
  for (let i = 0; i < seedString.length; i++) {
    seedNum += seedString.charCodeAt(i);
  }
  let cursor = seedNum % Math.max(pool.length, 1);
  const takeUnique = (count: number, preferred: string[] = []) => {
    const picked: string[] = [];
    const source = [...preferred, ...pool];
    for (let i = 0; i < source.length && picked.length < count; i += 1) {
      const item = cleanActivityText(source[(cursor + i) % source.length]);
      const key = normalizeActivityKey(item);
      if (!key || used.has(key) || GENERIC_ACTIVITY_BLOCKLIST.has(key)) continue;
      used.add(key);
      picked.push(item);
    }
    cursor = (cursor + count + 1) % Math.max(source.length, 1);
    while (picked.length < count) {
      const fallback = cleanActivityText(`${pkg.destination} local experience ${picked.length + 1}`);
      const key = normalizeActivityKey(fallback);
      if (used.has(key)) break;
      used.add(key);
      picked.push(fallback);
    }
    return picked;
  };

  const arrivalPreferred = ['Hotel check-in and rest', `Orientation walk around ${pkg.destination}`, 'Easy evening stroll at a nearby attraction'];
  const departurePreferred = [
    'Morning local shopping stop',
    'Leisure breakfast and checkout',
    pkg.transportMode === 'public' ? 'Public transfer to departure point' : 'Shared transfer to departure point',
  ];

  const categoryPreferred: Record<PackageCategory, string[]> = {
    domestic: [`${pkg.destination} heritage and local life trail`, `${pkg.destination} cultural neighborhood walk`],
    solo: [`Self-paced walk around ${pkg.destination}`, `Solo-friendly hidden spots in ${pkg.destination}`],
    international: [`${pkg.destination} city landmark circuit`, `${pkg.destination} cultural district experience`],
    nearby: [`Short nature trail near ${pkg.destination}`, `${pkg.destination} cafe and promenade visit`],
    budget: [`Free-entry attraction circuit in ${pkg.destination}`, `${pkg.destination} budget transit experience`],
    honeymoon: [`Scenic couple photo stop in ${pkg.destination}`, `Romantic sunset viewpoint in ${pkg.destination}`],
    group: [`Group-friendly sightseeing circuit in ${pkg.destination}`, 'Team activity and local exploration'],
    educational: [`Museum and interpretation center tour in ${pkg.destination}`, 'Guided history and learning walk'],
    south: [`Heritage temple tour in ${pkg.destination}`, `Coastal walk and traditional lunch`],
    north: [`Mountain viewpoint drive in ${pkg.destination}`, `Old town walk and local market visit`],
  };

  const days = Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    if (day === 1) {
      return { day, title: `Arrival in ${pkg.destination}`, activities: takeUnique(3, arrivalPreferred) };
    }
    if (day === totalDays) {
      return { day, title: 'Departure', activities: takeUnique(3, departurePreferred) };
    }
    return {
      day,
      title: `${pkg.destination} Experience Day ${day}`,
      activities: takeUnique(3, categoryPreferred[pkg.category]),
    };
  });

  const nights = Array.from({ length: Math.max(totalDays - 1, 1) }, (_, index) => ({
    night: index + 1,
    accommodation: pkg.budgetType === 'low' ? 'Budget hotel stay' : 'Comfort hotel stay',
    meals: 'Breakfast',
  }));

  const daysWithNarrative = days.map((day, index) => {
    const night = nights.find((item) => item.night === day.day);
    const activityText = listToSentence(day.activities.slice(0, 3));
    const hotelText = night?.accommodation || 'comfort hotel stay';
    const mealsText = night?.meals || 'breakfast';
    const isArrivalDay = index === 0;
    const isDepartureDay = index === days.length - 1;

    let narrative = '';
    if (isArrivalDay) {
      narrative =
        `Upon arrival in ${pkg.destination}, you will be welcomed and transferred for hotel check-in and time to relax. ` +
        `In the afternoon, begin your first local exploration with ${sentenceCase(activityText || `a guided introduction around ${pkg.destination}`)}. ` +
        `In the evening, unwind at your own pace and settle into your ${hotelText} with ${mealsText} included.`;
    } else if (isDepartureDay) {
      narrative =
        `In the morning, enjoy a relaxed start and complete checkout formalities from your ${hotelText}. ` +
        `In the afternoon, cover your final experiences including ${sentenceCase(activityText || 'a short local visit and souvenir stop')} before your onward transfer. ` +
        `In the evening, depart with memorable moments from ${pkg.destination} and your trip concludes comfortably.`;
    } else {
      narrative =
        `In the morning, continue your journey through ${pkg.destination} with ${sentenceCase(day.activities[0] || 'a curated sightseeing experience')}. ` +
        `In the afternoon, enjoy ${day.activities[1] || 'local cultural exploration'} and discover the destination at a comfortable pace. ` +
        `In the evening, wrap up with ${day.activities[2] || 'a scenic leisure experience'}, followed by dinner/rest and an overnight stay at your ${hotelText}.`;
    }

    return { ...day, narrative };
  });

  return { days: daysWithNarrative, nights };
};

type RawPackage = Partial<TravelPackage> & Record<string, unknown>;

const normalizePackage = (pkg: RawPackage): TravelPackage => {
  const normalizedCategory = ((normalizeCategory(String(pkg.category || 'international')) || 'international') as PackageCategory);
  const normalizedDurationDays = normalizeDurationDays(pkg);
  const normalized = {
    id: String(pkg.id || ''),
    packageId: String(pkg.packageId || pkg.id || ''),
    source: 'amadeus' as const,
    category: normalizedCategory,
    categories: Array.isArray(pkg.categories) ? (pkg.categories as PackageCategory[]) : [],
    categoryLabel: String(pkg.categoryLabel || ''),
    country: inferCountry(pkg),
    title: buildReliableTitle(pkg, normalizedCategory),
    destination: String(pkg.destination || pkg.location || ''),
    location: String(pkg.location || pkg.destination || ''),
    duration: buildDurationLabel(normalizedDurationDays),
    durationDays: normalizedDurationDays,
    price: Number(pkg.price || 0),
    discount: Number(pkg.discount || 0),
    rating: Number(pkg.rating || 4.0),
    reviews: Number(pkg.reviews || 0),
    shortDescription: String(pkg.shortDescription || pkg.description || ''),
    inclusions: Array.isArray(pkg.inclusions) ? (pkg.inclusions as string[]) : Array.isArray(pkg.included) ? (pkg.included as string[]) : [],
    exclusions: Array.isArray(pkg.exclusions) ? (pkg.exclusions as string[]) : Array.isArray(pkg.excluded) ? (pkg.excluded as string[]) : [],
    imageUrl: String(pkg.imageUrl || pkg.image || ''),
    imageAlt: String(pkg.imageAlt || `${String(pkg.destination || pkg.location || '')} travel package image`),
    imageSource:
      pkg.imageSource === 'pexels' || pkg.imageSource === 'unsplash' || pkg.imageSource === 'fallback' || pkg.imageSource === 'admin'
        ? pkg.imageSource
        : 'fallback',
    availableDates: Array.isArray(pkg.availableDates) ? (pkg.availableDates as string[]) : [],
    image: String(pkg.image || pkg.imageUrl || ''),
    description: String(pkg.description || pkg.shortDescription || ''),
    highlights: Array.isArray(pkg.highlights) ? (pkg.highlights as string[]) : [],
    included: Array.isArray(pkg.included) ? (pkg.included as string[]) : Array.isArray(pkg.inclusions) ? (pkg.inclusions as string[]) : [],
    excluded: Array.isArray(pkg.excluded) ? (pkg.excluded as string[]) : Array.isArray(pkg.exclusions) ? (pkg.exclusions as string[]) : [],
    itinerary: buildUniqueItinerary({
      id: String(pkg.id || pkg.packageId || ''),
      destination: String(pkg.destination || pkg.location || ''),
      location: String(pkg.location || pkg.destination || ''),
      durationDays: normalizedDurationDays,
      category: ((normalizeCategory(String(pkg.category || 'international')) || 'international') as PackageCategory),
      budgetType:
        pkg.budgetType === 'low' || pkg.budgetType === 'medium' || pkg.budgetType === 'premium'
          ? pkg.budgetType
          : Number(pkg.price || 0) <= 15000
          ? 'low'
          : Number(pkg.price || 0) <= 45000
          ? 'medium'
          : 'premium',
      transportMode:
        pkg.transportMode === 'public' || pkg.transportMode === 'shared' || pkg.transportMode === 'flight'
          ? (pkg.transportMode as TransportMode)
          : 'shared',
    }),
    trendingScore: Number(pkg.trendingScore || Number(pkg.rating || 0) * Math.max(1, Number(pkg.reviews || 0))),
    budgetFriendly: typeof pkg.budgetFriendly === 'boolean' ? pkg.budgetFriendly : Number(pkg.price || 0) <= 100000,
    budgetType:
      pkg.budgetType === 'low' || pkg.budgetType === 'medium' || pkg.budgetType === 'premium'
        ? pkg.budgetType
        : Number(pkg.price || 0) <= 15000
        ? 'low'
        : Number(pkg.price || 0) <= 45000
        ? 'medium'
        : 'premium',
    priceRange: String(pkg.priceRange || ''),
    uniqueImageId: String(pkg.uniqueImageId || pkg.id || ''),
    affordabilityScore: Number(pkg.affordabilityScore || 55),
    peopleCount: Number(pkg.peopleCount || 2),
    hotelType:
      pkg.hotelType === 'budget' || pkg.hotelType === 'comfort' || pkg.hotelType === 'premium'
        ? (pkg.hotelType as HotelType)
        : 'comfort',
    transportMode:
      pkg.transportMode === 'public' || pkg.transportMode === 'shared' || pkg.transportMode === 'flight'
        ? (pkg.transportMode as TransportMode)
        : 'shared',
    season:
      pkg.season === 'off-season' || pkg.season === 'shoulder' || pkg.season === 'peak'
        ? (pkg.season as SeasonType)
        : 'shoulder',
    specialTags: Array.isArray(pkg.specialTags) ? (pkg.specialTags as string[]) : [],
    isLuxury: Boolean(pkg.isLuxury),
    lastUpdatedAt: String(pkg.lastUpdatedAt || DEFAULT_REFRESHED_AT),
    isGroupTour: Boolean(pkg.isGroupTour),
    groupDepartures: Array.isArray(pkg.groupDepartures) ? pkg.groupDepartures : [],
  };

  const categorized = applyCategorization(normalized);

  const pricingTier =
    pkg.pricingTier === 'budget' || pkg.pricingTier === 'standard' || pkg.pricingTier === 'luxury'
      ? (pkg.pricingTier as PricingTier)
      : inferPricingTier(categorized.budgetType, categorized.price);

  const travelerSegments = Array.isArray(pkg.travelerSegments)
    ? (pkg.travelerSegments as TravelerSegment[])
    : inferTravelerSegments(categorized);

  const dynamicPricing =
    pkg.dynamicPricing && typeof pkg.dynamicPricing === 'object'
      ? (pkg.dynamicPricing as DynamicPricing)
      : computeDynamicPricing(categorized);

  const popularityScore = Number(pkg.popularityScore || computePopularityScore(categorized.rating, categorized.reviews));
  const badges =
    pkg.badges && typeof pkg.badges === 'object'
      ? (pkg.badges as PackageBadges)
      : getValueBadges({
          pricingTier,
          affordabilityScore: categorized.affordabilityScore,
          finalPricePerPerson: dynamicPricing.finalPricePerPerson,
        });

  return {
    ...categorized,
    pricingTier,
    travelerSegments,
    dynamicPricing,
    badges,
    popularityScore,
    nearbyAlternatives: Array.isArray(pkg.nearbyAlternatives) ? (pkg.nearbyAlternatives as string[]) : [],
    groupFormLink: String(pkg.groupFormLink || pkg.group_form_link || ''),
  };
};

const localPackages: TravelPackage[] = (packagesData as RawPackage[]).map((pkg) => normalizePackage(pkg));

const withQueryPricing = (pkg: TravelPackage, query: PackageQuery): TravelPackage => {
  const dynamicPricing = computeDynamicPricing(pkg, {
    travelers: query.peopleCount,
    travelerSegment: query.travelerSegment,
    selectedDate: query.travelDate,
  });

  const pricingTier = inferPricingTier(pkg.budgetType, dynamicPricing.finalPricePerPerson);

  return {
    ...pkg,
    price: dynamicPricing.finalPricePerPerson,
    discount: dynamicPricing.totalDiscountPercent,
    dynamicPricing,
    pricingTier,
    badges: getValueBadges({
      pricingTier,
      affordabilityScore: pkg.affordabilityScore,
      finalPricePerPerson: dynamicPricing.finalPricePerPerson,
    }),
  };
};

const comparePackages = (
  a: TravelPackage,
  b: TravelPackage,
  sortBy: NonNullable<PackageQuery['sortBy']>,
  sortOrder: NonNullable<PackageQuery['sortOrder']>
) => {
  const direction = sortOrder === 'asc' ? 1 : -1;
  if (sortBy === 'price') return (a.price - b.price) * direction;
  if (sortBy === 'rating') return (a.rating - b.rating) * direction;
  if (sortBy === 'duration') return (a.durationDays - b.durationDays) * direction;
  if (sortBy === 'popularity') return (a.popularityScore - b.popularityScore) * direction;
  return (a.trendingScore - b.trendingScore) * direction;
};

const normalizeKeyToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const buildPackageDuplicateKey = (pkg: TravelPackage) =>
  [
    normalizeKeyToken(pkg.title),
    normalizeKeyToken(pkg.destination),
    normalizeKeyToken(pkg.location),
    normalizeKeyToken(pkg.country || ''),
  ].join('|');

const pickCanonicalPackage = (existing: TravelPackage, candidate: TravelPackage) => {
  if (candidate.price < existing.price) return candidate;
  if (candidate.price > existing.price) return existing;
  if (candidate.rating > existing.rating) return candidate;
  if (candidate.rating < existing.rating) return existing;
  if (candidate.reviews > existing.reviews) return candidate;
  return existing;
};

const deduplicatePackages = (packages: TravelPackage[]) => {
  const deduped = new Map<string, TravelPackage>();
  packages.forEach((pkg) => {
    const key = buildPackageDuplicateKey(pkg);
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, pkg);
      return;
    }
    deduped.set(key, pickCanonicalPackage(existing, pkg));
  });
  return Array.from(deduped.values());
};

const getPackagesPageFromLocal = (query: PackageQuery = {}): PackagesPage => {
  const normalizedCategory = normalizeCategory(query.category);
  const normalizedCategories = (query.categories || [])
    .map((item) => normalizeCategory(item))
    .filter((item): item is PackageCategory => Boolean(item));
  const sortBy = query.sortBy || 'trending';
  const sortOrder = query.sortOrder || 'desc';
  const offset = query.offset || 0;
  const limit = query.limit || 12;
  const searchTerms = buildPlaceSearchTerms(query.search || query.destination);

  let filtered = localPackages.map((pkg) => withQueryPricing(pkg, query));

  if (normalizedCategory) {
    if (normalizedCategory === 'south') {
      filtered = filtered.filter((pkg) => isSouthIndianPackage(pkg));
    } else if (normalizedCategory === 'north') {
      filtered = filtered.filter((pkg) => isNorthIndianPackage(pkg));
    } else if (normalizedCategory === 'solo') {
      filtered = filtered.filter((pkg) => isSoloTripPackage(pkg));
    } else {
      filtered = filtered.filter((pkg) => pkg.category === (normalizedCategory as PackageCategory));
    }
  }
  if (normalizedCategories.length) {
    filtered = filtered.filter((pkg) =>
      normalizedCategories.some((category) => {
        if (category === 'south') return isSouthIndianPackage(pkg);
        if (category === 'north') return isNorthIndianPackage(pkg);
        if (category === 'solo') return isSoloTripPackage(pkg);
        return pkg.category === category;
      })
    );
  }
  if (searchTerms.length) {
    filtered = filtered.filter((pkg) =>
      searchTerms.some((term) =>
        fuzzyMatch(pkg.destination, term) || fuzzyMatch(pkg.location, term) || fuzzyMatch(pkg.title, term)
      )
    );
  }
  if (typeof query.minPrice === 'number') {
    filtered = filtered.filter((pkg) => pkg.price >= query.minPrice!);
  }
  if (typeof query.maxPrice === 'number') {
    filtered = filtered.filter((pkg) => pkg.price <= query.maxPrice!);
  }
  if (typeof query.minDuration === 'number') {
    filtered = filtered.filter((pkg) => pkg.durationDays >= query.minDuration!);
  }
  if (typeof query.maxDuration === 'number') {
    filtered = filtered.filter((pkg) => pkg.durationDays <= query.maxDuration!);
  }
  if (typeof query.minRating === 'number') {
    filtered = filtered.filter((pkg) => pkg.rating >= query.minRating!);
  }
  if (query.budgetType) {
    filtered = filtered.filter((pkg) => pkg.budgetType === query.budgetType);
  }
  if (query.pricingTier) {
    filtered = filtered.filter((pkg) => pkg.pricingTier === query.pricingTier);
  }
  if (query.travelerSegment) {
    filtered = filtered.filter((pkg) => pkg.travelerSegments.includes(query.travelerSegment!));
  }
  if (!query.premiumUser) {
    filtered = filtered.filter((pkg) => !pkg.isLuxury);
  }

  filtered = deduplicatePackages(filtered);

  filtered.sort((a, b) => comparePackages(a, b, sortBy, sortOrder));

  const packages = filtered.slice(offset, offset + limit).map((pkg) => {
    if (!searchTerms.length || pkg.price <= 60000) return pkg;
    return {
      ...pkg,
      nearbyAlternatives: suggestAffordableAlternatives(filtered, pkg.destination, Math.round(pkg.price * 0.72)),
    };
  });

  return {
    packages,
    count: packages.length,
    total: filtered.length,
    offset,
    limit,
    sortBy,
    sortOrder,
    source: 'cache',
    refreshedAt: DEFAULT_REFRESHED_AT,
  };
};

export const getPackagesPage = async (query: PackageQuery = {}): Promise<PackagesPage> => {
  const cacheKey = JSON.stringify(query);
  const cacheHit = packagesPageCache.get(cacheKey);
  if (cacheHit && cacheHit.expiresAt > Date.now()) {
    return cacheHit.value;
  }
  const inFlight = inflightPages.get(cacheKey);
  if (inFlight) return inFlight;

  if (!BACKEND_BASE_URL) {
    const local = getPackagesPageFromLocal(query);
    packagesPageCache.set(cacheKey, { value: local, expiresAt: Date.now() + PAGE_CACHE_TTL_MS });
    return local;
  }

  const url = new URL(`${BACKEND_BASE_URL}/api/packages`);
  const normalizedCategory = normalizeCategory(query.category);

  if (normalizedCategory) url.searchParams.set('category', normalizedCategory);
  if (query.categories?.length)
    url.searchParams.set('categories', query.categories.map((item) => normalizeCategory(item)).filter(Boolean).join(','));
  if (query.search) url.searchParams.set('q', query.search);
  if (query.destination) url.searchParams.set('destination', query.destination);
  if (typeof query.minPrice === 'number') url.searchParams.set('minPrice', String(query.minPrice));
  if (typeof query.maxPrice === 'number') url.searchParams.set('maxPrice', String(query.maxPrice));
  if (typeof query.minDuration === 'number') url.searchParams.set('minDuration', String(query.minDuration));
  if (query.pricingTier) url.searchParams.set('pricingTier', query.pricingTier);
  if (query.travelerSegment) url.searchParams.set('travelerSegment', query.travelerSegment);
  if (typeof query.premiumUser === 'boolean') url.searchParams.set('premiumUser', String(query.premiumUser));
  if (typeof query.peopleCount === 'number') url.searchParams.set('peopleCount', String(query.peopleCount));
  if (query.travelDate) url.searchParams.set('travelDate', query.travelDate);
  if (typeof query.limit === 'number') url.searchParams.set('limit', String(query.limit));
  if (typeof query.offset === 'number') url.searchParams.set('offset', String(query.offset));
  if (query.sortBy) url.searchParams.set('sortBy', query.sortBy);
  if (query.sortOrder) url.searchParams.set('sortOrder', query.sortOrder);

  const request = (async () => {
    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Package fetch failed: ${response.status}`);
      }

      const payload = (await response.json()) as Partial<PackagesPage>;
      if (!Array.isArray(payload.packages) || typeof payload.total !== 'number') {
        throw new Error('Invalid package payload');
      }

      const normalizedPackages = payload.packages.map((pkg) =>
        withQueryPricing(normalizePackage(pkg as RawPackage), query)
      );

      if (normalizedPackages.length === 0 && (query.search || query.destination)) {
         // If backend returns nothing for search, we might want to check local too
         // But for now, let's just stick to the main fallback in catch
      }

      const dedupedPackages = deduplicatePackages(normalizedPackages);

      if (dedupedPackages.length === 0 && !query.search && !query.destination) {
        return getPackagesPageFromLocal(query);
      }

      return {
        packages: dedupedPackages,
        count: dedupedPackages.length,
        total: payload.total,
        offset: typeof payload.offset === 'number' ? payload.offset : query.offset || 0,
        limit: typeof payload.limit === 'number' ? payload.limit : query.limit || 12,
        sortBy: payload.sortBy || query.sortBy || 'trending',
        sortOrder: payload.sortOrder || query.sortOrder || 'desc',
        source: payload.source || 'cache',
        refreshedAt: payload.refreshedAt || DEFAULT_REFRESHED_AT,
      } satisfies PackagesPage;
    } catch {
      return getPackagesPageFromLocal(query);
    } finally {
      inflightPages.delete(cacheKey);
    }
  })();

  inflightPages.set(cacheKey, request);
  const result = await request;
  packagesPageCache.set(cacheKey, { value: result, expiresAt: Date.now() + PAGE_CACHE_TTL_MS });
  return result;
};

export const getPackages = async (query: PackageQuery = {}): Promise<TravelPackage[]> => {
  const page = await getPackagesPage(query);
  return page.packages;
};

export const getPackageById = async (id: string): Promise<TravelPackage | undefined> => {
  if (!BACKEND_BASE_URL) {
    const hit = localPackages.find((pkg) => pkg.id === id);
    return hit ? withQueryPricing(hit, {}) : undefined;
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/packages/${id}`);
    if (response.status === 404) {
      const hit = localPackages.find((pkg) => pkg.id === id);
      return hit ? withQueryPricing(hit, {}) : undefined;
    }
    if (!response.ok) {
      throw new Error(`Package fetch failed: ${response.status}`);
    }
    const payload = (await response.json()) as { package?: TravelPackage };
    return payload.package ? withQueryPricing(normalizePackage(payload.package as RawPackage), {}) : undefined;
  } catch {
    const hit = localPackages.find((pkg) => pkg.id === id);
    return hit ? withQueryPricing(hit, {}) : undefined;
  }
};

export const getPackageCategoryCounts = async (): Promise<Record<string, number>> => {
  const exactCategories: PackageCategory[] = [
    'south',
    'north',
    'solo',
    'honeymoon',
    'educational',
  ];

  if (!BACKEND_BASE_URL) {
    const counts: Record<string, number> = {};
    exactCategories.forEach((category) => {
      counts[category] = localPackages.filter((pkg) => pkg.category === category).length;
    });
    return counts;
  }

  const totals = await Promise.all(
    exactCategories.map(async (category) => {
      const page = await getPackagesPage({ category, limit: 1, offset: 0 });
      return [category, page.total] as const;
    })
  );

  return Object.fromEntries(totals);
};

export const overridePackageCategories = async (
  packageId: string,
  categories: string[],
  adminToken?: string
): Promise<TravelPackage | undefined> => {
  if (!BACKEND_BASE_URL) return undefined;

  const response = await fetch(`${BACKEND_BASE_URL}/api/packages/${packageId}/categories`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(adminToken ? { 'x-admin-token': adminToken } : {}),
    },
    body: JSON.stringify({ categories }),
  });

  if (!response.ok) {
    throw new Error(`Category override failed: ${response.status}`);
  }

  const payload = (await response.json()) as { package?: TravelPackage };
  return payload.package ? normalizePackage(payload.package as RawPackage) : undefined;
};

export const overridePackageImage = async (
  packageId: string,
  imageUrl: string,
  imageAlt?: string,
  adminToken?: string
): Promise<TravelPackage | undefined> => {
  if (!BACKEND_BASE_URL) return undefined;

  const response = await fetch(`${BACKEND_BASE_URL}/api/packages/${packageId}/image`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(adminToken ? { 'x-admin-token': adminToken } : {}),
    },
    body: JSON.stringify({ imageUrl, imageAlt }),
  });

  if (!response.ok) {
    throw new Error(`Image override failed: ${response.status}`);
  }

  const payload = (await response.json()) as { package?: TravelPackage };
  return payload.package ? normalizePackage(payload.package as RawPackage) : undefined;
};

export const getPackageHistory = async (
  packageId: string,
  adminToken?: string
): Promise<PackageVersionHistory[]> => {
  if (!BACKEND_BASE_URL) return [];

  const response = await fetch(`${BACKEND_BASE_URL}/api/packages/${packageId}/history`, {
    headers: adminToken ? { "x-admin-token": adminToken } : {},
  });

  if (!response.ok) {
    throw new Error(`Package history fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { history?: PackageVersionHistory[] };
  return payload.history || [];
};

export const deletePackage = async (packageId: string, adminToken?: string): Promise<boolean> => {
  if (!BACKEND_BASE_URL) return false;

  const response = await fetch(`${BACKEND_BASE_URL}/api/packages/${packageId}`, {
    method: 'DELETE',
    headers: adminToken ? { 'x-admin-token': adminToken } : {},
  });

  if (response.status === 404) return false;
  if (!response.ok) {
    throw new Error(`Package delete failed: ${response.status}`);
  }

  return true;
};
