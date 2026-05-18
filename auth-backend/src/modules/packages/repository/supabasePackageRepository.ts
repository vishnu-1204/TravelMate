import { db } from "../../../utils/turso";
import { config } from "../../../config/env";
import type { BudgetType, PackageCategory, TravelPackage } from "../types";
import { classifyPackageCategories, pickPrimaryCategory } from "../service/packageCategorizer";
import { CATEGORY_LABELS } from "../constants";
import { getDeterministicGuideInfo } from '../service/guideUtils';

type CacheRow = {
  package_id: string;
  source: string;
  title: string;
  destination: string;
  country: string;
  category: PackageCategory;
  categories: PackageCategory[];
  budget_type: BudgetType;
  price_range: string;
  unique_image_id: string;
  affordability_score: number;
  itinerary_json: string | null;
  is_luxury: boolean;
  is_group_tour: boolean;
  group_departures_json: string | null;
  duration_days: number;
  price: number;
  rating: number;
  budget_friendly: boolean;
  trending_score: number;
  guide_name: string;
  guide_phone: string;
  payload: TravelPackage;
  updated_at: string;
  expires_at: string;
};

const CACHE_TABLE = "travel_packages_cache";

export type CacheQuery = {
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
  premiumUser?: boolean;
  sortBy: "price" | "rating" | "duration" | "trending" | "popularity";
  sortOrder: "asc" | "desc";
  limit: number;
  offset: number;
};

const mapSortField = (sortBy: CacheQuery["sortBy"]) => {
  if (sortBy === "duration") return "duration_days";
  if (sortBy === "popularity") return "trending_score";
  if (sortBy === "trending") return "trending_score";
  return sortBy;
};

const normalizeSearch = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
const normalizeCountry = (value?: string) => (value || "").trim().toLowerCase();
const isIndiaCountry = (value?: string) => {
  const normalized = normalizeCountry(value);
  return normalized === "india" || normalized === "in" || normalized === "ind";
};
const INDIA_LOCATION_KEYWORDS = [
  "india",
  "ahmedabad",
  "gandhinagar",
  "chennai",
  "mahabalipuram",
  "goa",
  "delhi",
  "mumbai",
  "kerala",
  "jaipur",
  "kolkata",
  "agra",
  "manali",
  "ooty",
  "coorg",
  "rishikesh",
  "kashmir",
  "andaman",
  "kodaikanal",
  "mysore",
  "hampi",
];
const hasIndianLocationKeyword = (value?: string) => {
  const normalized = normalizeSearch(value || "");
  if (!normalized) return false;
  return INDIA_LOCATION_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const inferCountryFromRow = (row: Partial<CacheRow> & { payload?: Partial<TravelPackage> }) => {
  const looksIndianByText = isLikelyIndianRow(row);
  const direct = typeof row.country === "string" ? row.country.trim() : "";
  if (direct) {
    if (isIndiaCountry(direct) || looksIndianByText) return "India";
    return direct;
  }

  const payloadCountry = typeof row.payload?.country === "string" ? row.payload.country.trim() : "";
  if (payloadCountry) {
    if (isIndiaCountry(payloadCountry) || looksIndianByText) return "India";
    return payloadCountry;
  }

  const location = typeof row.payload?.location === "string" ? row.payload.location : "";
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const inferredFromLocation = parts[parts.length - 1] || "Unknown";
  if (looksIndianByText) return "India";
  return inferredFromLocation;
};

const isLikelyIndianRow = (row: Partial<CacheRow> & { payload?: Partial<TravelPackage> }) => {
  if (isIndiaCountry(row.country)) return true;
  if (hasIndianLocationKeyword(row.destination)) return true;
  if (hasIndianLocationKeyword(row.title)) return true;
  if (hasIndianLocationKeyword(row.payload?.destination)) return true;
  if (hasIndianLocationKeyword(row.payload?.location)) return true;
  if (hasIndianLocationKeyword(row.payload?.title)) return true;
  return false;
};

export const getCacheHealth = async () => {
  try {
    const result = await db.execute({
      sql: `SELECT updated_at, expires_at FROM ${CACHE_TABLE} ORDER BY updated_at DESC LIMIT 1`,
    });
    const latest = result.rows.length > 0 ? (result.rows[0] as unknown as any) : null;
    return {
      hasData: Boolean(latest),
      latestUpdatedAt: latest?.updated_at || null,
      latestExpiresAt: latest?.expires_at || null,
    };
  } catch (err: any) {
    console.error("getCacheHealth failed:", err.message);
    return {
      hasData: false,
      latestUpdatedAt: null,
      latestExpiresAt: null,
    };
  }
};

export const upsertPackages = async (packages: TravelPackage[]) => {
  if (!packages.length) return;

  const nowIso = new Date().toISOString();
  const expiresAtIso = new Date(Date.now() + config.packageCacheTtlMinutes * 60_000).toISOString();

  const statements = packages.map((pkg) => {
    const categories = classifyPackageCategories(pkg);
    const category = pickPrimaryCategory(categories);
    const categoryLabel = CATEGORY_LABELS[category];
    const payload: TravelPackage = {
      ...pkg,
      country: pkg.country || "Unknown",
      category,
      categories,
      categoryLabel,
      lastUpdatedAt: nowIso,
    };

    return {
      sql: `INSERT OR REPLACE INTO ${CACHE_TABLE} (
              package_id, source, title, destination, country, category, categories,
              budget_type, price_range, unique_image_id, affordability_score, itinerary_json,
              is_luxury, is_group_tour, group_departures_json, guide_name, guide_phone,
              duration_days, price, rating, budget_friendly, trending_score, payload,
              updated_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        pkg.id,
        payload.source || "amadeus",
        payload.title,
        payload.destination,
        payload.country,
        category,
        JSON.stringify(categories),
        payload.budgetType,
        payload.priceRange,
        payload.uniqueImageId,
        payload.affordabilityScore,
        pkg.itinerary ? JSON.stringify(pkg.itinerary) : null,
        payload.isLuxury ? 1 : 0,
        pkg.isGroupTour ? 1 : 0,
        pkg.groupDepartures ? JSON.stringify(pkg.groupDepartures) : null,
        pkg.guideName || null,
        pkg.guidePhone || null,
        payload.durationDays,
        payload.price,
        payload.rating,
        payload.budgetFriendly ? 1 : 0,
        payload.trendingScore,
        JSON.stringify(payload),
        nowIso,
        expiresAtIso,
      ],
    };
  });

  try {
    await db.batch(statements);
  } catch (error: any) {
    throw new Error(`Failed to upsert package cache: ${error.message}`);
  }
};

export const pruneExpiredRows = async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    await db.execute({
      sql: `DELETE FROM ${CACHE_TABLE} WHERE expires_at < ?`,
      args: [cutoff],
    });
  } catch (error: any) {
    throw new Error(`Failed to prune package cache: ${error.message}`);
  }
};

export const getPackagesFromCache = async (query: CacheQuery) => {
  let sql = `SELECT * FROM ${CACHE_TABLE} WHERE 1=1`;
  const args: any[] = [];

  if (query.category) {
    sql += " AND category = ?";
    args.push(query.category);
  }
  if (query.category === "international") {
    sql += " AND country <> 'India'";
  }
  if (query.category === "domestic") {
    sql += " AND country = 'India'";
  }
  if (query.categories?.length) {
    const catLikes = query.categories.map((cat) => {
      args.push(`%"${cat}"%`);
      return "categories LIKE ?";
    }).join(" OR ");
    if (catLikes) {
      sql += ` AND (${catLikes})`;
    }

    const includesInternational = query.categories.includes("international");
    const includesDomestic = query.categories.includes("domestic");
    if (includesInternational && !includesDomestic) {
      sql += " AND country <> 'India'";
    } else if (includesDomestic && !includesInternational) {
      sql += " AND country = 'India'";
    }
  }
  if (query.destination) {
    sql += " AND destination LIKE ?";
    args.push(`%${query.destination}%`);
  }
  if (typeof query.minPrice === "number") {
    sql += " AND price >= ?";
    args.push(query.minPrice);
  }
  if (typeof query.maxPrice === "number") {
    sql += " AND price <= ?";
    args.push(query.maxPrice);
  }
  if (typeof query.minDuration === "number") {
    sql += " AND duration_days >= ?";
    args.push(query.minDuration);
  }
  if (typeof query.maxDuration === "number") {
    sql += " AND duration_days <= ?";
    args.push(query.maxDuration);
  }
  if (typeof query.minRating === "number") {
    sql += " AND rating >= ?";
    args.push(query.minRating);
  }
  if (query.budgetType) {
    sql += " AND budget_type = ?";
    args.push(query.budgetType);
  }
  if (!query.premiumUser) {
    sql += " AND is_luxury = 0";
  }

  const searchTerms = query.searchTerms?.length
    ? query.searchTerms
    : query.q
    ? [query.q]
    : [];
  if (searchTerms.length) {
    const searchFilters = searchTerms.map((term) => {
      args.push(`%${term}%`, `%${term}%`);
      return "(destination LIKE ? OR title LIKE ?)";
    }).join(" OR ");
    if (searchFilters) {
      sql += ` AND (${searchFilters})`;
    }
  }

  const sortField = mapSortField(query.sortBy);
  const order = query.sortOrder === "asc" ? "ASC" : "DESC";
  sql += ` ORDER BY ${sortField} ${order}`;

  // Count exact total matching records
  try {
    const countSql = `SELECT COUNT(*) as cnt FROM (${sql})`;
    const countResult = await db.execute({ sql: countSql, args });
    const total = Number(countResult.rows[0]?.cnt || 0);

    // Limit / Offset
    sql += " LIMIT ? OFFSET ?";
    args.push(query.limit, query.offset);

    const result = await db.execute({ sql, args });
    const rows = result.rows as unknown as any[];

    const packages = rows.map((row) => {
      const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
      const country = inferCountryFromRow(row);
      return {
        ...payload,
        country,
        isGroupTour: !!row.is_group_tour,
        groupDepartures: row.group_departures_json ? JSON.parse(row.group_departures_json) : [],
        guideName: row.guide_name || payload?.guideName || getDeterministicGuideInfo(row.package_id).name,
        guidePhone: row.guide_phone || payload?.guidePhone || getDeterministicGuideInfo(row.package_id).phone,
      };
    });

    return { packages, total };
  } catch (error: any) {
    throw new Error(`Failed to fetch packages from cache: ${error.message}`);
  }
};

export const getPackageByIdFromCache = async (packageId: string): Promise<TravelPackage | null> => {
  try {
    const result = await db.execute({
      sql: `SELECT * FROM ${CACHE_TABLE} WHERE package_id = ? LIMIT 1`,
      args: [packageId],
    });
    if (result.rows.length === 0) return null;
    const row = result.rows[0] as unknown as any;
    const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
    if (!payload) return null;
    return {
      ...payload,
      isGroupTour: !!row.is_group_tour,
      groupDepartures: row.group_departures_json ? JSON.parse(row.group_departures_json) : [],
      guideName: row.guide_name || payload.guideName || getDeterministicGuideInfo(row.package_id).name,
      guidePhone: row.guide_phone || payload.guidePhone || getDeterministicGuideInfo(row.package_id).phone,
    };
  } catch (err: any) {
    console.error("getPackageByIdFromCache failed:", err.message);
    return null;
  }
};

export const getCategoryCountsFromCache = async () => {
  const countMap = new Map<PackageCategory, number>();
  try {
    const result = await db.execute({
      sql: `SELECT categories, category FROM ${CACHE_TABLE}`,
    });
    result.rows.forEach((row: any) => {
      const categories = row.categories
        ? (typeof row.categories === "string" ? JSON.parse(row.categories) : row.categories)
        : (row.category ? [row.category] : []);
      if (Array.isArray(categories)) {
        categories.forEach((category: PackageCategory) => {
          countMap.set(category, (countMap.get(category) || 0) + 1);
        });
      }
    });
  } catch (err: any) {
    console.error("getCategoryCountsFromCache failed:", err.message);
  }
  return countMap;
};

export const overridePackageCategories = async (packageId: string, categories: PackageCategory[]) => {
  const primaryCategory = pickPrimaryCategory(categories);
  const singleCategory = [primaryCategory];

  const hit = await getPackageByIdFromCache(packageId);
  if (!hit) return null;

  const updatedPayload: TravelPackage = {
    ...hit,
    category: primaryCategory,
    categories: singleCategory,
    categoryLabel: CATEGORY_LABELS[primaryCategory],
    lastUpdatedAt: new Date().toISOString(),
  };

  try {
    await db.execute({
      sql: `UPDATE ${CACHE_TABLE} SET 
              category = ?, 
              categories = ?, 
              payload = ?, 
              updated_at = ? 
            WHERE package_id = ?`,
      args: [
        primaryCategory,
        JSON.stringify(singleCategory),
        JSON.stringify(updatedPayload),
        new Date().toISOString(),
        packageId,
      ],
    });
    return updatedPayload;
  } catch (error: any) {
    throw new Error(`Failed to override package categories: ${error.message}`);
  }
};

export const getImageCacheSeeds = async () => {
  try {
    const result = await db.execute({
      sql: `SELECT destination, category, budget_type, payload, unique_image_id, updated_at FROM ${CACHE_TABLE}`,
    });
    return result.rows.map((row: any) => {
      const payload = row.payload ? (typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload) : null;
      return {
        destination: row.destination || payload?.destination || "",
        category: row.category || payload?.category || "international",
        budgetType: row.budget_type || payload?.budgetType || "medium",
        imageUrl: payload?.imageUrl || "",
        uniqueImageId: row.unique_image_id || payload?.uniqueImageId || "",
        updatedAt: row.updated_at || new Date(0).toISOString(),
      };
    });
  } catch (error: any) {
    throw new Error(`Failed to fetch image cache seeds: ${error.message}`);
  }
};

export const overridePackageImage = async (packageId: string, imageUrl: string, imageAlt?: string) => {
  const nowIso = new Date().toISOString();
  const generatedImageId = `admin-${packageId}-${Math.abs(imageUrl.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0))}`;

  const hit = await getPackageByIdFromCache(packageId);
  if (!hit) return null;

  const updatedPayload: TravelPackage = {
    ...hit,
    imageUrl,
    image: imageUrl,
    imageAlt: imageAlt || hit.imageAlt || `${hit.destination} travel package`,
    imageSource: "admin",
    uniqueImageId: generatedImageId,
    lastUpdatedAt: nowIso,
  };

  try {
    await db.execute({
      sql: `UPDATE ${CACHE_TABLE} SET 
              unique_image_id = ?, 
              payload = ?, 
              updated_at = ? 
            WHERE package_id = ?`,
      args: [
        generatedImageId,
        JSON.stringify(updatedPayload),
        nowIso,
        packageId,
      ],
    });
    return updatedPayload;
  } catch (error: any) {
    throw new Error(`Failed to override package image: ${error.message}`);
  }
};

export const hasActiveBookingsForPackage = async (packageId: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM bookings 
            WHERE package_id = ? 
            AND (payment_verified = 1 OR payment_status IN ('pending', 'paid', 'confirmed'))`,
      args: [packageId],
    });
    return Number(result.rows[0]?.cnt || 0) > 0;
  } catch (error: any) {
    throw new Error(`Failed to verify active bookings: ${error.message}`);
  }
};

export const getPackageVersionHistory = async (packageId: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT id, package_id, version_number, created_at, created_by, is_active, price, duration_days 
            FROM package_versions WHERE package_id = ? ORDER BY version_number DESC`,
      args: [packageId],
    });
    return result.rows.map((row: any) => ({
      id: row.id,
      package_id: row.package_id,
      version_number: Number(row.version_number),
      created_at: row.created_at,
      created_by: row.created_by,
      is_active: !!row.is_active,
      price: row.price !== null ? Number(row.price) : null,
      duration_days: row.duration_days !== null ? Number(row.duration_days) : null,
    }));
  } catch (error: any) {
    throw new Error(`Failed to fetch package version history: ${error.message}`);
  }
};

export const updatePackageGroupBookings = async (packageId: string, travelDate: string, travelers: number) => {
  const hit = await getPackageByIdFromCache(packageId);
  if (!hit) return null;

  const departures = hit.groupDepartures || [];
  const departure = departures.find((d: any) => d.date === travelDate);
  if (!departure) return null;

  departure.currentBookings += travelers;
  const updatedPayload = {
    ...hit,
    groupDepartures: departures,
  };

  try {
    await db.execute({
      sql: `UPDATE ${CACHE_TABLE} SET 
              group_departures_json = ?, 
              payload = ?, 
              updated_at = ? 
            WHERE package_id = ?`,
      args: [
        JSON.stringify(departures),
        JSON.stringify(updatedPayload),
        new Date().toISOString(),
        packageId,
      ],
    });
    return updatedPayload;
  } catch (error: any) {
    throw new Error(`Failed to update group bookings: ${error.message}`);
  }
};

export const deletePackageFromCache = async (packageId: string) => {
  try {
    const result = await db.execute({
      sql: `DELETE FROM ${CACHE_TABLE} WHERE package_id = ?`,
      args: [packageId],
    });
    return result.rowsAffected > 0;
  } catch (error: any) {
    throw new Error(`Failed to delete package: ${error.message}`);
  }
};
