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

const port = toNumber(process.env.PORT, 3000);

const resolvedJwtSecret = process.env.JWT_SECRET || "fallback_secret_change_me";
if (resolvedJwtSecret === "fallback_secret_change_me" || resolvedJwtSecret === "temp_secret") {
  console.warn(
    "\n⚠️  WARNING: JWT_SECRET is set to an insecure default!\n" +
    "   Set a strong, random JWT_SECRET in your .env file before deploying.\n"
  );
}

export const config = {
  port,
  jwtSecret: resolvedJwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: toNumber(process.env.SMTP_PORT, 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  resendFrom: process.env.RESEND_FROM || "",
  backendUrl: process.env.BACKEND_URL || `http://localhost:${port}`,
  supportEmail: process.env.SUPPORT_EMAIL || "travelmate713@gmail.com",
  supportPhone: process.env.SUPPORT_PHONE || "+91 9342180670",
  socialLinksLabel: process.env.SOCIAL_LINKS_LABEL || "Instagram | YouTube | LinkedIn",
  brandLogoUrl: process.env.BRAND_LOGO_URL || "",
  bookingTicketsBucket: process.env.SUPABASE_BOOKING_TICKETS_BUCKET || "booking-tickets",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:8081",
  tursoDatabaseUrl: process.env.TURSO_DATABASE_URL || process.env.STORAGE_TURSO_DATABASE_URL || "file:auth.db",
  tursoAuthToken: process.env.TURSO_AUTH_TOKEN || process.env.STORAGE_TURSO_AUTH_TOKEN || "",
  pexelsApiKey: process.env.PEXELS_API_KEY || "",
  amadeusBaseUrl: process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com",
  amadeusClientId: process.env.AMADEUS_CLIENT_ID || "",
  amadeusClientSecret: process.env.AMADEUS_CLIENT_SECRET || "",
  packageOriginIata: process.env.PACKAGE_ORIGIN_IATA || "MAA",
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
  razorpayKeyId: (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "").trim(),
  razorpayKeySecret: (process.env.RAZORPAY_KEY_SECRET || "").trim(),
};
