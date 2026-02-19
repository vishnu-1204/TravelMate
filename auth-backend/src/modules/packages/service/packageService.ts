import { config } from "../../../config/env";
import { fetchAmadeusPackages } from "../provider/amadeusProvider";
import {
  getCacheHealth,
  getPackageByIdFromCache,
  getPackagesFromCache,
  pruneExpiredRows,
  upsertPackages,
} from "../repository/supabasePackageRepository";
import {
  PACKAGE_CATEGORIES,
  type PackageCategory,
  type PackageListQuery,
  type PackageListResponse,
  type TravelPackage,
} from "../types";

const validCategories = new Set<string>(PACKAGE_CATEGORIES);

const sanitizeNumber = (value: unknown, fallback?: number) => {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const sanitizeCategory = (value: unknown): PackageCategory | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (validCategories.has(normalized)) {
    return normalized as PackageCategory;
  }
  return undefined;
};

const sanitizeSortBy = (value: unknown): NonNullable<PackageListQuery["sortBy"]> => {
  if (value === "price" || value === "rating" || value === "duration" || value === "trending") {
    return value;
  }
  return "trending";
};

const sanitizeSortOrder = (value: unknown): NonNullable<PackageListQuery["sortOrder"]> => {
  return value === "asc" ? "asc" : "desc";
};

export const buildPackageListQuery = (query: Record<string, unknown>): PackageListQuery => {
  const limit = Math.min(Math.max(Math.floor(sanitizeNumber(query.limit, 12) || 12), 1), 50);
  const offset = Math.max(Math.floor(sanitizeNumber(query.offset, 0) || 0), 0);
  const q = typeof query.q === "string" ? query.q.trim() : undefined;
  const destination = typeof query.destination === "string" ? query.destination.trim() : undefined;

  return {
    q: q || undefined,
    destination: destination || undefined,
    category: sanitizeCategory(query.category),
    minPrice: sanitizeNumber(query.minPrice),
    maxPrice: sanitizeNumber(query.maxPrice),
    minDuration: sanitizeNumber(query.minDuration),
    maxDuration: sanitizeNumber(query.maxDuration),
    minRating: sanitizeNumber(query.minRating),
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
  const packages = await fetchAmadeusPackages();
  await upsertPackages(packages);
  await pruneExpiredRows();
  return packages.length;
};

export const getPackages = async (query: PackageListQuery): Promise<PackageListResponse> => {
  const needsRefresh = await shouldRefreshCache();
  let source: "cache" | "external" = "cache";

  if (needsRefresh) {
    await refreshPackageCache();
    source = "external";
  }

  const result = await getPackagesFromCache({
    ...query,
    sortBy: query.sortBy || "trending",
    sortOrder: query.sortOrder || "desc",
  });

  return {
    packages: result.packages,
    count: result.packages.length,
    total: result.total,
    offset: query.offset,
    limit: query.limit,
    sortBy: query.sortBy || "trending",
    sortOrder: query.sortOrder || "desc",
    source,
    refreshedAt: new Date().toISOString(),
  };
};

export const getPackageById = async (id: string): Promise<TravelPackage | null> => {
  const cached = await getPackageByIdFromCache(id);
  if (cached) return cached;

  if (config.packageAllowColdRefreshOnItemMiss) {
    await refreshPackageCache();
    return getPackageByIdFromCache(id);
  }

  return null;
};

