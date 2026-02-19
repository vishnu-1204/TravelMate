import { config } from "../../../config/env";
import { CATEGORY_LABELS, DEFAULT_EXCLUSIONS, DEFAULT_INCLUSIONS } from "../constants";
import type { PackageCategory, TravelPackage } from "../types";

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

let cachedToken: { value: string; expiresAtMs: number } | null = null;

type FallbackDestination = {
  origin: string;
  destination: string;
  label: string;
  location: string;
  countryCode: string;
  preferredCategory?: PackageCategory;
};

const fallbackDestinations: FallbackDestination[] = [
  { origin: "JFK", destination: "PAR", label: "Paris", location: "Paris, France", countryCode: "FR", preferredCategory: "honeymoon" },
  { origin: "JFK", destination: "ROM", label: "Rome", location: "Rome, Italy", countryCode: "IT", preferredCategory: "educational" },
  { origin: "JFK", destination: "BKK", label: "Bangkok", location: "Bangkok, Thailand", countryCode: "TH", preferredCategory: "adventure" },
  { origin: "JFK", destination: "NRT", label: "Tokyo", location: "Tokyo, Japan", countryCode: "JP", preferredCategory: "international" },
  { origin: "JFK", destination: "SYD", label: "Sydney", location: "Sydney, Australia", countryCode: "AU", preferredCategory: "group" },
  { origin: "JFK", destination: "DXB", label: "Dubai", location: "Dubai, UAE", countryCode: "AE", preferredCategory: "honeymoon" },
  { origin: "JFK", destination: "LHR", label: "London", location: "London, UK", countryCode: "GB", preferredCategory: "educational" },
  { origin: "JFK", destination: "AMS", label: "Amsterdam", location: "Amsterdam, Netherlands", countryCode: "NL", preferredCategory: "international" },
  { origin: "JFK", destination: "MAD", label: "Madrid", location: "Madrid, Spain", countryCode: "ES", preferredCategory: "international" },
  { origin: "JFK", destination: "CUN", label: "Cancun", location: "Cancun, Mexico", countryCode: "MX", preferredCategory: "adventure" },
  { origin: "JFK", destination: "LAX", label: "Los Angeles", location: "Los Angeles, USA", countryCode: "US", preferredCategory: "domestic" },
  { origin: "JFK", destination: "MIA", label: "Miami", location: "Miami, USA", countryCode: "US", preferredCategory: "domestic" },
  { origin: "JFK", destination: "SFO", label: "San Francisco", location: "San Francisco, USA", countryCode: "US", preferredCategory: "domestic" },
  { origin: "JFK", destination: "LAS", label: "Las Vegas", location: "Las Vegas, USA", countryCode: "US", preferredCategory: "group" },
  { origin: "JFK", destination: "HNL", label: "Honolulu", location: "Honolulu, USA", countryCode: "US", preferredCategory: "honeymoon" },
];

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

const normalizeDurationDays = (departureDate: string, returnDate: string) => {
  const departureMs = new Date(departureDate).getTime();
  const returnMs = new Date(returnDate).getTime();
  const diffDays = Math.ceil((returnMs - departureMs) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diffDays) && diffDays > 0 ? diffDays : 5;
};

const computeRating = (price: number, durationDays: number) => {
  const baseline = 4.8 - price / 900 + durationDays / 35;
  return Math.max(3.6, Math.min(4.9, Number(baseline.toFixed(1))));
};

const computeReviews = (price: number) => Math.max(22, Math.round(280 - price / 8));

const resolveCategory = (
  price: number,
  durationDays: number,
  countryCode?: string,
  preferredCategory?: PackageCategory
): PackageCategory => {
  if (preferredCategory) return preferredCategory;
  if (durationDays >= 9) return "group";
  if (countryCode && countryCode !== config.packageDomesticCountryCode) return "international";
  if (price <= config.packageBudgetThresholdUsd) return "domestic";
  if (price >= config.packageHoneymoonThresholdUsd) return "honeymoon";
  if (durationDays <= 4) return "adventure";
  return "educational";
};

const makeHighlights = (destinationLabel: string, durationDays: number) => [
  `Curated ${durationDays}-day itinerary in ${destinationLabel}`,
  "Top-rated hotels and central stays",
  "Airport and intercity transfer support",
  "Expert local assistance throughout trip",
];

const getPackageImageUrls = (seed: string) => {
  const normalizedSeed = seed.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    cardImage: `https://picsum.photos/seed/${normalizedSeed}-card/1200/800`,
    heroImage: `https://picsum.photos/seed/${normalizedSeed}-hero/1600/900`,
  };
};

const makeItinerary = (destinationLabel: string, durationDays: number) => {
  const days = Array.from({ length: Math.min(durationDays, 8) }, (_, index) => {
    const day = index + 1;
    if (day === 1) {
      return {
        day,
        title: `Arrival in ${destinationLabel}`,
        activities: ["Airport pickup", "Hotel check-in", "Evening orientation tour"],
      };
    }

    if (day === durationDays) {
      return {
        day,
        title: "Departure",
        activities: ["Breakfast", "Checkout", "Transfer to airport"],
      };
    }

    return {
      day,
      title: `Explore ${destinationLabel}`,
      activities: ["City highlights", "Local cuisine experience", "Leisure time"],
    };
  });

  const nights = Array.from({ length: Math.max(durationDays - 1, 1) }, (_, index) => ({
    night: index + 1,
    accommodation: "4-star hotel stay",
    meals: "Breakfast",
  }));

  return { days, nights };
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
    countryCode,
  };
};

const createPackageFromDestination = async (
  token: string,
  destination: FlightDestination
): Promise<TravelPackage | null> => {
  const price = Number(destination.price?.total || 0);
  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  const durationDays = normalizeDurationDays(destination.departureDate, destination.returnDate);
  const { destinationLabel, locationLabel, countryCode } = await getLocationDetails(token, destination.destination);
  const category = resolveCategory(price, durationDays, countryCode);
  const rating = computeRating(price, durationDays);
  const reviews = computeReviews(price);
  const packageId = `amadeus-${destination.origin}-${destination.destination}-${destination.departureDate}`;
  const trendingScore = Number(((rating * reviews) / 100).toFixed(2));
  const budgetFriendly = price <= config.packageBudgetThresholdUsd;
  const images = getPackageImageUrls(`${destinationLabel}-${destination.destination}`);

  return {
    id: packageId,
    packageId,
    source: "amadeus",
    category,
    categoryLabel: CATEGORY_LABELS[category],
    title: `${destinationLabel} Escape from ${destination.origin}`,
    destination: destinationLabel,
    location: locationLabel,
    duration: `${durationDays} Days / ${Math.max(durationDays - 1, 1)} Nights`,
    durationDays,
    price: Math.round(price),
    discount: price > 1200 ? 8 : 4,
    rating,
    reviews,
    shortDescription: `Discover ${destinationLabel} with a flexible ${durationDays}-day plan built from live fares.`,
    inclusions: DEFAULT_INCLUSIONS,
    exclusions: DEFAULT_EXCLUSIONS,
    imageUrl: images.cardImage,
    availableDates: [destination.departureDate, destination.returnDate],
    image: images.heroImage,
    description: `A dynamically generated package to ${destinationLabel} based on live airfare inspiration from Amadeus.`,
    highlights: makeHighlights(destinationLabel, durationDays),
    included: DEFAULT_INCLUSIONS,
    excluded: DEFAULT_EXCLUSIONS,
    itinerary: makeItinerary(destinationLabel, durationDays),
    trendingScore,
    budgetFriendly,
    lastUpdatedAt: new Date().toISOString(),
  };
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
  const sliced = (payload.data || []).slice(0, config.packageFetchLimit);
  const packages = await Promise.all(sliced.map((item) => createPackageFromDestination(token, item)));
  const validPackages = packages.filter((pkg): pkg is TravelPackage => Boolean(pkg));
  if (!validPackages.length && config.packageFallbackEnabled) {
    return generateFallbackPackages();
  }
  return validPackages;
};

const generateFallbackPackages = (): TravelPackage[] => {
  const baseDate = new Date();
  const variantCount = 3;
  const packages: TravelPackage[] = [];

  fallbackDestinations.forEach((entry, destinationIndex) => {
    for (let variantIndex = 0; variantIndex < variantCount; variantIndex += 1) {
      const durationDays = 4 + ((destinationIndex + variantIndex) % 7);
      const departure = new Date(baseDate);
      departure.setDate(baseDate.getDate() + 7 + destinationIndex * 2 + variantIndex * 10);
      const arrival = new Date(departure);
      arrival.setDate(departure.getDate() + durationDays - 1);
      const price = 350 + destinationIndex * 95 + variantIndex * 70;
      const category = resolveCategory(price, durationDays, entry.countryCode, entry.preferredCategory);
      const rating = computeRating(price, durationDays);
      const reviews = computeReviews(price) + variantIndex * 8;
      const packageId = `fallback-${entry.origin}-${entry.destination}-${variantIndex + 1}-${departure
        .toISOString()
        .slice(0, 10)}`;
      const seasonTag = variantIndex === 0 ? "Saver" : variantIndex === 1 ? "Classic" : "Premium";
      const images = getPackageImageUrls(`${entry.label}-${seasonTag}-${variantIndex + 1}`);

      packages.push({
        id: packageId,
        packageId,
        source: "amadeus",
        category,
        categoryLabel: CATEGORY_LABELS[category],
        title: `${entry.label} ${seasonTag} Escape`,
        destination: entry.label,
        location: entry.location,
        duration: `${durationDays} Days / ${Math.max(durationDays - 1, 1)} Nights`,
        durationDays,
        price,
        discount: price > 900 ? 10 : 6,
        rating,
        reviews,
        shortDescription: `Explore ${entry.label} with a ${seasonTag.toLowerCase()} package including stays, transfers, and guided experiences.`,
        inclusions: DEFAULT_INCLUSIONS,
        exclusions: DEFAULT_EXCLUSIONS,
        imageUrl: images.cardImage,
        availableDates: [departure.toISOString(), arrival.toISOString()],
        image: images.heroImage,
        description: `A curated ${durationDays}-day ${seasonTag.toLowerCase()} itinerary to ${entry.label}, optimized for convenience and value.`,
        highlights: makeHighlights(entry.label, durationDays),
        included: DEFAULT_INCLUSIONS,
        excluded: DEFAULT_EXCLUSIONS,
        itinerary: makeItinerary(entry.label, durationDays),
        trendingScore: Number(((rating * reviews) / 100).toFixed(2)),
        budgetFriendly: price <= config.packageBudgetThresholdUsd,
        lastUpdatedAt: new Date().toISOString(),
      });
    }
  });

  return packages
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, Math.max(config.packageFetchLimit, 30));
};
