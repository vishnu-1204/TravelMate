import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../../../config/env";
import type { PackageCategory, TravelPackage } from "../types";

type CacheRow = {
  package_id: string;
  source: string;
  title: string;
  destination: string;
  category: PackageCategory;
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
  category?: PackageCategory;
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
  minRating?: number;
  sortBy: "price" | "rating" | "duration" | "trending";
  sortOrder: "asc" | "desc";
  limit: number;
  offset: number;
};

const mapSortField = (sortBy: CacheQuery["sortBy"]) => {
  if (sortBy === "duration") return "duration_days";
  if (sortBy === "trending") return "trending_score";
  return sortBy;
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
    package_id: pkg.id,
    source: pkg.source,
    title: pkg.title,
    destination: pkg.destination,
    category: pkg.category,
    duration_days: pkg.durationDays,
    price: pkg.price,
    rating: pkg.rating,
    budget_friendly: pkg.budgetFriendly,
    trending_score: pkg.trendingScore,
    payload: { ...pkg, lastUpdatedAt: nowIso },
    updated_at: nowIso,
    expires_at: expiresAtIso,
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
    if (query.category) rows = rows.filter((row) => row.category === query.category);
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
    if (query.q) {
      const q = query.q.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.destination.toLowerCase().includes(q) ||
          row.title.toLowerCase().includes(q) ||
          row.payload.title.toLowerCase().includes(q)
      );
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
  if (query.destination) request = request.ilike("destination", `%${query.destination}%`);
  if (typeof query.minPrice === "number") request = request.gte("price", query.minPrice);
  if (typeof query.maxPrice === "number") request = request.lte("price", query.maxPrice);
  if (typeof query.minDuration === "number") request = request.gte("duration_days", query.minDuration);
  if (typeof query.maxDuration === "number") request = request.lte("duration_days", query.maxDuration);
  if (typeof query.minRating === "number") request = request.gte("rating", query.minRating);

  if (query.q) {
    const escaped = query.q.replace(/[%_]/g, "");
    request = request.or(`destination.ilike.%${escaped}%,title.ilike.%${escaped}%`);
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
    packages: rows.map((row) => row.payload),
    total: count || 0,
  };
};

export const getPackageByIdFromCache = async (packageId: string): Promise<TravelPackage | null> => {
  const client = getClient();
  if (!client) {
    const hit = inMemoryCache.find((row) => row.package_id === packageId);
    return hit ? hit.payload : null;
  }
  const { data, error } = await client
    .from(CACHE_TABLE)
    .select("payload")
    .eq("package_id", packageId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch package by id: ${error.message}`);
  }

  return (data?.payload as TravelPackage | undefined) || null;
};
