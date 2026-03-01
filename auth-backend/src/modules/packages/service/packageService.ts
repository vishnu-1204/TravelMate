import { config } from '../../../config/env';
import { fetchAmadeusPackages, primeImageCacheSeeds } from '../provider/amadeusProvider';
import {
  deletePackageFromCache,
  getCategoryCountsFromCache,
  getCacheHealth,
  getImageCacheSeeds,
  getPackageVersionHistory,
  hasActiveBookingsForPackage,
  overridePackageCategories,
  overridePackageImage,
  getPackageByIdFromCache,
  getPackagesFromCache,
  pruneExpiredRows,
  updatePackageGroupBookings,
  upsertPackages,
} from '../repository/supabasePackageRepository';
import {
  PACKAGE_CATEGORIES,
  type BudgetType,
  type PackageCategory,
  type PackageListQuery,
  type PackageListResponse,
  type PricingTier,
  type TravelPackage,
  type TravelerSegment,
} from '../types';
import { classifyPackageCategories, pickPrimaryCategory } from './packageCategorizer';
import { CATEGORY_LABELS } from '../constants';
import { withPricingFields } from './pricingEngine';

const validCategories = new Set<string>(PACKAGE_CATEGORIES);

const sanitizeNumber = (value: unknown, fallback?: number) => {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const sanitizeCategory = (value: unknown): PackageCategory | undefined => {
  if (typeof value !== 'string') return undefined;
  const raw = value.trim().toLowerCase();
  const normalized = raw === 'indian' ? 'domestic' : raw === 'weekend' ? 'nearby' : raw;
  if (validCategories.has(normalized)) {
    return normalized as PackageCategory;
  }
  return undefined;
};

const sanitizeSortBy = (value: unknown): NonNullable<PackageListQuery['sortBy']> => {
  if (value === 'price' || value === 'rating' || value === 'duration' || value === 'trending' || value === 'popularity') {
    return value;
  }
  return 'trending';
};

const sanitizeSortOrder = (value: unknown): NonNullable<PackageListQuery['sortOrder']> => {
  return value === 'asc' ? 'asc' : 'desc';
};

const sanitizeBudgetType = (value: unknown): BudgetType | undefined => {
  if (value === 'low' || value === 'medium' || value === 'premium') {
    return value;
  }
  return undefined;
};

const sanitizePricingTier = (value: unknown): PricingTier | undefined => {
  if (value === 'budget' || value === 'standard' || value === 'luxury') return value;
  return undefined;
};

const sanitizeTravelerSegment = (value: unknown): TravelerSegment | undefined => {
  if (value === 'students' || value === 'families' || value === 'groups' || value === 'couples' || value === 'solo') {
    return value;
  }
  return undefined;
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
  ooty: ['udhagamandalam'],
  udhagamandalam: ['ooty'],
};

const normalizePlaceTerm = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
const normalizeKeyToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const buildSearchTerms = (queryText?: string, destinationText?: string) => {
  const base = normalizePlaceTerm([queryText, destinationText].filter(Boolean).join(' ').trim());
  if (!base) return [];

  const pieces = base.split(/\s+/).filter(Boolean);
  const terms = new Set<string>([base, ...pieces]);

  pieces.forEach((piece) => {
    (PLACE_SYNONYMS[piece] || []).forEach((synonym) => terms.add(synonym));
  });
  (PLACE_SYNONYMS[base] || []).forEach((synonym) => terms.add(synonym));

  return Array.from(terms).filter(Boolean);
};

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

export const buildPackageListQuery = (query: Record<string, unknown>): PackageListQuery => {
  const limit = Math.min(Math.max(Math.floor(sanitizeNumber(query.limit, 12) || 12), 1), 50);
  const offset = Math.max(Math.floor(sanitizeNumber(query.offset, 0) || 0), 0);
  const q = typeof query.q === 'string' ? query.q.trim() : undefined;
  const destination = typeof query.destination === 'string' ? query.destination.trim() : undefined;
  const searchTerms = buildSearchTerms(q, destination);

  const rawCategory = typeof query.category === 'string' ? query.category.trim().toLowerCase() : undefined;
  const virtualCategory =
    rawCategory === 'south-india' || rawCategory === 'north-india'
      ? rawCategory
      : rawCategory === 'solo' || rawCategory === 'solo-trips'
      ? 'solo'
      : undefined;

  const categoriesParam = typeof query.categories === 'string' ? query.categories : undefined;
  const categories = categoriesParam
    ? categoriesParam
        .split(',')
        .map((item) => sanitizeCategory(item))
        .filter((item): item is PackageCategory => Boolean(item))
    : undefined;

  return {
    q: q || undefined,
    destination: destination || undefined,
    searchTerms: searchTerms.length ? searchTerms : undefined,
    category: sanitizeCategory(query.category),
    categories: categories?.length ? Array.from(new Set(categories)) : undefined,
    virtualCategory,
    minPrice: sanitizeNumber(query.minPrice),
    maxPrice: sanitizeNumber(query.maxPrice),
    minDuration: sanitizeNumber(query.minDuration),
    maxDuration: sanitizeNumber(query.maxDuration),
    minRating: sanitizeNumber(query.minRating),
    budgetType: sanitizeBudgetType(query.budgetType),
    pricingTier: sanitizePricingTier(query.pricingTier),
    travelerSegment: sanitizeTravelerSegment(query.travelerSegment),
    premiumUser: query.premiumUser === 'true' || query.premiumUser === true,
    peopleCount: sanitizeNumber(query.peopleCount),
    travelDate: typeof query.travelDate === 'string' ? query.travelDate : undefined,
    sortBy: sanitizeSortBy(query.sortBy),
    sortOrder: sanitizeSortOrder(query.sortOrder),
    limit,
    offset,
  };
};

const shouldRefreshCache = async () => {
  const health = await getCacheHealth();
  if (!health.hasData || !health.latestExpiresAt) return true;
  return new Date(health.latestExpiresAt).getTime() <= Date.now();
};

export const refreshPackageCache = async () => {
  const imageSeeds = await getImageCacheSeeds();
  primeImageCacheSeeds(imageSeeds);
  const packages = await fetchAmadeusPackages();
  await upsertPackages(packages);
  await pruneExpiredRows();
  return packages.length;
};

export const recategorizePackage = (pkg: TravelPackage): TravelPackage => {
  const categories = classifyPackageCategories(pkg);
  const category = pickPrimaryCategory(categories);

  return withPricingFields({
    ...pkg,
    category,
    categories,
    categoryLabel: CATEGORY_LABELS[category],
  });
};

const applyAdvancedFilters = (packages: TravelPackage[], query: PackageListQuery) => {
  let result = [...packages];
  const normalizeText = (value: string) => value.toLowerCase();
  const SOUTH_KEYWORDS = [
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
  const NORTH_KEYWORDS = [
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
  const isIndian = (pkg: TravelPackage) => (pkg.country || '').trim().toLowerCase() === 'india';
  const hasKeyword = (pkg: TravelPackage, keywords: string[]) => {
    const text = normalizeText(`${pkg.title} ${pkg.destination} ${pkg.location}`);
    return keywords.some((keyword) => text.includes(keyword));
  };
  const isSouthIndian = (pkg: TravelPackage) => isIndian(pkg) && hasKeyword(pkg, SOUTH_KEYWORDS);
  const isNorthIndian = (pkg: TravelPackage) => isIndian(pkg) && (hasKeyword(pkg, NORTH_KEYWORDS) || !hasKeyword(pkg, SOUTH_KEYWORDS));
  const isSolo = (pkg: TravelPackage) =>
    pkg.category === 'nearby' || pkg.durationDays <= 4 || pkg.travelerSegments.includes('solo');

  if (query.virtualCategory === 'south-india') {
    result = result.filter((pkg) => isSouthIndian(pkg));
  } else if (query.virtualCategory === 'north-india') {
    result = result.filter((pkg) => isNorthIndian(pkg));
  } else if (query.virtualCategory === 'solo') {
    result = result.filter((pkg) => isSolo(pkg));
  }

  if (query.pricingTier) {
    result = result.filter((pkg) => pkg.pricingTier === query.pricingTier);
  }

  if (query.travelerSegment) {
    result = result.filter((pkg) => pkg.travelerSegments.includes(query.travelerSegment!));
  }

  if (typeof query.peopleCount === 'number' && query.peopleCount > 0) {
    result = result.map((pkg) => withPricingFields({ ...pkg, peopleCount: query.peopleCount! }));
  }

  if (query.sortBy === 'popularity') {
    result.sort((a, b) => (query.sortOrder === 'asc' ? a.popularityScore - b.popularityScore : b.popularityScore - a.popularityScore));
  }

  return result;
};

export const getPackages = async (query: PackageListQuery): Promise<PackageListResponse> => {
  const needsRefresh = await shouldRefreshCache();
  let source: 'cache' | 'external' = 'cache';

  if (needsRefresh) {
    await refreshPackageCache();
    source = 'external';
  }

  const { virtualCategory: _virtualCategory, ...cacheQuery } = query;
  const result = await getPackagesFromCache({
    ...cacheQuery,
    offset: 0,
    limit: 5000,
    sortBy: query.sortBy || 'trending',
    sortOrder: query.sortOrder || 'desc',
  });

  const normalized = result.packages.map(recategorizePackage);
  const deduped = deduplicatePackages(normalized);
  const filtered = applyAdvancedFilters(deduped, query);
  const paged = filtered.slice(query.offset, query.offset + query.limit);

  return {
    packages: paged,
    count: paged.length,
    total: filtered.length,
    offset: query.offset,
    limit: query.limit,
    sortBy: query.sortBy || 'trending',
    sortOrder: query.sortOrder || 'desc',
    source,
    refreshedAt: new Date().toISOString(),
  };
};

export const getPackageById = async (id: string): Promise<TravelPackage | null> => {
  const cached = await getPackageByIdFromCache(id);
  if (cached) return recategorizePackage(cached);

  if (config.packageAllowColdRefreshOnItemMiss) {
    await refreshPackageCache();
    const refreshed = await getPackageByIdFromCache(id);
    return refreshed ? recategorizePackage(refreshed) : null;
  }

  return null;
};

export const getPackageCategoryCounts = async () => {
  const counts = await getCategoryCountsFromCache();
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([id, count]) => ({ id, label: CATEGORY_LABELS[id], count }));
};

export const setPackageCategories = async (packageId: string, categories: PackageCategory[]) => {
  const hasBookings = await hasActiveBookingsForPackage(packageId);
  if (hasBookings) {
    throw new Error("Cannot edit categories of a package that already has active bookings. Create a new package version for future bookings.");
  }

  const unique = Array.from(new Set(categories));
  if (!unique.length) {
    throw new Error('At least one category is required');
  }
  // Enforce exactly one category per package.
  return overridePackageCategories(packageId, [unique[0]]);
};

export const setPackageImage = async (packageId: string, imageUrl: string, imageAlt?: string) => {
  const hasBookings = await hasActiveBookingsForPackage(packageId);
  if (hasBookings) {
    throw new Error("Cannot edit image of a package that already has active bookings. Create a new package version for future bookings.");
  }

  if (!imageUrl.trim()) {
    throw new Error('Image URL is required');
  }
  return overridePackageImage(packageId, imageUrl.trim(), imageAlt?.trim() || undefined);
};

export const getPackageHistory = async (packageId: string) => {
  return getPackageVersionHistory(packageId);
};

export const updateGroupBookings = async (packageId: string, travelDate: string, travelers: number) => {
  return updatePackageGroupBookings(packageId, travelDate, travelers);
};

export const deletePackage = async (packageId: string) => {
  const hasBookings = await hasActiveBookingsForPackage(packageId);
  if (hasBookings) {
    throw new Error("Cannot delete a package that already has active bookings. Create a new package version instead.");
  }
  return deletePackageFromCache(packageId);
};

export const createPackage = async (
  input: Partial<TravelPackage> & {
    title?: string;
    destination?: string;
    durationDays?: number;
    price?: number;
    category?: string;
    imageUrl?: string;
    highlights?: string[] | string;
  }
) => {
  const nowIso = new Date().toISOString();
  const toCategory = (value?: string): PackageCategory => {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'south-india' || raw === 'north-india' || raw === 'indian') return 'domestic';
    if (raw === 'solo' || raw === 'solo-trips') return 'nearby';
    if (validCategories.has(raw)) return raw as PackageCategory;
    return 'domestic';
  };

  const category = toCategory(input.category);
  const destination = String(input.destination || input.title || '').trim();
  const title = String(input.title || destination || 'Custom Package').trim();
  const durationDays = Math.max(2, Math.min(14, Number(input.durationDays || 4)));
  const basePrice = Math.max(2000, Number(input.price || 15000));
  const imageUrl = String(input.imageUrl || '').trim();
  if (!title || !destination || !imageUrl) {
    throw new Error('Title, destination, and imageUrl are required');
  }

  const highlights =
    Array.isArray(input.highlights)
      ? input.highlights.map((item) => String(item || '').trim()).filter(Boolean)
      : String(input.highlights || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

  const generatedId = `admin-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
  const draft = {
    id: generatedId,
    packageId: generatedId,
    source: 'amadeus' as const,
    category,
    categories: [category],
    categoryLabel: CATEGORY_LABELS[category],
    country: category === 'international' ? String(input.country || 'Unknown') : 'India',
    title,
    destination,
    location: String(input.location || destination),
    duration: `${durationDays} Days / ${Math.max(1, durationDays - 1)} Nights`,
    durationDays,
    price: basePrice,
    discount: 0,
    rating: Number(input.rating || 4.2),
    reviews: Number(input.reviews || 0),
    shortDescription: String(input.shortDescription || `Explore ${destination} with a curated itinerary.`),
    inclusions: Array.isArray(input.inclusions) ? input.inclusions : ['Hotel', 'Breakfast', 'Transfers'],
    exclusions: Array.isArray(input.exclusions) ? input.exclusions : ['Flights', 'Personal expenses'],
    imageUrl,
    imageAlt: String(input.imageAlt || `${destination} travel package image`),
    imageSource: 'admin' as const,
    availableDates: Array.isArray(input.availableDates) ? input.availableDates : [],
    image: imageUrl,
    description: String(input.description || input.shortDescription || `Discover ${destination}.`),
    highlights: highlights.length ? highlights : [`Top sights in ${destination}`, 'Local experiences', 'Comfortable stays'],
    included: Array.isArray(input.included) ? input.included : ['Hotel', 'Breakfast', 'Transfers'],
    excluded: Array.isArray(input.excluded) ? input.excluded : ['Flights', 'Personal expenses'],
    itinerary: input.itinerary,
    trendingScore: Number(input.trendingScore || 0),
    budgetFriendly: typeof input.budgetFriendly === 'boolean' ? input.budgetFriendly : basePrice <= 30000,
    budgetType: input.budgetType === 'low' || input.budgetType === 'medium' || input.budgetType === 'premium' ? input.budgetType : 'medium',
    priceRange: String(input.priceRange || ''),
    uniqueImageId: `admin-${generatedId}`,
    affordabilityScore: Number(input.affordabilityScore || 70),
    peopleCount: Number(input.peopleCount || 2),
    hotelType: input.hotelType === 'budget' || input.hotelType === 'comfort' || input.hotelType === 'premium' ? input.hotelType : 'comfort',
    transportMode: input.transportMode === 'public' || input.transportMode === 'shared' || input.transportMode === 'flight' ? input.transportMode : 'shared',
    season: input.season === 'off-season' || input.season === 'shoulder' || input.season === 'peak' ? input.season : 'shoulder',
    specialTags: Array.isArray(input.specialTags) ? input.specialTags : [],
    isLuxury: Boolean(input.isLuxury),
    lastUpdatedAt: nowIso,
    pricingTier: 'standard' as const,
    travelerSegments: ['families'] as const,
    dynamicPricing: input.dynamicPricing as TravelPackage['dynamicPricing'],
    badges: input.badges || { bestValue: false, mostAffordable: false },
    popularityScore: Number(input.popularityScore || 0),
    nearbyAlternatives: Array.isArray(input.nearbyAlternatives) ? input.nearbyAlternatives : [],
    isGroupTour: Boolean(input.isGroupTour),
    groupDepartures: Array.isArray(input.groupDepartures) ? input.groupDepartures : [],
  } as TravelPackage;

  const enriched = recategorizePackage(draft);
  await upsertPackages([enriched]);
  return enriched;
};
