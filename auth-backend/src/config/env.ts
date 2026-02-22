import dotenv from "dotenv";
dotenv.config();

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value === "true";
};

export const config = {
  port: toNumber(process.env.PORT, 3000),
  jwtSecret: process.env.JWT_SECRET || "fallback_secret_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: toNumber(process.env.SMTP_PORT, 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:8080",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  pexelsApiKey: process.env.PEXELS_API_KEY || "",
  amadeusBaseUrl: process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com",
  amadeusClientId: process.env.AMADEUS_CLIENT_ID || "",
  amadeusClientSecret: process.env.AMADEUS_CLIENT_SECRET || "",
  packageOriginIata: process.env.PACKAGE_ORIGIN_IATA || "DEL",
  packageMaxPriceUsd: toNumber(process.env.PACKAGE_MAX_PRICE_USD, 2500),
  packageFetchLimit: toNumber(process.env.PACKAGE_FETCH_LIMIT, 40),
  packageCacheTtlMinutes: toNumber(process.env.PACKAGE_CACHE_TTL_MINUTES, 720),
  packageBudgetThresholdUsd: toNumber(process.env.PACKAGE_BUDGET_THRESHOLD_USD, 700),
  packageHoneymoonThresholdUsd: toNumber(process.env.PACKAGE_HONEYMOON_THRESHOLD_USD, 1400),
  packageDomesticCountryCode: process.env.PACKAGE_DOMESTIC_COUNTRY_CODE || "IN",
  packageAllowColdRefreshOnItemMiss: process.env.PACKAGE_COLD_REFRESH_ON_ITEM_MISS === "true",
  packageRefreshIntervalMinutes: toNumber(process.env.PACKAGE_REFRESH_INTERVAL_MINUTES, 360),
  packageRateLimitWindowMs: toNumber(process.env.PACKAGE_RATE_LIMIT_WINDOW_MS, 60_000),
  packageRateLimitMaxRequests: toNumber(process.env.PACKAGE_RATE_LIMIT_MAX_REQUESTS, 80),
  packageFallbackEnabled: toBoolean(process.env.PACKAGE_FALLBACK_ENABLED, true),
  packageAdminToken: process.env.PACKAGE_ADMIN_TOKEN || "",
};
