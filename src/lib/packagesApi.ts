import packagesData from '@/data/packages.json';

export type PackageItinerary = {
  days: { day: number; title: string; activities: string[] }[];
  nights: { night: number; accommodation: string; meals: string }[];
};

export type PackageCategory =
  | 'international'
  | 'domestic'
  | 'honeymoon'
  | 'group'
  | 'educational'
  | 'adventure';

export type TravelPackage = {
  id: string;
  packageId: string;
  source: 'amadeus';
  category: PackageCategory;
  categoryLabel: string;
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
  availableDates: string[];
  image: string;
  description: string;
  highlights: string[];
  included: string[];
  excluded: string[];
  itinerary?: PackageItinerary;
  trendingScore: number;
  budgetFriendly: boolean;
  lastUpdatedAt: string;
};

export type PackageQuery = {
  category?: string;
  search?: string;
  destination?: string;
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
  minRating?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'price' | 'rating' | 'duration' | 'trending';
  sortOrder?: 'asc' | 'desc';
};

export type PackagesPage = {
  packages: TravelPackage[];
  count: number;
  total: number;
  offset: number;
  limit: number;
  sortBy: 'price' | 'rating' | 'duration' | 'trending';
  sortOrder: 'asc' | 'desc';
  source: 'cache' | 'external';
  refreshedAt: string;
};

const BACKEND_BASE_URL = import.meta.env.VITE_AUTH_BACKEND_URL?.replace(/\/+$/, '');
const DEFAULT_REFRESHED_AT = new Date().toISOString();

const normalizeCategory = (category?: string) => {
  if (!category) return undefined;
  if (category === 'indian') return 'domestic';
  return category;
};

const normalizePackage = (pkg: Omit<TravelPackage, 'source' | 'trendingScore' | 'budgetFriendly' | 'lastUpdatedAt'>): TravelPackage => ({
  ...pkg,
  location: pkg.location || pkg.destination,
  image: pkg.image || pkg.imageUrl,
  imageUrl: pkg.imageUrl || pkg.image,
  source: 'amadeus',
  trendingScore: pkg.rating * Math.max(1, pkg.reviews),
  budgetFriendly: pkg.price <= 100000,
  lastUpdatedAt: DEFAULT_REFRESHED_AT,
});

const localPackages: TravelPackage[] = (packagesData as Omit<
  TravelPackage,
  'source' | 'trendingScore' | 'budgetFriendly' | 'lastUpdatedAt'
>[]).map(normalizePackage);

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
  return (a.trendingScore - b.trendingScore) * direction;
};

const getPackagesPageFromLocal = (query: PackageQuery = {}): PackagesPage => {
  const normalizedCategory = normalizeCategory(query.category);
  const sortBy = query.sortBy || 'trending';
  const sortOrder = query.sortOrder || 'desc';
  const offset = query.offset || 0;
  const limit = query.limit || 12;
  const searchTerm = query.search?.trim().toLowerCase();
  const destinationTerm = query.destination?.trim().toLowerCase();

  let filtered = [...localPackages];

  if (normalizedCategory) {
    filtered = filtered.filter((pkg) => pkg.category === normalizedCategory);
  }
  if (searchTerm) {
    filtered = filtered.filter((pkg) => pkg.title.toLowerCase().includes(searchTerm));
  }
  if (destinationTerm) {
    filtered = filtered.filter(
      (pkg) =>
        pkg.destination.toLowerCase().includes(destinationTerm) || pkg.location.toLowerCase().includes(destinationTerm)
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

  filtered.sort((a, b) => comparePackages(a, b, sortBy, sortOrder));

  const packages = filtered.slice(offset, offset + limit);

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
  if (!BACKEND_BASE_URL) {
    return getPackagesPageFromLocal(query);
  }

  const url = new URL(`${BACKEND_BASE_URL}/api/packages`);
  const normalizedCategory = normalizeCategory(query.category);

  if (normalizedCategory) url.searchParams.set('category', normalizedCategory);
  if (query.search) url.searchParams.set('q', query.search);
  if (query.destination) url.searchParams.set('destination', query.destination);
  if (typeof query.minPrice === 'number') url.searchParams.set('minPrice', String(query.minPrice));
  if (typeof query.maxPrice === 'number') url.searchParams.set('maxPrice', String(query.maxPrice));
  if (typeof query.minDuration === 'number') url.searchParams.set('minDuration', String(query.minDuration));
  if (typeof query.maxDuration === 'number') url.searchParams.set('maxDuration', String(query.maxDuration));
  if (typeof query.minRating === 'number') url.searchParams.set('minRating', String(query.minRating));
  if (typeof query.limit === 'number') url.searchParams.set('limit', String(query.limit));
  if (typeof query.offset === 'number') url.searchParams.set('offset', String(query.offset));
  if (query.sortBy) url.searchParams.set('sortBy', query.sortBy);
  if (query.sortOrder) url.searchParams.set('sortOrder', query.sortOrder);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Package fetch failed: ${response.status}`);
    }

    const payload = (await response.json()) as Partial<PackagesPage>;
    if (!Array.isArray(payload.packages) || typeof payload.total !== 'number') {
      throw new Error('Invalid package payload');
    }

    return {
      packages: payload.packages,
      count: typeof payload.count === 'number' ? payload.count : payload.packages.length,
      total: payload.total,
      offset: typeof payload.offset === 'number' ? payload.offset : query.offset || 0,
      limit: typeof payload.limit === 'number' ? payload.limit : query.limit || 12,
      sortBy: payload.sortBy || query.sortBy || 'trending',
      sortOrder: payload.sortOrder || query.sortOrder || 'desc',
      source: payload.source || 'cache',
      refreshedAt: payload.refreshedAt || DEFAULT_REFRESHED_AT,
    };
  } catch {
    return getPackagesPageFromLocal(query);
  }
};

export const getPackages = async (query: PackageQuery = {}): Promise<TravelPackage[]> => {
  const page = await getPackagesPage(query);
  return page.packages;
};

export const getPackageById = async (id: string): Promise<TravelPackage | undefined> => {
  if (!BACKEND_BASE_URL) {
    return localPackages.find((pkg) => pkg.id === id);
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/packages/${id}`);
    if (response.status === 404) return undefined;
    if (!response.ok) {
      throw new Error(`Package fetch failed: ${response.status}`);
    }
    const payload = (await response.json()) as { package?: TravelPackage };
    return payload.package;
  } catch {
    return localPackages.find((pkg) => pkg.id === id);
  }
};
