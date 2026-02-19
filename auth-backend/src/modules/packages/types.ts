export const PACKAGE_CATEGORIES = [
  "international",
  "domestic",
  "honeymoon",
  "group",
  "educational",
  "adventure",
] as const;

export type PackageCategory = (typeof PACKAGE_CATEGORIES)[number];

export type PackageItinerary = {
  days: { day: number; title: string; activities: string[] }[];
  nights: { night: number; accommodation: string; meals: string }[];
};

export type TravelPackage = {
  id: string;
  packageId: string;
  source: "amadeus";
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

export type PackageListQuery = {
  q?: string;
  destination?: string;
  category?: PackageCategory;
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
  minRating?: number;
  sortBy?: "price" | "rating" | "duration" | "trending";
  sortOrder?: "asc" | "desc";
  limit: number;
  offset: number;
};

export type PackageListResponse = {
  packages: TravelPackage[];
  count: number;
  total: number;
  offset: number;
  limit: number;
  sortBy: NonNullable<PackageListQuery["sortBy"]>;
  sortOrder: NonNullable<PackageListQuery["sortOrder"]>;
  source: "cache" | "external";
  refreshedAt: string;
};

