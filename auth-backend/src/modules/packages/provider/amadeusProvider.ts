import { config } from "../../../config/env";
import { CATEGORY_LABELS, DEFAULT_EXCLUSIONS, DEFAULT_INCLUSIONS } from "../constants";
import type {
  BudgetType,
  HotelType,
  PackageCategory,
  SeasonType,
  TransportMode,
  TravelPackage,
} from "../types";

type AmadeusTokenResponse = {
  access_token: string;
  expires_in: number;
};

type FlightDestination = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  price?: { total?: string };
};

type FlightDestinationsResponse = {
  data: FlightDestination[];
};

type LocationResponse = {
  data?: Array<{
    name?: string;
    address?: {
      cityName?: string;
      countryName?: string;
      countryCode?: string;
    };
  }>;
};

type PexelsPhoto = {
  id: number;
  src?: {
    large2x?: string;
    large?: string;
  };
};

type PexelsSearchResponse = {
  photos?: PexelsPhoto[];
};

type FallbackDestination = {
  origin: string;
  destination: string;
  label: string;
  location: string;
  country: string;
  countryCode: string;
  preferredCategory?: PackageCategory;
};

type TouristStateConfig = {
  state: string;
  hubCode: string;
  attractions: string[];
};

type BudgetRange = { min: number; max: number };
type ImageSourceType = "pexels" | "unsplash" | "fallback" | "admin";
type PackageImageAsset = { url: string; imageId: string; fetchedAt: number; source: ImageSourceType };

const INR_PER_USD = 83;
const DAY_MS = 24 * 60 * 60 * 1000;
const imageCache = new Map<string, PackageImageAsset>();
const imageSeedCache = new Map<string, PackageImageAsset>();
const usedImageIds = new Set<string>();
let cachedToken: { value: string; expiresAtMs: number } | null = null;

const CATEGORY_IMAGE_THEME: Record<PackageCategory, string> = {
  domestic: "india tourism landmarks",
  international: "city landmarks travel destination",
  nearby: "weekend getaway scenic views",
  budget: "budget travel public transport",
  honeymoon: "romantic sunset couple getaway",
  group: "group tour friends sightseeing",
  educational: "museum heritage educational tour",
};

const FALLBACK_IMAGES: Record<PackageCategory, string> = {
  domestic: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1400&q=80",
  international: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1400&q=80",
  nearby: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80",
  budget: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1400&q=80",
  honeymoon: "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1400&q=80",
  group: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80",
  educational: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1400&q=80",
};

const BUDGET_RANGES: Record<PackageCategory, BudgetRange> = {
  domestic: { min: 5000, max: 25000 },
  international: { min: 18000, max: 30000 },
  nearby: { min: 5000, max: 18000 },
  budget: { min: 5000, max: 22000 },
  honeymoon: { min: 8000, max: 25000 },
  group: { min: 7000, max: 25000 },
  educational: { min: 5000, max: 20000 },
};

const TOURIST_STATE_CONFIG: TouristStateConfig[] = [
  { state: "Kerala", hubCode: "COK", attractions: ["Munnar", "Alleppey", "Wayanad", "Thekkady", "Kovalam", "Varkala"] },
  { state: "Tamil Nadu", hubCode: "MAA", attractions: ["Ooty", "Kodaikanal", "Rameswaram", "Yercaud", "Mahabalipuram", "Kanyakumari"] },
  { state: "Karnataka", hubCode: "BLR", attractions: ["Coorg", "Chikmagalur", "Hampi", "Gokarna", "Mysuru", "Udupi"] },
  { state: "Andhra Pradesh", hubCode: "VTZ", attractions: ["Visakhapatnam", "Araku Valley", "Tirupati", "Lambasingi", "Horsley Hills"] },
  { state: "Telangana", hubCode: "HYD", attractions: ["Hyderabad", "Warangal", "Nagarjuna Sagar", "Bhadrachalam", "Ananthagiri Hills"] },
  { state: "Rajasthan", hubCode: "JAI", attractions: ["Jaipur", "Udaipur", "Jodhpur", "Jaisalmer", "Pushkar", "Mount Abu"] },
  { state: "Himachal Pradesh", hubCode: "DHM", attractions: ["Shimla", "Manali", "Dharamshala", "Dalhousie", "Kasol", "Spiti Valley"] },
  { state: "Uttarakhand", hubCode: "DED", attractions: ["Rishikesh", "Nainital", "Mussoorie", "Auli", "Jim Corbett", "Haridwar"] },
  { state: "Goa", hubCode: "GOI", attractions: ["Calangute", "Baga", "Dona Paula", "Palolem", "Old Goa", "Aguada Fort"] },
  { state: "Maharashtra", hubCode: "BOM", attractions: ["Mumbai", "Pune", "Lonavala", "Mahabaleshwar", "Nashik", "Alibaug"] },
  { state: "Gujarat", hubCode: "AMD", attractions: ["Ahmedabad", "Statue of Unity", "Gir", "Somnath", "Dwarka", "Rann of Kutch"] },
  { state: "Meghalaya", hubCode: "SHL", attractions: ["Shillong", "Cherrapunji", "Dawki", "Mawlynnong", "Laitlum", "Umiam"] },
  { state: "Sikkim", hubCode: "PYG", attractions: ["Gangtok", "Pelling", "Lachung", "Yumthang", "Namchi", "Ravangla"] },
  { state: "Arunachal Pradesh", hubCode: "IXT", attractions: ["Tawang", "Bomdila", "Ziro", "Itanagar", "Dirang", "Mechuka"] },
];

const limitedInternationalDestinations: FallbackDestination[] = [
  { origin: "DEL", destination: "DXB", label: "Dubai", location: "Dubai, UAE", country: "UAE", countryCode: "AE", preferredCategory: "international" },
  { origin: "DEL", destination: "SIN", label: "Singapore", location: "Singapore", country: "Singapore", countryCode: "SG", preferredCategory: "international" },
  { origin: "DEL", destination: "BKK", label: "Bangkok", location: "Bangkok, Thailand", country: "Thailand", countryCode: "TH", preferredCategory: "international" },
  { origin: "DEL", destination: "KUL", label: "Kuala Lumpur", location: "Kuala Lumpur, Malaysia", country: "Malaysia", countryCode: "MY", preferredCategory: "international" },
];

const allowedStateKeywords = TOURIST_STATE_CONFIG.map((entry) => entry.state.toLowerCase());
const allowedAttractionKeywords = TOURIST_STATE_CONFIG.flatMap((entry) => entry.attractions.map((item) => item.toLowerCase()));

const MIN_BUDGET_PRICE = 5000;
const TARGET_MAX_PRICE = 25000;
const MAX_ALLOWED_PRICE = 30000;
const MAX_INTL_PACKAGES = 12;
const FORBIDDEN_TITLE_WORDS = [
  "budget",
  "cheap",
  "affordable",
  "value",
  "low cost",
  "premium",
  "luxury",
  "best",
  "offer",
  "deal",
  "saver",
];

const toTitleCase = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

const stripForbiddenWords = (value: string) => {
  let out = value;
  FORBIDDEN_TITLE_WORDS.forEach((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    out = out.replace(new RegExp(`\\b${escaped}\\b`, "gi"), " ");
  });
  return out;
};

const sanitizeTitleToken = (value: string) =>
  value
    .replace(/[0-9]+/g, " ")
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\b(top|ranked|no)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const splitPlaces = (value: string) =>
  sanitizeTitleToken(
    value
      .replace(/\b(tour|trip|escape|getaway|holiday|journey|retreat|circuit)\b/gi, " ")
      .replace(/\s*&\s*/g, " and ")
      .replace(/\s+/g, " ")
  )
    .split(/\s*,\s*|\s+and\s+/i)
    .map((item) => sanitizeTitleToken(item))
    .filter(Boolean);

const dedupePlaces = (items: string[]) => {
  const map = new Map<string, string>();
  items.forEach((item) => {
    const key = item.toLowerCase();
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
};

const buildReliableDestinationLabel = (destinationLabel: string, locationLabel: string) => {
  const fromDestination = splitPlaces(destinationLabel);
  const fromLocation = splitPlaces(locationLabel.split(",").slice(0, 2).join(", "));
  const unique = dedupePlaces([...fromDestination, ...fromLocation]).slice(0, 2);
  if (unique.length === 0) return cleanDestinationName(destinationLabel, locationLabel);
  if (unique.length === 1) return toTitleCase(unique[0]);
  return `${toTitleCase(unique[0])} and ${toTitleCase(unique[1])}`;
};

const cleanDestinationName = (destinationLabel: string, locationLabel: string) => {
  const primary = sanitizeTitleToken(stripForbiddenWords(destinationLabel));
  if (primary) return toTitleCase(primary);

  const fallback = sanitizeTitleToken(
    stripForbiddenWords(
      locationLabel
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(" ")
    )
  );
  return toTitleCase(fallback || "Travel Destination");
};

const buildThemeSuffix = (category: PackageCategory) => {
  if (category === "honeymoon") return "Getaway";
  if (category === "group") return "Trip";
  if (category === "educational") return "Tour";
  if (category === "nearby") return "Escape";
  if (category === "international") return "Holiday";
  return "Tour";
};

const generateCleanPackageTitle = (destinationLabel: string, locationLabel: string, category: PackageCategory) => {
  const cleaned = buildReliableDestinationLabel(destinationLabel, locationLabel);
  const suffix = buildThemeSuffix(category);
  const title = `${cleaned} ${suffix}`.replace(/\s+/g, " ").trim();
  return sanitizeTitleToken(title).replace(/\s+/g, " ").trim() || "Travel Tour";
};

const normalizeDurationDays = (departureDate: string, returnDate: string) => {
  const departureMs = new Date(departureDate).getTime();
  const returnMs = new Date(returnDate).getTime();
  const diffDays = Math.ceil((returnMs - departureMs) / DAY_MS);
  const safeDays = Number.isFinite(diffDays) && diffDays > 0 ? diffDays : 4;
  return clamp(safeDays, 2, 5);
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const pickSeason = (dateIso: string): SeasonType => {
  const month = new Date(dateIso).getUTCMonth() + 1;
  if ([10, 11, 12, 1].includes(month)) return "peak";
  if ([2, 3, 9].includes(month)) return "shoulder";
  return "off-season";
};

const resolveHotelType = (category: PackageCategory, budgetType: BudgetType): HotelType => {
  if (category === "educational" || category === "budget" || budgetType === "low") return "budget";
  return "comfort";
};

const resolveTransportMode = (category: PackageCategory, budgetType: BudgetType, durationDays: number): TransportMode => {
  if (category === "educational" || category === "budget" || durationDays <= 3) return "public";
  return "shared";
};

const resolveBudgetType = (
  category: PackageCategory,
  peopleCount: number,
  season: SeasonType,
  durationDays: number
): BudgetType => {
  if (category === "educational" || peopleCount >= 6) return "low";
  if (category === "honeymoon" && season === "peak") return "medium";
  return "medium";
};

const computeGroupPerPersonDiscount = (peopleCount: number) => {
  if (peopleCount <= 2) return 1;
  if (peopleCount <= 4) return 0.92;
  if (peopleCount <= 8) return 0.82;
  return 0.75;
};

const computePriceRangeLabel = (price: number): string => {
  if (price <= 20000) return "Rs 2,000 - Rs 20,000";
  if (price <= 50000) return "Rs 20,001 - Rs 50,000";
  if (price <= 100000) return "Rs 50,001 - Rs 1 Lakh";
  if (price <= 300000) return "Rs 1 Lakh - Rs 3 Lakhs";
  return "Rs 3 Lakhs+";
};

const resolveCategory = (
  countryCode: string | undefined,
  durationDays: number,
  preferredCategory?: PackageCategory
): PackageCategory => {
  if (preferredCategory && preferredCategory !== "international") return preferredCategory;
  if (countryCode !== "IN") return "international";
  if (durationDays <= 3) return "nearby";
  if (durationDays === 4) return "budget";
  return "domestic";
};

const computeSmartPriceInr = ({
  category,
  durationDays,
  season,
  hotelType,
  transportMode,
  peopleCount,
  fareUsd,
  budgetType,
}: {
  category: PackageCategory;
  durationDays: number;
  season: SeasonType;
  hotelType: HotelType;
  transportMode: TransportMode;
  peopleCount: number;
  fareUsd: number;
  budgetType: BudgetType;
}) => {
  const range = BUDGET_RANGES[category] || BUDGET_RANGES.international;
  const base = range.min + ((range.max - range.min) * clamp((durationDays - 3) / 7, 0, 1));
  const seasonFactor = season === "peak" ? 1.2 : season === "shoulder" ? 1.05 : 0.88;
  const hotelFactor = hotelType === "premium" ? 1.35 : hotelType === "comfort" ? 1.08 : 0.85;
  const transportFactor = transportMode === "flight" ? 1.22 : transportMode === "shared" ? 1.03 : 0.87;
  const groupFactor = category === "group" ? computeGroupPerPersonDiscount(peopleCount) : computeGroupPerPersonDiscount(peopleCount);
  const budgetFactor = budgetType === "low" ? 0.9 : budgetType === "premium" ? 1.18 : 1;
  const airfareFactor = clamp(fareUsd * INR_PER_USD * 0.08, 1000, 16000);

  const raw = (base + airfareFactor) * seasonFactor * hotelFactor * transportFactor * groupFactor * budgetFactor;
  const clamped = clamp(raw, MIN_BUDGET_PRICE, Math.min(MAX_ALLOWED_PRICE, range.max));
  return Math.round(clamped / 500) * 500;
};

const computeAffordabilityScore = (price: number, category: PackageCategory, durationDays: number, budgetType: BudgetType) => {
  const range = BUDGET_RANGES[category] || BUDGET_RANGES.international;
  const normalized = 100 - ((price - range.min) / Math.max(1, range.max - range.min)) * 100;
  const budgetBoost = budgetType === "low" ? 10 : budgetType === "medium" ? 4 : -8;
  const durationBoost = durationDays >= 5 ? 5 : 0;
  return clamp(Math.round(normalized + budgetBoost + durationBoost), 20, 98);
};

const computeDiscount = (budgetType: BudgetType, season: SeasonType, affordabilityScore: number) => {
  const base = budgetType === "low" ? 12 : budgetType === "medium" ? 8 : 5;
  const seasonBoost = season === "off-season" ? 3 : 0;
  const valueBoost = affordabilityScore >= 75 ? 2 : 0;
  return clamp(base + seasonBoost + valueBoost, 3, 20);
};

const computeRating = (affordabilityScore: number, price: number, durationDays: number) => {
  const baseline = 3.8 + affordabilityScore / 80 + durationDays / 30 - price / 240000;
  return Number(clamp(Number(baseline.toFixed(1)), 3.7, 4.9));
};

const computeReviews = (category: PackageCategory, budgetType: BudgetType) => {
  const categoryBase = category === "domestic" || category === "group" || category === "nearby" ? 180 : 110;
  const budgetBoost = budgetType === "low" ? 45 : budgetType === "medium" ? 25 : 10;
  return categoryBase + budgetBoost;
};

const makeHighlights = ({
  destinationLabel,
  durationDays,
  hotelType,
  transportMode,
  budgetType,
  category,
}: {
  destinationLabel: string;
  durationDays: number;
  hotelType: HotelType;
  transportMode: TransportMode;
  budgetType: BudgetType;
  category: PackageCategory;
}) => [
  `Curated ${durationDays}-day budget itinerary in ${destinationLabel}`,
  hotelType === "budget" ? "Clean budget hotel in central area" : "Comfort hotel with breakfast",
  transportMode === "public" ? "Local public transport and sleeper-class options" : "Shared station and city transfers",
  category === "educational" ? "Student-focused museums and learning visits" : "Family-friendly local sightseeing and food experiences",
];

const buildSpecialTags = (category: PackageCategory, affordabilityScore: number, budgetType: BudgetType): string[] => {
  const tags: string[] = [];
  if (budgetType === "low" || affordabilityScore >= 75) tags.push("Best for budget travelers");
  if (category === "educational") tags.push("Student-friendly tours");
  if (category === "nearby" || category === "budget") tags.push("Weekend-ready budget trip");
  if (category === "group" || affordabilityScore >= 68) tags.push("Most popular low-cost package");
  if (category === "domestic" || category === "group") tags.push("Family-friendly");
  if (category === "honeymoon") tags.push("Budget honeymoon");
  return Array.from(new Set(tags));
};

const GENERIC_ACTIVITY_BLOCKLIST = new Set(["city visit", "local market walk", "budget food stop", "local sightseeing day"]);

const DESTINATION_ACTIVITY_DB: Record<string, string[]> = {
  shillong: [
    "Umiam Lake evening visit",
    "Elephant Falls trail",
    "Shillong Peak viewpoint",
    "Laitlum Canyon walk",
    "Khasi cultural village visit",
    "Police Bazaar shopping",
    "Local cafe and music lane experience",
    "Ward's Lake leisure walk",
  ],
  kerala: [
    "Backwater shikara ride",
    "Tea garden viewpoint walk",
    "Fort Kochi heritage quarter",
    "Kathakali cultural show",
    "Spice plantation visit",
    "Local seafood and Kerala thali tasting",
    "Beach sunset promenade",
    "Handloom and spice market browsing",
  ],
  goa: [
    "North Goa beach circuit",
    "Fontainhas heritage lane walk",
    "Dudhsagar viewpoint excursion",
    "Old Goa church and museum trail",
    "Sunset riverfront cruise point visit",
    "Local seafood shack experience",
    "Mapusa market shopping",
    "Quiet south beach relaxation stop",
  ],
  rajasthan: [
    "City Palace and old quarter walk",
    "Fort and rampart viewpoint tour",
    "Stepwell heritage stop",
    "Local bazaar handicraft browsing",
    "Rajasthani folk performance evening",
    "Traditional thali food trail",
    "Sunset lakefront walk",
    "Artisan workshop interaction",
  ],
  himachal: [
    "Mountain viewpoint drive",
    "Pine forest nature trail",
    "Monastery or temple circuit",
    "Local market and cafe street",
    "Riverfront relaxation stop",
    "Village walk with local guide",
    "Short adventure activity",
    "Handmade woolens shopping",
  ],
};

const normalizeActivityKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const cleanActivityText = (value: string) => value.replace(/\s+/g, " ").trim();

const getDestinationSpecificActivities = (destinationLabel: string, locationLabel: string) => {
  const merged = normalizeActivityKey(`${destinationLabel} ${locationLabel}`);
  const matched: string[] = [];
  Object.entries(DESTINATION_ACTIVITY_DB).forEach(([keyword, activities]) => {
    if (merged.includes(keyword)) {
      matched.push(...activities);
    }
  });
  return matched;
};

const buildBaseActivityPool = (destinationLabel: string) => [
  `Guided landmark sightseeing in ${destinationLabel}`,
  `${destinationLabel} nature viewpoint circuit`,
  `Local museum and heritage center visit`,
  `Street food and regional cuisine tasting`,
  `Public transport and old town exploration`,
  `Craft market and souvenir browsing`,
  `Sunset photo walk at a scenic point`,
  `Hidden gem neighborhood trail`,
  `Budget-friendly adventure activity`,
  `Lakeside or riverside leisure stop`,
  `Cultural performance or folk art session`,
  `Local village interaction experience`,
];

const makeItinerary = ({
  destinationLabel,
  durationDays,
  category,
  budgetType,
  transportMode,
  themeSeed,
}: {
  destinationLabel: string;
  durationDays: number;
  category: PackageCategory;
  budgetType: BudgetType;
  transportMode: TransportMode;
  themeSeed: number;
}) => {
  const totalDays = Math.max(2, Math.min(durationDays, 9));
  const used = new Set<string>();
  const pool = [
    ...getDestinationSpecificActivities(destinationLabel, destinationLabel),
    ...buildBaseActivityPool(destinationLabel),
  ]
    .map(cleanActivityText)
    .filter((item) => {
      const normalized = normalizeActivityKey(item);
      return normalized && !GENERIC_ACTIVITY_BLOCKLIST.has(normalized);
    });

  let cursor = Math.abs(themeSeed) % Math.max(pool.length, 1);
  const takeUnique = (count: number, preferred: string[] = []) => {
    const picked: string[] = [];
    const source = [...preferred, ...pool];
    for (let i = 0; i < source.length && picked.length < count; i += 1) {
      const item = cleanActivityText(source[(cursor + i) % source.length]);
      const key = normalizeActivityKey(item);
      if (!key || used.has(key) || GENERIC_ACTIVITY_BLOCKLIST.has(key)) continue;
      used.add(key);
      picked.push(item);
    }
    cursor = (cursor + count + 1) % Math.max(source.length, 1);
    while (picked.length < count) {
      const fallback = cleanActivityText(`${destinationLabel} local experience ${picked.length + 1}`);
      const key = normalizeActivityKey(fallback);
      if (!used.has(key)) {
        used.add(key);
        picked.push(fallback);
      } else {
        break;
      }
    }
    return picked;
  };

  const arrivalPreferred = [
    "Hotel check-in and rest",
    `Orientation walk around ${destinationLabel}`,
    "Easy evening stroll at a nearby attraction",
  ];
  const departurePreferred = [
    "Morning local shopping stop",
    "Leisure breakfast and checkout",
    transportMode === "public" ? "Public transfer to departure point" : "Shared transfer to departure point",
  ];

  const days = Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    if (day === 1) {
      return {
        day,
        title: `Arrival in ${destinationLabel}`,
        activities: takeUnique(3, arrivalPreferred),
      };
    }
    if (day === totalDays) {
      return {
        day,
        title: "Departure",
        activities: takeUnique(3, departurePreferred),
      };
    }

    const categoryPreferred: Record<PackageCategory, string[]> = {
      domestic: [`${destinationLabel} heritage and local life trail`, `${destinationLabel} cultural neighborhood walk`],
      international: [`${destinationLabel} city landmark circuit`, `${destinationLabel} cultural district experience`],
      nearby: [`Short nature trail near ${destinationLabel}`, `${destinationLabel} cafe and promenade visit`],
      budget: [`Free-entry attraction circuit in ${destinationLabel}`, `${destinationLabel} budget transit experience`],
      honeymoon: [`Scenic couple photo stop in ${destinationLabel}`, `Romantic sunset viewpoint in ${destinationLabel}`],
      group: [`Group-friendly sightseeing circuit in ${destinationLabel}`, `Team activity and local exploration`],
      educational: [`Museum and interpretation center tour in ${destinationLabel}`, `Guided history and learning walk`],
    };

    return {
      day,
      title: `${destinationLabel} Experience Day ${day}`,
      activities: takeUnique(3, categoryPreferred[category]),
    };
  });

  const nights = Array.from({ length: Math.max(durationDays - 1, 1) }, (_, index) => ({
    night: index + 1,
    accommodation: budgetType === "low" ? "Budget hotel stay" : "Comfort hotel stay",
    meals: "Breakfast",
  }));

  return { days, nights };
};

const getAmadeusToken = async (): Promise<string> => {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs > now + 30_000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.amadeusClientId,
    client_secret: config.amadeusClientSecret,
  });

  const response = await fetch(`${config.amadeusBaseUrl}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Amadeus token request failed: ${response.status} ${detail}`);
  }

  const payload = (await response.json()) as AmadeusTokenResponse;
  cachedToken = {
    value: payload.access_token,
    expiresAtMs: now + payload.expires_in * 1000,
  };

  return payload.access_token;
};

const getLocationDetails = async (token: string, iataCode: string) => {
  const url = new URL(`${config.amadeusBaseUrl}/v1/reference-data/locations`);
  url.searchParams.set("keyword", iataCode);
  url.searchParams.set("subType", "CITY,AIRPORT");
  url.searchParams.set("page[limit]", "1");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return {
      destinationLabel: iataCode,
      locationLabel: iataCode,
      country: "Unknown",
      countryCode: undefined,
    };
  }

  const payload = (await response.json()) as LocationResponse;
  const item = payload.data?.[0];
  const city = item?.address?.cityName || item?.name || iataCode;
  const country = item?.address?.countryName;
  const countryCode = item?.address?.countryCode;

  return {
    destinationLabel: city,
    locationLabel: country ? `${city}, ${country}` : city,
    country: country || "Unknown",
    countryCode,
  };
};

const normalizeAssetUrl = (url: string) => {
  if (url.includes("images.unsplash.com")) {
    return `${url}${url.includes("?") ? "&" : "?"}auto=format&fit=crop&w=1400&q=80`;
  }
  if (url.includes("pexels.com")) {
    return `${url}${url.includes("?") ? "&" : "?"}auto=compress&cs=tinysrgb&w=1400`;
  }
  return url;
};

const buildDestinationLandmarkKeywords = (destination: string) => {
  return [
    `${destination} landmarks`,
    `${destination} tourism`,
    `${destination} attractions`,
    `${destination} city skyline`,
  ];
};

const buildImageKeywords = (destination: string, category: PackageCategory, budgetType: BudgetType) => {
  const landmarkKeywords = buildDestinationLandmarkKeywords(destination);
  const categoryTheme = CATEGORY_IMAGE_THEME[category];
  const budgetTheme = budgetType === "low" ? "budget travel" : budgetType === "medium" ? "value travel" : "premium travel";
  return [
    ...landmarkKeywords.map((keyword) => `${keyword} ${categoryTheme}`),
    `${destination} ${budgetTheme}`,
    `${destination} travel photography`,
  ];
};

const getImageFromPexels = async (query: string, page: number) => {
  if (!config.pexelsApiKey) return null;

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "10");
  url.searchParams.set("page", String(page));
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url.toString(), {
    headers: { Authorization: config.pexelsApiKey },
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as PexelsSearchResponse;
  const photos = payload.photos || [];
  for (const photo of photos) {
    const imageId = `pexels-${photo.id}`;
    const imageUrl = photo.src?.large2x || photo.src?.large;
    if (!imageUrl || usedImageIds.has(imageId)) continue;

    usedImageIds.add(imageId);
    return { imageId, imageUrl: normalizeAssetUrl(imageUrl), source: "pexels" as const };
  }

  return null;
};

const getImageFromUnsplash = (query: string, salt: string) => {
  const key = query.toLowerCase().replace(/\s+/g, "-");
  const imageId = `unsplash-${key}-${salt}`;
  if (usedImageIds.has(imageId)) {
    return null;
  }
  usedImageIds.add(imageId);
  const imageUrl = normalizeAssetUrl(
    `https://source.unsplash.com/1600x900/?${encodeURIComponent(query)}&sig=${encodeURIComponent(salt)}`
  );
  return { imageId, imageUrl, source: "unsplash" as const };
};

const getFallbackImage = (destination: string, category: PackageCategory) => {
  const fallback = FALLBACK_IMAGES[category] || FALLBACK_IMAGES.international;
  const imageId = `fallback-${category}-${destination.toLowerCase().replace(/\s+/g, "-")}`;
  return { imageId, imageUrl: fallback, source: "fallback" as const };
};

const getDynamicPackageImage = async ({
  destination,
  category,
  budgetType,
  variantSeed,
}: {
  destination: string;
  category: PackageCategory;
  budgetType: BudgetType;
  variantSeed: string;
}) => {
  const cacheKey = `${destination}-${category}-${budgetType}-${variantSeed}`;
  const signatureKey = `${destination}-${category}-${budgetType}`.toLowerCase();
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < DAY_MS) {
    return cached;
  }
  const seeded = imageSeedCache.get(signatureKey);
  if (seeded) {
    imageCache.set(cacheKey, seeded);
    return seeded;
  }

  const keywords = buildImageKeywords(destination, category, budgetType);
  for (let i = 0; i < keywords.length; i += 1) {
    const pexelsImage = await getImageFromPexels(keywords[i], i + 1);
    if (pexelsImage) {
      const result: PackageImageAsset = {
        url: pexelsImage.imageUrl,
        imageId: pexelsImage.imageId,
        fetchedAt: Date.now(),
        source: pexelsImage.source,
      };
      imageCache.set(cacheKey, result);
      imageSeedCache.set(signatureKey, result);
      return result;
    }
  }

  for (let i = 0; i < keywords.length; i += 1) {
    const unsplashImage = getImageFromUnsplash(keywords[i], `${variantSeed}-${i + 1}`);
    if (unsplashImage) {
      const result: PackageImageAsset = {
        url: unsplashImage.imageUrl,
        imageId: unsplashImage.imageId,
        fetchedAt: Date.now(),
        source: unsplashImage.source,
      };
      imageCache.set(cacheKey, result);
      imageSeedCache.set(signatureKey, result);
      return result;
    }
  }

  const fallback = getFallbackImage(destination, category);
  return {
    url: fallback.imageUrl,
    imageId: fallback.imageId,
    fetchedAt: Date.now(),
    source: fallback.source,
  };
};

export const primeImageCacheSeeds = (
  seeds: Array<{ destination: string; category: PackageCategory; budgetType: BudgetType; imageUrl: string; uniqueImageId: string; updatedAt: string }>
) => {
  seeds.forEach((seed) => {
    if (!seed.imageUrl || !seed.uniqueImageId) return;
    usedImageIds.add(seed.uniqueImageId);
    const signatureKey = `${seed.destination}-${seed.category}-${seed.budgetType}`.toLowerCase();
    const seededAsset: PackageImageAsset = {
      url: seed.imageUrl,
      imageId: seed.uniqueImageId,
      fetchedAt: new Date(seed.updatedAt).getTime() || Date.now(),
      source: "fallback",
    };
    imageSeedCache.set(signatureKey, seededAsset);
  });
};

const createSmartPackage = async ({
  destination,
  destinationLabel,
  locationLabel,
  country,
  countryCode,
  preferredCategory,
  variantSeed,
}: {
  destination: FlightDestination;
  destinationLabel: string;
  locationLabel: string;
  country: string;
  countryCode?: string;
  preferredCategory?: PackageCategory;
  variantSeed: number;
}): Promise<TravelPackage | null> => {
  const fareUsd = Number(destination.price?.total || 0);
  if (!Number.isFinite(fareUsd) || fareUsd <= 0) return null;

  const durationDays = normalizeDurationDays(destination.departureDate, destination.returnDate);
  const category = resolveCategory(countryCode, durationDays, preferredCategory);
  const season = pickSeason(destination.departureDate);
  const peopleCount = category === "group" ? 6 : category === "educational" ? 12 : category === "nearby" ? 3 : 2;
  const budgetType = resolveBudgetType(category, peopleCount, season, durationDays);
  const hotelType = resolveHotelType(category, budgetType);
  const transportMode = resolveTransportMode(category, budgetType, durationDays);
  const price = computeSmartPriceInr({
    category,
    durationDays,
    season,
    hotelType,
    transportMode,
    peopleCount,
    fareUsd,
    budgetType,
  });
  if (price > MAX_ALLOWED_PRICE) return null;
  const affordabilityScore = computeAffordabilityScore(price, category, durationDays, budgetType);
  const discount = computeDiscount(budgetType, season, affordabilityScore);
  const rating = computeRating(affordabilityScore, price, durationDays);
  const reviews = computeReviews(category, budgetType) + (variantSeed % 34);
  const priceRange = computePriceRangeLabel(price);
  const isLuxury = false;
  const imageAsset = await getDynamicPackageImage({
    destination: destinationLabel,
    category,
    budgetType,
    variantSeed: `${destination.destination}-${destination.departureDate}-${variantSeed}`,
  });
  const cleanTitle = generateCleanPackageTitle(destinationLabel, locationLabel, category);
  const packageId = `amadeus-${destination.origin}-${destination.destination}-${destination.departureDate}-${variantSeed}`;
  const specialTags = buildSpecialTags(category, affordabilityScore, budgetType);
  const itinerary = makeItinerary({
    destinationLabel,
    durationDays,
    category,
    budgetType,
    transportMode,
    themeSeed: variantSeed,
  });
  const trendingScore = Number(((rating * reviews) / 100 + affordabilityScore / 25).toFixed(2));
  const imageAlt = `${destinationLabel} ${CATEGORY_LABELS[category]} package image`;

  return {
    id: packageId,
    packageId,
    source: "amadeus",
    category,
    categories: [category],
    categoryLabel: CATEGORY_LABELS[category],
    country,
    title: cleanTitle,
    destination: destinationLabel,
    location: locationLabel,
    duration: `${durationDays} Days / ${Math.max(durationDays - 1, 1)} Nights`,
    durationDays,
    price,
    discount,
    rating,
    reviews,
    shortDescription: `Affordable ${durationDays}-day ${destinationLabel} plan with budget hotels, shared transport, and local sightseeing for middle-class travelers.`,
    inclusions: DEFAULT_INCLUSIONS,
    exclusions: DEFAULT_EXCLUSIONS,
    imageUrl: imageAsset.url,
    imageAlt,
    imageSource: imageAsset.source,
    availableDates: [destination.departureDate, destination.returnDate],
    image: imageAsset.url,
    description: `A value-for-money ${durationDays}-day ${destinationLabel} package designed for families, students, and groups with safe, comfortable, and easy travel.`,
    highlights: makeHighlights({ destinationLabel, durationDays, hotelType, transportMode, budgetType, category }),
    included: DEFAULT_INCLUSIONS,
    excluded: DEFAULT_EXCLUSIONS,
    itinerary,
    trendingScore,
    budgetFriendly: price <= TARGET_MAX_PRICE || affordabilityScore >= 68,
    budgetType,
    priceRange,
    uniqueImageId: imageAsset.imageId,
    affordabilityScore,
    peopleCount,
    hotelType,
    transportMode,
    season,
    specialTags,
    isLuxury,
    lastUpdatedAt: new Date().toISOString(),
    pricingTier: price <= 16000 ? "budget" : "standard",
    travelerSegments:
      category === "educational"
        ? ["students", "groups"]
        : category === "group"
        ? ["groups", "families"]
        : category === "honeymoon"
        ? ["couples"]
        : ["families", "solo"],
    dynamicPricing: {
      finalPricePerPerson: price,
      basePricePerPerson: price,
      savingsPerPerson: 0,
      totalDiscountPercent: discount,
      discounts: [],
      breakdown: {
        hotel: Math.round(price * 0.32),
        transport: Math.round(price * 0.31),
        food: Math.round(price * 0.14),
        activities: Math.round(price * 0.12),
        taxes: Math.round(price * 0.1),
        subtotal: price,
        totalDiscount: 0,
        total: price,
        currency: "INR",
      },
      paymentPlans: [{ kind: "full", label: "Pay in full (best price)" }],
      upgradeOptions: [],
    },
    badges: { bestValue: false, mostAffordable: false },
    popularityScore: Math.round(rating * 20 + Math.log10(Math.max(10, reviews)) * 22),
    nearbyAlternatives: [],
  };
};

const createPackageFromDestination = async (
  token: string,
  destination: FlightDestination,
  preferredCategory?: PackageCategory,
  variantSeed = 1
): Promise<TravelPackage | null> => {
  const { destinationLabel, locationLabel, country, countryCode } = await getLocationDetails(token, destination.destination);
  return createSmartPackage({
    destination,
    destinationLabel,
    locationLabel,
    country,
    countryCode,
    preferredCategory,
    variantSeed,
  });
};

const buildAttractionCombo = (items: string[], start: number, count: number) => {
  const combo: string[] = [];
  for (let i = 0; i < count; i += 1) {
    combo.push(items[(start + i) % items.length]);
  }
  return Array.from(new Set(combo));
};

const buildUniqueStateCombos = (attractions: string[], maxCombos: number) => {
  const combos: string[][] = [];
  const seen = new Set<string>();
  for (let size = 2; size <= 4; size += 1) {
    for (let start = 0; start < attractions.length; start += 1) {
      const combo = buildAttractionCombo(attractions, start, size);
      if (combo.length < 2) continue;
      const key = combo.map((item) => item.toLowerCase()).join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      combos.push(combo);
      if (combos.length >= maxCombos) return combos;
    }
  }
  return combos;
};

const joinAttractionsForTitle = (attractions: string[]) => {
  if (attractions.length <= 1) return attractions[0] || "India";
  if (attractions.length === 2) return `${attractions[0]} and ${attractions[1]}`;
  const head = attractions.slice(0, -1).join(", ");
  return `${head} and ${attractions[attractions.length - 1]}`;
};

const isAllowedStrongTourismDomestic = (pkg: TravelPackage) => {
  const merged = `${pkg.destination} ${pkg.location}`.toLowerCase();
  const byState = allowedStateKeywords.some((keyword) => merged.includes(keyword));
  const byAttraction = allowedAttractionKeywords.some((keyword) => merged.includes(keyword));
  return byState || byAttraction;
};

const generateStateBasedDomesticPackages = async (baseDate: Date): Promise<TravelPackage[]> => {
  const packages: TravelPackage[] = [];
  const preferredCategories: PackageCategory[] = ["domestic", "nearby", "group", "educational", "honeymoon", "budget"];

  for (let stateIndex = 0; stateIndex < TOURIST_STATE_CONFIG.length; stateIndex += 1) {
    const stateConfig = TOURIST_STATE_CONFIG[stateIndex];
    const combos = buildUniqueStateCombos(stateConfig.attractions, 12);
    for (let variantIndex = 0; variantIndex < combos.length; variantIndex += 1) {
      const combo = combos[variantIndex];
      const destinationLabel = joinAttractionsForTitle(combo);
      const locationLabel = `${combo.join(", ")}, ${stateConfig.state}, India`;
      const durationDays = 2 + ((variantIndex + stateIndex) % 4); // 2..5
      const departure = new Date(baseDate.getTime() + (5 + stateIndex * 2 + variantIndex * 4) * DAY_MS);
      const arrival = new Date(departure.getTime() + (durationDays - 1) * DAY_MS);
      const fareUsd = 55 + stateIndex * 4 + variantIndex * 3;

      const synthetic: FlightDestination = {
        origin: "DEL",
        destination: `${stateConfig.hubCode}${variantIndex + 1}`,
        departureDate: departure.toISOString().slice(0, 10),
        returnDate: arrival.toISOString().slice(0, 10),
        price: { total: String(fareUsd) },
      };

      const created = await createSmartPackage({
        destination: synthetic,
        destinationLabel,
        locationLabel,
        country: "India",
        countryCode: "IN",
        preferredCategory: preferredCategories[(variantIndex + stateIndex) % preferredCategories.length],
        variantSeed: variantIndex + 1,
      });
      if (created) packages.push(created);
    }
  }

  return packages;
};

const generateFallbackPackages = async (): Promise<TravelPackage[]> => {
  const baseDate = new Date();
  const domestic = await generateStateBasedDomesticPackages(baseDate);
  const internationalGenerated: TravelPackage[] = [];
  for (let destinationIndex = 0; destinationIndex < limitedInternationalDestinations.length; destinationIndex += 1) {
    const entry = limitedInternationalDestinations[destinationIndex];
    for (let variantIndex = 0; variantIndex < 3; variantIndex += 1) {
      const durationDays = 3 + ((destinationIndex + variantIndex) % 3);
      const departure = new Date(baseDate.getTime() + (10 + destinationIndex * 3 + variantIndex * 9) * DAY_MS);
      const arrival = new Date(departure.getTime() + (durationDays - 1) * DAY_MS);
      const synthetic: FlightDestination = {
        origin: entry.origin,
        destination: entry.destination,
        departureDate: departure.toISOString().slice(0, 10),
        returnDate: arrival.toISOString().slice(0, 10),
        price: { total: String(130 + destinationIndex * 12 + variantIndex * 7) },
      };
      const created = await createSmartPackage({
        destination: synthetic,
        destinationLabel: entry.label,
        locationLabel: entry.location,
        country: entry.country,
        countryCode: entry.countryCode,
        preferredCategory: "international",
        variantSeed: variantIndex + 1,
      });
      if (created) internationalGenerated.push(created);
    }
  }

  const international = internationalGenerated.slice(0, MAX_INTL_PACKAGES);
  const ordered = [...domestic, ...international].sort((a, b) => b.trendingScore - a.trendingScore);
  return ordered.slice(0, Math.max(config.packageFetchLimit, 80));
};

export const fetchAmadeusPackages = async (): Promise<TravelPackage[]> => {
  if (!config.amadeusClientId || !config.amadeusClientSecret) {
    if (config.packageFallbackEnabled) {
      return generateFallbackPackages();
    }
    throw new Error("Amadeus credentials are missing");
  }

  const token = await getAmadeusToken();
  const url = new URL(`${config.amadeusBaseUrl}/v1/shopping/flight-destinations`);
  url.searchParams.set("origin", config.packageOriginIata);
  url.searchParams.set("maxPrice", String(config.packageMaxPriceUsd));
  url.searchParams.set("viewBy", "DATE");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Amadeus package fetch failed: ${response.status} ${detail}`);
  }

  const payload = (await response.json()) as FlightDestinationsResponse;
  const sliced = (payload.data || []).slice(0, Math.max(config.packageFetchLimit, 80));
  const generated = await Promise.all(
    sliced.map((item, index) => createPackageFromDestination(token, item, undefined, (index % 3) + 1))
  );
  const validPackages = generated.filter((pkg): pkg is TravelPackage => Boolean(pkg));

  const liveDomestic = validPackages.filter((pkg) => pkg.country === "India" && isAllowedStrongTourismDomestic(pkg));
  const fallback = await generateFallbackPackages();
  const fallbackDomestic = fallback.filter((pkg) => pkg.country === "India");
  const fallbackInternational = fallback.filter((pkg) => pkg.country !== "India").slice(0, MAX_INTL_PACKAGES);

  const mergedDomestic = [...liveDomestic, ...fallbackDomestic];
  const byId = new Map<string, TravelPackage>();
  mergedDomestic.forEach((pkg) => {
    if (pkg.price >= MIN_BUDGET_PRICE && pkg.price <= MAX_ALLOWED_PRICE) {
      byId.set(pkg.id, pkg);
    }
  });
  const domestic = Array.from(byId.values());

  if (!domestic.length && config.packageFallbackEnabled) {
    return fallback;
  }

  const ordered = [...domestic, ...fallbackInternational].sort((a, b) => {
    if (a.country !== b.country) return a.country === "India" ? -1 : 1;
    if (a.budgetType !== b.budgetType) {
      if (a.budgetType === "low") return -1;
      if (b.budgetType === "low") return 1;
    }
    return b.trendingScore - a.trendingScore;
  });

  return ordered;
};

