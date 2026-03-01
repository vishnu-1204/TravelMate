import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../../../config/env";
import type { BudgetType, PackageCategory, TravelPackage } from "../types";
import { classifyPackageCategories, pickPrimaryCategory } from "../service/packageCategorizer";
import { CATEGORY_LABELS } from "../constants";

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
  is_luxury: boolean;
  is_group_tour: boolean;
  group_departures: string; // JSON string
  duration_days: number;
  price: number;
  rating: number;
  budget_friendly: boolean;
  trending_score: number;
  payload: TravelPackage;
  updated_at: string;
  expires_at: string;
};

const CACHE_TABLE = "travel_packages_cache";

let cachedClient: SupabaseClient | null = null;
let inMemoryCache: CacheRow[] = [];

const hasSupabaseConfig = () => Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);

const getClient = () => {
  if (!hasSupabaseConfig()) return null;
  if (cachedClient) return cachedClient;

  cachedClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
};

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

const fuzzyContains = (haystack: string, term: string) => {
  const text = normalizeSearch(haystack);
  const needle = normalizeSearch(term);
  if (!text || !needle) return false;
  if (text.includes(needle)) return true;
  const words = text.split(/\s+/).filter(Boolean);
  const threshold = needle.length >= 8 ? 2 : 1;
  return words.some((word) => editDistance(word, needle) <= threshold);
};

export const getCacheHealth = async () => {
  const client = getClient();
  if (!client) {
    const latest = inMemoryCache
      .slice()
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
    return {
      hasData: Boolean(latest),
      latestUpdatedAt: latest?.updated_at || null,
      latestExpiresAt: latest?.expires_at || null,
    };
  }

  const { data, error } = await client
    .from(CACHE_TABLE)
    .select("updated_at, expires_at")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to inspect package cache: ${error.message}`);
  }

  const latest = data?.[0];
  return {
    hasData: Boolean(latest),
    latestUpdatedAt: latest?.updated_at || null,
    latestExpiresAt: latest?.expires_at || null,
  };
};

export const upsertPackages = async (packages: TravelPackage[]) => {
  if (!packages.length) return;

  const nowIso = new Date().toISOString();
  const expiresAtIso = new Date(Date.now() + config.packageCacheTtlMinutes * 60_000).toISOString();
  const rows = packages.map((pkg) => ({
    ...(() => {
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
        package_id: pkg.id,
        source: payload.source,
        title: payload.title,
        destination: payload.destination,
        country: payload.country,
        category,
        categories,
        budget_type: payload.budgetType,
        price_range: payload.priceRange,
        unique_image_id: payload.uniqueImageId,
        affordability_score: payload.affordabilityScore,
        is_luxury: payload.isLuxury,
        is_group_tour: pkg.isGroupTour || false,
        group_departures: JSON.stringify(pkg.groupDepartures || []),
        duration_days: payload.durationDays,
        price: payload.price,
        rating: payload.rating,
        budget_friendly: payload.budgetFriendly,
        trending_score: payload.trendingScore,
        payload,
        updated_at: nowIso,
        expires_at: expiresAtIso,
      };
    })(),
  }));

  const client = getClient();
  if (!client) {
    const map = new Map<string, CacheRow>(inMemoryCache.map((row) => [row.package_id, row]));
    (rows as CacheRow[]).forEach((row) => map.set(row.package_id, row));
    inMemoryCache = Array.from(map.values());
    return;
  }
  const { error } = await client.from(CACHE_TABLE).upsert(rows, { onConflict: "package_id" });
  if (error) {
    throw new Error(`Failed to upsert package cache: ${error.message}`);
  }
};

export const pruneExpiredRows = async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const client = getClient();
  if (!client) {
    inMemoryCache = inMemoryCache.filter((row) => row.expires_at >= cutoff);
    return;
  }
  const { error } = await client.from(CACHE_TABLE).delete().lt("expires_at", cutoff);
  if (error) {
    throw new Error(`Failed to prune package cache: ${error.message}`);
  }
};

export const getPackagesFromCache = async (query: CacheQuery) => {
  const client = getClient();
  if (!client) {
    let rows = [...inMemoryCache];
    rows = rows.map((row) => ({
      ...row,
      country: row.country || inferCountryFromRow(row),
      payload: {
        ...row.payload,
        country: row.payload.country || row.country || inferCountryFromRow(row),
        isGroupTour: row.is_group_tour,
        groupDepartures: row.group_departures ? JSON.parse(row.group_departures) : [],
      },
    }));
    if (query.category) rows = rows.filter((row) => row.category === query.category);
    if (query.category === "international") rows = rows.filter((row) => !isLikelyIndianRow(row));
    if (query.category === "domestic") rows = rows.filter((row) => isLikelyIndianRow(row));
    if (query.categories?.length) {
      rows = rows.filter((row) => query.categories!.some((category) => row.categories.includes(category)));
      const includesInternational = query.categories.includes("international");
      const includesDomestic = query.categories.includes("domestic");
      if (includesInternational && !includesDomestic) {
        rows = rows.filter((row) => !isLikelyIndianRow(row));
      } else if (includesDomestic && !includesInternational) {
        rows = rows.filter((row) => isLikelyIndianRow(row));
      }
    }
    if (query.destination) {
      const d = query.destination.toLowerCase();
      rows = rows.filter((row) => row.destination.toLowerCase().includes(d));
    }
    if (typeof query.minPrice === "number") {
      const minPrice = query.minPrice;
      rows = rows.filter((row) => row.price >= minPrice);
    }
    if (typeof query.maxPrice === "number") {
      const maxPrice = query.maxPrice;
      rows = rows.filter((row) => row.price <= maxPrice);
    }
    if (typeof query.minDuration === "number") {
      const minDuration = query.minDuration;
      rows = rows.filter((row) => row.duration_days >= minDuration);
    }
    if (typeof query.maxDuration === "number") {
      const maxDuration = query.maxDuration;
      rows = rows.filter((row) => row.duration_days <= maxDuration);
    }
    if (typeof query.minRating === "number") {
      const minRating = query.minRating;
      rows = rows.filter((row) => row.rating >= minRating);
    }
    if (query.budgetType) {
      rows = rows.filter((row) => row.budget_type === query.budgetType);
    }
    if (!query.premiumUser) {
      rows = rows.filter((row) => !row.is_luxury);
    }
    const searchTerms = query.searchTerms?.length
      ? query.searchTerms.map((term) => term.toLowerCase()).filter(Boolean)
      : query.q
      ? [query.q.toLowerCase()]
      : [];
    if (searchTerms.length) {
      rows = rows.filter((row) => {
        const text = `${row.destination} ${row.title} ${row.payload.title} ${row.payload.location}`;
        return searchTerms.some((term) => fuzzyContains(text, term));
      });
    }

    const sortField = mapSortField(query.sortBy);
    rows.sort((a, b) => {
      const x = (a as unknown as Record<string, number>)[sortField] || 0;
      const y = (b as unknown as Record<string, number>)[sortField] || 0;
      return query.sortOrder === "asc" ? x - y : y - x;
    });

    const total = rows.length;
    const paged = rows.slice(query.offset, query.offset + query.limit);
    return { packages: paged.map((row) => row.payload), total };
  }

  let request = client.from(CACHE_TABLE).select("*", { count: "exact" });

  if (query.category) request = request.eq("category", query.category);
  if (query.category === "international") request = request.neq("country", "India");
  if (query.category === "domestic") request = request.eq("country", "India");
  if (query.categories?.length) request = request.overlaps("categories", query.categories);
  if (query.categories?.length) {
    const includesInternational = query.categories.includes("international");
    const includesDomestic = query.categories.includes("domestic");
    if (includesInternational && !includesDomestic) {
      request = request.neq("country", "India");
    } else if (includesDomestic && !includesInternational) {
      request = request.eq("country", "India");
    }
  }
  if (query.destination) request = request.ilike("destination", `%${query.destination}%`);
  if (typeof query.minPrice === "number") request = request.gte("price", query.minPrice);
  if (typeof query.maxPrice === "number") request = request.lte("price", query.maxPrice);
  if (typeof query.minDuration === "number") request = request.gte("duration_days", query.minDuration);
  if (typeof query.maxDuration === "number") request = request.lte("duration_days", query.maxDuration);
  if (typeof query.minRating === "number") request = request.gte("rating", query.minRating);
  if (query.budgetType) request = request.eq("budget_type", query.budgetType);
  if (!query.premiumUser) request = request.eq("is_luxury", false);

  const searchTerms = query.searchTerms?.length
    ? query.searchTerms
    : query.q
    ? [query.q]
    : [];
  if (searchTerms.length) {
    const orFilters = searchTerms
      .map((term) => term.replace(/[%_,]/g, "").trim())
      .filter(Boolean)
      .map((term) => `destination.ilike.%${term}%,title.ilike.%${term}%`)
      .join(",");
    if (orFilters) {
      request = request.or(orFilters);
    }
  }

  const sortField = mapSortField(query.sortBy);
  request = request.order(sortField, { ascending: query.sortOrder === "asc" });

  const from = query.offset;
  const to = query.offset + query.limit - 1;
  request = request.range(from, to);

  const { data, error, count } = await request;
  if (error) {
    throw new Error(`Failed to fetch packages from cache: ${error.message}`);
  }

  const rows = (data || []) as unknown as CacheRow[];
  return {
    packages: rows.map((row) => {
      const country = inferCountryFromRow(row);
      return {
        ...row.payload,
        country,
        isGroupTour: row.is_group_tour,
        groupDepartures: row.group_departures ? JSON.parse(row.group_departures) : [],
      };
    }),
    total: count || 0,
  };
};

export const getPackageByIdFromCache = async (packageId: string): Promise<TravelPackage | null> => {
  const client = getClient();
  if (!client) {
    const row = inMemoryCache.find((row) => row.package_id === packageId);
    return row ? {
      ...row.payload,
      isGroupTour: row.is_group_tour,
      groupDepartures: row.group_departures ? JSON.parse(row.group_departures) : [],
    } : null;
  }
  const { data, error } = await client
    .from(CACHE_TABLE)
    .select("*")
    .eq("package_id", packageId)
    .maybeSingle();

  const row = (data as unknown as CacheRow);
  if (!row?.payload) return null;

  return {
    ...row.payload,
    isGroupTour: row.is_group_tour,
    groupDepartures: row.group_departures ? JSON.parse(row.group_departures) : [],
  };
};

export const getCategoryCountsFromCache = async () => {
  const client = getClient();
  const countMap = new Map<PackageCategory, number>();

  if (!client) {
    inMemoryCache.forEach((row) => {
      row.categories.forEach((category) => {
        countMap.set(category, (countMap.get(category) || 0) + 1);
      });
    });
    return countMap;
  }

  const { data, error } = await client.from(CACHE_TABLE).select("categories");
  if (error) {
    throw new Error(`Failed to fetch package category counts: ${error.message}`);
  }

  (data || []).forEach((row) => {
    const typed = row as { categories?: PackageCategory[]; category?: PackageCategory };
    const categories = (typed.categories?.length ? typed.categories : typed.category ? [typed.category] : []) as PackageCategory[];
    categories.forEach((category) => {
      countMap.set(category, (countMap.get(category) || 0) + 1);
    });
  });

  return countMap;
};

export const overridePackageCategories = async (packageId: string, categories: PackageCategory[]) => {
  const primaryCategory = pickPrimaryCategory(categories);
  const singleCategory = [primaryCategory];

  const client = getClient();
  if (!client) {
    const index = inMemoryCache.findIndex((row) => row.package_id === packageId);
    if (index < 0) return null;

    const row = inMemoryCache[index];
    const payload: TravelPackage = {
      ...row.payload,
      category: primaryCategory,
      categories: singleCategory,
      categoryLabel: CATEGORY_LABELS[primaryCategory],
      lastUpdatedAt: new Date().toISOString(),
    };

    inMemoryCache[index] = {
      ...row,
      category: primaryCategory,
      categories: singleCategory,
      payload,
      updated_at: new Date().toISOString(),
    };

    return payload;
  }

  const { data: hit, error: fetchError } = await client
    .from(CACHE_TABLE)
    .select("payload")
    .eq("package_id", packageId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to fetch package for category override: ${fetchError.message}`);
  }
  if (!hit?.payload) return null;

  const payload = hit.payload as TravelPackage;
  const updatedPayload: TravelPackage = {
    ...payload,
    category: primaryCategory,
    categories: singleCategory,
    categoryLabel: CATEGORY_LABELS[primaryCategory],
    lastUpdatedAt: new Date().toISOString(),
  };

  const { error } = await client
    .from(CACHE_TABLE)
    .update({
      category: primaryCategory,
      categories: singleCategory,
      payload: updatedPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("package_id", packageId);

  if (error) {
    throw new Error(`Failed to override package categories: ${error.message}`);
  }

  return updatedPayload;
};

export const getImageCacheSeeds = async () => {
  const client = getClient();
  if (!client) {
    return inMemoryCache.map((row) => ({
      destination: row.payload.destination,
      category: row.payload.category,
      budgetType: row.payload.budgetType,
      imageUrl: row.payload.imageUrl,
      uniqueImageId: row.payload.uniqueImageId,
      updatedAt: row.updated_at,
    }));
  }

  const { data, error } = await client.from(CACHE_TABLE).select("destination, category, budget_type, payload, unique_image_id, updated_at");
  if (error) {
    throw new Error(`Failed to fetch image cache seeds: ${error.message}`);
  }

  return (data || []).map((row) => {
    const typed = row as {
      destination?: string;
      category?: PackageCategory;
      budget_type?: BudgetType;
      unique_image_id?: string;
      updated_at?: string;
      payload?: TravelPackage;
    };
    return {
      destination: typed.destination || typed.payload?.destination || "",
      category: typed.category || typed.payload?.category || "international",
      budgetType: typed.budget_type || typed.payload?.budgetType || "medium",
      imageUrl: typed.payload?.imageUrl || "",
      uniqueImageId: typed.unique_image_id || typed.payload?.uniqueImageId || "",
      updatedAt: typed.updated_at || new Date(0).toISOString(),
    };
  });
};

export const overridePackageImage = async (packageId: string, imageUrl: string, imageAlt?: string) => {
  const client = getClient();
  const nowIso = new Date().toISOString();
  const generatedImageId = `admin-${packageId}-${Math.abs(imageUrl.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0))}`;

  if (!client) {
    const index = inMemoryCache.findIndex((row) => row.package_id === packageId);
    if (index < 0) return null;

    const row = inMemoryCache[index];
    const payload: TravelPackage = {
      ...row.payload,
      imageUrl,
      image: imageUrl,
      imageAlt: imageAlt || row.payload.imageAlt || `${row.payload.destination} travel package`,
      imageSource: "admin",
      uniqueImageId: generatedImageId,
      lastUpdatedAt: nowIso,
    };

    inMemoryCache[index] = {
      ...row,
      unique_image_id: generatedImageId,
      payload,
      updated_at: nowIso,
    };

    return payload;
  }

  const { data: hit, error: fetchError } = await client
    .from(CACHE_TABLE)
    .select("payload")
    .eq("package_id", packageId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to fetch package for image override: ${fetchError.message}`);
  }
  if (!hit?.payload) return null;

  const payload = hit.payload as TravelPackage;
  const updatedPayload: TravelPackage = {
    ...payload,
    imageUrl,
    image: imageUrl,
    imageAlt: imageAlt || payload.imageAlt || `${payload.destination} travel package`,
    imageSource: "admin",
    uniqueImageId: generatedImageId,
    lastUpdatedAt: nowIso,
  };

  const { error } = await client
    .from(CACHE_TABLE)
    .update({
      unique_image_id: generatedImageId,
      payload: updatedPayload,
      updated_at: nowIso,
    })
    .eq("package_id", packageId);

  if (error) {
    throw new Error(`Failed to override package image: ${error.message}`);
  }

  return updatedPayload;
};

export const hasActiveBookingsForPackage = async (packageId: string) => {
  const client = getClient();
  if (!client) {
    return false;
  }

  const { count, error } = await client
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("package_id", packageId)
    .or("payment_verified.eq.true,payment_status.in.(pending,paid,confirmed)");

  if (error) {
    throw new Error(`Failed to verify active bookings: ${error.message}`);
  }

  return (count || 0) > 0;
};

export const getPackageVersionHistory = async (packageId: string) => {
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from("package_versions")
    .select("id, package_id, version_number, created_at, created_by, is_active, price, duration_days")
    .eq("package_id", packageId)
    .order("version_number", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch package version history: ${error.message}`);
  }

  return (data || []) as Array<{
    id: string;
    package_id: string;
    version_number: number;
    created_at: string;
    created_by: string;
    is_active: boolean;
    price: number | null;
    duration_days: number | null;
  }>;
};

export const updatePackageGroupBookings = async (packageId: string, travelDate: string, travelers: number) => {
  const client = getClient();
  if (!client) {
    const index = inMemoryCache.findIndex((row) => row.package_id === packageId);
    if (index < 0) return null;

    const row = inMemoryCache[index];
    const departures = row.group_departures ? JSON.parse(row.group_departures) : [];
    const departure = departures.find((d: any) => d.date === travelDate);
    if (!departure) return null;

    departure.currentBookings += travelers;
    const updatedDepartures = JSON.stringify(departures);
    
    const updatedPayload = {
      ...row.payload,
      groupDepartures: departures
    };

    inMemoryCache[index] = {
      ...row,
      group_departures: updatedDepartures,
      payload: updatedPayload,
      updated_at: new Date().toISOString()
    };

    return updatedPayload;
  }

  const { data: hit, error: fetchError } = await client
    .from(CACHE_TABLE)
    .select("group_departures, payload")
    .eq("package_id", packageId)
    .maybeSingle();

  if (fetchError || !hit) return null;

  const departures = hit.group_departures ? JSON.parse(hit.group_departures) : [];
  const departure = departures.find((d: any) => d.date === travelDate);
  if (!departure) return null;

  departure.currentBookings += travelers;
  const updatedPayload = {
    ...hit.payload,
    groupDepartures: departures
  };

  const { error } = await client
    .from(CACHE_TABLE)
    .update({
      group_departures: JSON.stringify(departures),
      payload: updatedPayload,
      updated_at: new Date().toISOString()
    })
    .eq("package_id", packageId);

  if (error) throw new Error(`Failed to update group bookings: ${error.message}`);
  return updatedPayload;
};

export const deletePackageFromCache = async (packageId: string) => {
  const client = getClient();
  if (!client) {
    const before = inMemoryCache.length;
    inMemoryCache = inMemoryCache.filter((row) => row.package_id !== packageId);
    return inMemoryCache.length < before;
  }

  const { error, count } = await client
    .from(CACHE_TABLE)
    .delete({ count: "exact" })
    .eq("package_id", packageId);

  if (error) {
    throw new Error(`Failed to delete package: ${error.message}`);
  }
  return (count || 0) > 0;
};
