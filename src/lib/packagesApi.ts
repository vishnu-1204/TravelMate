import localPackagesData from '@/data/packages.json';

export type PackageItinerary = {
  days: { day: number; title: string; activities: string[] }[];
  nights: { night: number; accommodation: string; meals: string }[];
};

export type TravelPackage = {
  id: string;
  packageId: string;
  category: string;
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
};

export type PackageQuery = {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'price' | 'rating' | 'duration';
  sortOrder?: 'asc' | 'desc';
};

export type PackagesPage = {
  packages: TravelPackage[];
  count: number;
  total: number;
  offset: number;
  limit: number | null;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
};

const BACKEND_BASE_URL = (import.meta.env.VITE_AUTH_BACKEND_URL || 'http://localhost:3000').replace(
  /\/+$/,
  ''
);

const fallbackPackages = localPackagesData as TravelPackage[];

const applyLocalFilters = (packages: TravelPackage[], query: PackageQuery) => {
  const normalizedCategory = query.category?.trim().toLowerCase();
  const normalizedSearch = query.search?.trim().toLowerCase();

  let filtered = [...packages];

  if (normalizedCategory) {
    filtered = filtered.filter((pkg) => pkg.category.toLowerCase() === normalizedCategory);
  }

  if (normalizedSearch) {
    filtered = filtered.filter(
      (pkg) =>
        pkg.title.toLowerCase().includes(normalizedSearch) ||
        pkg.destination.toLowerCase().includes(normalizedSearch) ||
        pkg.location.toLowerCase().includes(normalizedSearch) ||
        pkg.category.toLowerCase().includes(normalizedSearch)
    );
  }

  if (typeof query.minPrice === 'number') {
    const minPrice = query.minPrice;
    filtered = filtered.filter((pkg) => pkg.price >= minPrice);
  }

  if (typeof query.maxPrice === 'number') {
    const maxPrice = query.maxPrice;
    filtered = filtered.filter((pkg) => pkg.price <= maxPrice);
  }

  const direction = query.sortOrder === 'asc' ? 1 : -1;
  const sortBy = query.sortBy || 'rating';
  filtered.sort((a, b) => {
    if (sortBy === 'price') {
      return (a.price - b.price) * direction;
    }
    if (sortBy === 'duration') {
      return (a.durationDays - b.durationDays) * direction;
    }
    return (a.rating - b.rating) * direction;
  });

  if (typeof query.limit === 'number' && query.limit > 0) {
    const offset = query.offset && query.offset > 0 ? query.offset : 0;
    filtered = filtered.slice(offset, offset + query.limit);
  }

  return filtered;
};

export const getPackagesPage = async (query: PackageQuery = {}): Promise<PackagesPage> => {
  try {
    const url = new URL(`${BACKEND_BASE_URL}/api/packages`);
    if (query.category) url.searchParams.set('category', query.category);
    if (query.search) url.searchParams.set('q', query.search);
    if (typeof query.minPrice === 'number') url.searchParams.set('minPrice', String(query.minPrice));
    if (typeof query.maxPrice === 'number') url.searchParams.set('maxPrice', String(query.maxPrice));
    if (typeof query.limit === 'number') url.searchParams.set('limit', String(query.limit));
    if (typeof query.offset === 'number') url.searchParams.set('offset', String(query.offset));
    if (query.sortBy) url.searchParams.set('sortBy', query.sortBy);
    if (query.sortOrder) url.searchParams.set('sortOrder', query.sortOrder);

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
      limit:
        typeof payload.limit === 'number'
          ? payload.limit
          : typeof query.limit === 'number'
          ? query.limit
          : null,
      sortBy: payload.sortBy || query.sortBy || 'rating',
      sortOrder: (payload.sortOrder as 'asc' | 'desc') || query.sortOrder || 'desc',
    };
  } catch {
    const filtered = applyLocalFilters(fallbackPackages, query);
    const total = applyLocalFilters(fallbackPackages, {
      ...query,
      limit: undefined,
      offset: undefined,
    }).length;

    return {
      packages: filtered,
      count: filtered.length,
      total,
      offset: query.offset || 0,
      limit: query.limit ?? null,
      sortBy: query.sortBy || 'rating',
      sortOrder: query.sortOrder || 'desc',
    };
  }
};

export const getPackages = async (query: PackageQuery = {}): Promise<TravelPackage[]> => {
  const page = await getPackagesPage(query);
  return page.packages;
};

export const getPackageById = async (id: string): Promise<TravelPackage | undefined> => {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/packages/${id}`);
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      throw new Error(`Package fetch failed: ${response.status}`);
    }

    const payload = (await response.json()) as { package?: TravelPackage };
    if (!payload.package) {
      throw new Error('Invalid package payload');
    }

    return payload.package;
  } catch {
    return fallbackPackages.find((pkg) => pkg.id === id);
  }
};
