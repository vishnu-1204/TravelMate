import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import { PackageCard } from '@/components/packages/PackageCard';
import { Skeleton } from '@/components/ui/skeleton';
import { getPackagesPage, type TravelPackage } from '@/lib/packagesApi';
import { Mic, Search, Sparkles, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type SpeechRecognitionCtor = new () => {
  lang: string;
  onresult: ((event: { results: { 0: { transcript: string } }[] }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};

const pageSize = 12;
const recentSearchesKey = 'travelmate_recent_place_searches_v1';
const GEO_CACHE_KEY = 'travelmate_geo_cache_v1';
const LOCATION_RADIUS_KM = 500;
const MAX_NEARBY_GEO_LOOKUPS = 120;

type Coordinates = {
  lat: number;
  lon: number;
};

type NearbyMeta = {
  distanceKm: number;
  travelHours: number;
};

type LocationStatus = 'idle' | 'ready' | 'loading' | 'needs_profile' | 'error';

const popularDestinations = ['Kerala', 'Manali', 'Shimla', 'Ooty', 'Coorg', 'Munnar', 'Kashmir', 'Goa', 'Delhi', 'Tamil Nadu'];
const trendingNearby = ['Pondicherry', 'Wayand', 'Alleppey', 'Mysore', 'Hampi', 'Kodaikanal'];
const cityNearbyMap: Record<string, string[]> = {
  chennai: ['Pondicherry', 'Mahabalipuram', 'Yercaud', 'Kodaikanal', 'Ooty'],
  bengaluru: ['Coorg', 'Mysore', 'Ooty', 'Wayanad', 'Hampi'],
  bangalore: ['Coorg', 'Mysore', 'Ooty', 'Wayanad', 'Hampi'],
  mumbai: ['Lonavala', 'Alibaug', 'Goa', 'Mahabaleshwar', 'Nashik'],
  delhi: ['Agra', 'Jaipur', 'Rishikesh', 'Nainital', 'Manali'],
  hyderabad: ['Hampi', 'Coorg', 'Goa', 'Mysore', 'Ooty'],
  kolkata: ['Darjeeling', 'Gangtok', 'Puri', 'Shillong', 'Kalimpong'],
  pune: ['Lonavala', 'Mahabaleshwar', 'Goa', 'Nashik', 'Alibaug'],
};
const indianDestinationSet = new Set([
  'ahmedabad',
  'gandhinagar',
  'chennai',
  'mahabalipuram',
  'goa',
  'manali',
  'ooty',
  'kerala',
  'pondicherry',
  'coorg',
  'munnar',
  'lonavala',
  'rishikesh',
  'alleppey',
  'kashmir',
  'jaipur',
  'andaman',
  'nainital',
  'kodaikanal',
  'udaipur',
  'kasol',
  'mysore',
  'delhi',
  'agra',
  'hampi',
  'kolkata',
]);
const indianDestinationKeywords = Array.from(indianDestinationSet);
const categorySuggestionMap: Record<string, string[]> = {
  all: ['Goa', 'Manali', 'Kerala', 'Bali', 'Maldives', 'Paris', 'Dubai', 'Thailand'],
  domestic: ['Goa', 'Ooty', 'Manali', 'Munnar', 'Kashmir', 'Jaipur', 'Kerala', 'Andaman'],
  international: ['Bali', 'Maldives', 'Paris', 'Dubai', 'Singapore', 'Thailand', 'Switzerland', 'London'],
  solo: ['Rishikesh', 'Kasol', 'Hampi', 'Pondicherry', 'Coorg', 'Munnar', 'Udaipur', 'Goa'],
  budget: ['Goa', 'Pondicherry', 'Rishikesh', 'Jaipur', 'Kasol', 'Coorg', 'Mysore', 'Ooty'],
  honeymoon: ['Maldives', 'Bali', 'Paris', 'Santorini', 'Kerala', 'Manali', 'Kashmir', 'Mauritius'],
  group: ['Goa', 'Dubai', 'Thailand', 'Rishikesh', 'Kasol', 'Bali', 'Manali', 'Singapore'],
  educational: ['Delhi', 'Agra', 'Jaipur', 'Mysore', 'Hampi', 'Kolkata', 'London', 'Rome'],
  south: ['Munnar', 'Alleppey', 'Wayanad', 'Kochi', 'Thekkady', 'Ooty', 'Coorg', 'Pondicherry', 'Mysore', 'Kodaikanal', 'Hampi', 'Vizag', 'Tirupati'],
  north: ['Manali', 'Shimla', 'Kashmir', 'Delhi', 'Agra', 'Jaipur', 'Rishikesh', 'Nainital'],
};
const INDIAN_PACKAGES_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=75';
const INDIAN_DESTINATION_IMAGE_RULES: Array<{ keywords: string[]; image: string }> = [
  {
    keywords: ['kerala', 'munnar', 'alleppey', 'wayanad', 'thekkady', 'kovalam', 'kochi', 'varkala'],
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=75',
  },
  {
    keywords: ['goa', 'baga', 'calangute', 'palolem'],
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=75',
  },
  {
    keywords: ['manali', 'shimla', 'kasol', 'himachal'],
    image: 'https://images.unsplash.com/photo-1521292270410-a8c4d716d518?auto=format&fit=crop&w=1200&q=75',
  },
  {
    keywords: ['kashmir', 'gulmarg', 'pahalgam', 'srinagar'],
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=75',
  },
  {
    keywords: ['ooty', 'kodaikanal', 'coorg', 'mysore', 'hampi'],
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=75',
  },
  {
    keywords: ['rishikesh', 'nainital', 'mussoorie', 'uttarakhand'],
    image: 'https://images.unsplash.com/photo-1431274172761-fca41d930114?auto=format&fit=crop&w=1200&q=75',
  },
  {
    keywords: ['jaipur', 'udaipur', 'jodhpur', 'rajasthan'],
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=75',
  },
  {
    keywords: ['andaman', 'pondicherry', 'mahabalipuram'],
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=75',
  },
];
const GENERIC_INDIAN_IMAGE_MARKERS = [
  'photo-1524492412937-b28074a5d7da',
  'photo-1488646953014-85cb44e25828',
  '/placeholder.svg',
];

const PackageCardSkeleton = () => (
  <div className="rounded-xl border border-border overflow-hidden bg-card">
    <Skeleton className="h-56 w-full rounded-none" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-6 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  </div>
);

const scoreRecommendation = (pkg: TravelPackage) =>
  pkg.rating * 30 + pkg.affordabilityScore * 0.8 + (pkg.badges.bestValue ? 18 : 0) + (pkg.badges.mostAffordable ? 20 : 0) - pkg.price / 6000;

const normalizeCountry = (country?: string) => (country || '').trim().toLowerCase();
const normalizeSuggestion = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const dedupeSuggestions = (items: string[]) =>
  Array.from(
    new Map(
      items
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => [normalizeSuggestion(item), item] as const)
    ).values()
  );
const isIndiaCountry = (country?: string) => {
  const normalized = normalizeCountry(country);
  return normalized === 'india' || normalized === 'in' || normalized === 'ind';
};

const isIndianDestination = (name: string) => {
  const normalized = name.trim().toLowerCase();
  if (indianDestinationSet.has(normalized)) return true;
  return indianDestinationKeywords.some((keyword) => normalized.includes(keyword));
};
const isGenericIndianImage = (url?: string) => {
  const normalized = String(url || '').trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === INDIAN_PACKAGES_FALLBACK_IMAGE.toLowerCase()) return true;
  return GENERIC_INDIAN_IMAGE_MARKERS.some((marker) => normalized.includes(marker));
};

const resolveIndianPackageImage = (pkg: TravelPackage) => {
  const sourceImage = String(pkg.imageUrl || pkg.image || '').trim();
  if (sourceImage && !isGenericIndianImage(sourceImage)) return sourceImage;

  const haystack = normalizeSuggestion(`${pkg.title} ${pkg.destination} ${pkg.location}`);
  const matched = INDIAN_DESTINATION_IMAGE_RULES.find((rule) => rule.keywords.some((keyword) => haystack.includes(keyword)));
  return matched?.image || INDIAN_PACKAGES_FALLBACK_IMAGE;
};

const normalizePlaceKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9,\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const readGeoCache = (): Record<string, Coordinates> => {
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Coordinates>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeGeoCache = (cache: Record<string, Coordinates>) => {
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // no-op
  }
};

const geocodePlace = async (query: string): Promise<Coordinates | null> => {
  const normalized = normalizePlaceKey(query);
  if (!normalized) return null;
  const cache = readGeoCache();
  const hit = cache[normalized];
  if (hit) return hit;

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  const first = payload[0];
  if (!first?.lat || !first?.lon) return null;

  const value = { lat: Number(first.lat), lon: Number(first.lon) };
  if (!Number.isFinite(value.lat) || !Number.isFinite(value.lon)) return null;
  cache[normalized] = value;
  writeGeoCache(cache);
  return value;
};

const haversineKm = (a: Coordinates, b: Coordinates) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return 6371 * c;
};

const estimateTravelHours = (distanceKm: number) => Math.max(1, distanceKm / 45);

const parseDestinationQuery = (pkg: TravelPackage) =>
  [pkg.destination, pkg.location]
    .flatMap((item) =>
      String(item || '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    )
    .slice(0, 2)
    .join(', ');

const getProfileAddress = (metadata: Record<string, unknown> | undefined) => {
  const details = (metadata?.profile_details as Record<string, unknown> | undefined) || {};
  const address = String(details.address || '').trim();
  const city = String(details.city || '').trim();
  const state = String(details.state || '').trim();
  const country = String(details.country || '').trim();
  const pincode = String(details.pincode || details.pin_code || details.zip || '').trim();
  const locationLat = Number(details.location_lat ?? details.lat ?? 0);
  const locationLon = Number(details.location_lon ?? details.lon ?? details.lng ?? 0);

  const addressLine = [address, city, state, pincode, country].filter(Boolean).join(', ');
  const complete = Boolean(city && state && country);
  const storedCoords =
    Number.isFinite(locationLat) &&
    Number.isFinite(locationLon) &&
    Math.abs(locationLat) > 0 &&
    Math.abs(locationLon) > 0
      ? { lat: locationLat, lon: locationLon }
      : null;

  return { addressLine, complete, storedCoords, details, city };
};

const getCityHints = (city?: string) => {
  const key = (city || '').trim().toLowerCase();
  if (!key) return [];
  return cityNearbyMap[key] || [];
};

const Packages = () => {
  const { category } = useParams<{ category?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const selectedCategory = category || 'all';
  const isSoloCategory = selectedCategory === 'solo' || selectedCategory === 'nearby';
  const isIndianCategory = selectedCategory === 'domestic' || selectedCategory === 'indian' || selectedCategory === 'south' || selectedCategory === 'north';

  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [nearbyMetaById, setNearbyMetaById] = useState<Record<string, NearbyMeta>>({});
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationNote, setLocationNote] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [askingGeo, setAskingGeo] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [voiceBusy, setVoiceBusy] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(recentSearchesKey);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      setRecentSearches(Array.isArray(parsed) ? parsed.slice(0, 6) : []);
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const resolveUserLocation = async () => {
      if (!isSoloCategory) {
        setLocationStatus('idle');
        setLocationNote('');
        setProfileCity('');
        setUserCoords(null);
        return;
      }
      if (!user) {
        setLocationStatus('needs_profile');
        setLocationNote('Sign in and save your address in profile for solo trip recommendations.');
        setProfileCity('');
        setUserCoords(null);
        return;
      }

      setLocationStatus('loading');
      const meta = getProfileAddress((user.user_metadata || {}) as Record<string, unknown>);
      setProfileCity(meta.city || '');
      if (meta.storedCoords) {
        if (!active) return;
        setUserCoords(meta.storedCoords);
        setLocationStatus('ready');
        setLocationNote('Showing solo trip picks from your saved profile location.');
        return;
      }
      if (!meta.complete || !meta.addressLine) {
        if (!active) return;
        setUserCoords(null);
        setLocationStatus('needs_profile');
        setLocationNote(
          meta.city
            ? `Using your city (${meta.city}) for solo trip suggestions. Add full address for better accuracy.`
            : 'Add city, state, and country in profile to get solo trip recommendations.'
        );
        return;
      }

      const coords = await geocodePlace(meta.addressLine);
      if (!active) return;
      if (!coords) {
        setUserCoords(null);
        setLocationStatus('error');
        setLocationNote(
          meta.city
            ? `Could not geocode your address. Using city-based solo trip suggestions for ${meta.city}.`
            : 'Could not read your saved address. Please update profile location details.'
        );
        return;
      }

      setUserCoords(coords);
      setLocationStatus('ready');
      setLocationNote('Showing solo trip picks from your saved profile location.');
      try {
        await supabase.auth.updateUser({
          data: {
            profile_details: {
              ...meta.details,
              location_lat: coords.lat,
              location_lon: coords.lon,
            },
          },
        });
      } catch {
        // Non-blocking: recommendations still work for this session.
      }
    };

    void resolveUserLocation();
    return () => {
      active = false;
    };
  }, [selectedCategory, user, isSoloCategory]);

  useEffect(() => {
    let active = true;
    const loadPackages = async () => {
      setLoading(true);
      setError('');
      try {
        const isNearbyCategory = isSoloCategory;
        const queryLimit = isNearbyCategory ? 220 : pageSize;
        const queryOffset = isNearbyCategory ? 0 : (page - 1) * pageSize;
        const result = await getPackagesPage({
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          destination: debouncedSearch || undefined,
          search: debouncedSearch || undefined,
          sortBy: 'trending',
          sortOrder: 'desc',
          limit: queryLimit,
          offset: queryOffset,
        });
        if (!active) return;
        let safetyFiltered = result.packages.filter((pkg) => {
          const looksIndianByText = isIndianDestination(`${pkg.destination} ${pkg.location} ${pkg.title}`);
          if (selectedCategory === 'international') {
            return pkg.category === 'international' && !isIndiaCountry(pkg.country) && !looksIndianByText;
          }
          if (isIndianCategory) {
            return pkg.category === 'domestic' || isIndiaCountry(pkg.country) || looksIndianByText;
          }
          return true;
        });

        const nearbyMeta: Record<string, NearbyMeta> = {};
        if (isNearbyCategory && userCoords) {
          const queryToCoords = new Map<string, Coordinates | null>();
          const candidatePackages = safetyFiltered.slice(0, MAX_NEARBY_GEO_LOOKUPS);
          const withDistance = await Promise.all(
            candidatePackages.map(async (pkg) => {
              const destinationQuery = parseDestinationQuery(pkg);
              if (!destinationQuery) return null;
              const cacheHit = queryToCoords.get(destinationQuery);
              const coords = cacheHit !== undefined ? cacheHit : await geocodePlace(destinationQuery);
              if (!queryToCoords.has(destinationQuery)) queryToCoords.set(destinationQuery, coords);
              if (!coords) return null;
              const distanceKm = haversineKm(userCoords, coords);
              const travelHours = estimateTravelHours(distanceKm);
              nearbyMeta[pkg.id] = { distanceKm, travelHours };
              return { pkg, distanceKm, travelHours };
            })
          );

          const ranked = withDistance
            .filter((row): row is { pkg: TravelPackage; distanceKm: number; travelHours: number } => Boolean(row))
            .filter((row) => row.distanceKm <= LOCATION_RADIUS_KM)
            .sort((a, b) => {
              const budgetDelta = a.pkg.price - b.pkg.price;
              const ratingDelta = b.pkg.rating - a.pkg.rating;
              return a.distanceKm - b.distanceKm || budgetDelta || ratingDelta;
            });

          const weekendRanked = ranked
            .map((row) => row.pkg)
            .filter((pkg) => pkg.durationDays <= 5 || pkg.budgetType === 'low' || pkg.budgetType === 'medium');
          safetyFiltered = weekendRanked.length > 0 ? weekendRanked : ranked.map((row) => row.pkg);
        } else if (isNearbyCategory && profileCity) {
          const cityHints = getCityHints(profileCity).map((item) => item.toLowerCase());
          if (cityHints.length > 0) {
            const hinted = safetyFiltered.filter((pkg) => {
              const haystack = `${pkg.destination} ${pkg.location} ${pkg.title}`.toLowerCase();
              return cityHints.some((hint) => haystack.includes(hint.toLowerCase()));
            });
            const ranked = (hinted.length > 0 ? hinted : safetyFiltered)
              .filter((pkg) => pkg.durationDays <= 5 || pkg.budgetType === 'low' || pkg.budgetType === 'medium')
              .sort((a, b) => a.price - b.price || b.rating - a.rating);
            safetyFiltered = ranked;
          }
        }

        const pagedPackages =
          isNearbyCategory && safetyFiltered.length > pageSize
            ? safetyFiltered.slice((page - 1) * pageSize, page * pageSize)
            : safetyFiltered;

        const withNearbyAnnotations = pagedPackages.map((pkg) => {
          const meta = nearbyMeta[pkg.id];
          if (!meta || !isSoloCategory) return pkg;
          const distanceLabel = `${Math.round(meta.distanceKm)} km away`;
          const travelLabel = `~${Math.round(meta.travelHours)}h trip`;
          const tags = [distanceLabel, travelLabel, ...pkg.specialTags].slice(0, 4);
          return {
            ...pkg,
            specialTags: tags,
            shortDescription: `${distanceLabel} | ${pkg.shortDescription}`,
          };
        });

        setNearbyMetaById(nearbyMeta);
        setPackages(withNearbyAnnotations);

        if (isNearbyCategory) {
          setTotal(safetyFiltered.length);
        } else if (selectedCategory === 'international' || isIndianCategory || isSoloCategory) {
          const removedOnPage = Math.max(result.packages.length - safetyFiltered.length, 0);
          setTotal(Math.max(result.total - removedOnPage, safetyFiltered.length));
        } else {
          setTotal(result.total);
        }
      } catch (err) {
        if (!active) return;
        setPackages([]);
        setNearbyMetaById({});
        setTotal(0);
        setError(err instanceof Error ? err.message : 'Failed to load packages');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPackages();
    return () => {
      active = false;
    };
  }, [selectedCategory, debouncedSearch, page, reloadToken, userCoords, profileCity, isSoloCategory, isIndianCategory]);

  const pageTitle =
    selectedCategory === 'all'
      ? 'Find Your Next Destination'
      : isSoloCategory
      ? 'Solo Trips'
      : selectedCategory === 'south'
      ? 'South Indian Packages'
      : selectedCategory === 'north'
      ? 'North Indian Packages'
      : `${selectedCategory[0].toUpperCase()}${selectedCategory.slice(1)} Packages`;
  const isIndianPackagesView = isIndianCategory && !isSoloCategory;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const nearbyCityPlaces = useMemo(() => getCityHints(profileCity), [profileCity]);

  const liveSuggestions = useMemo(() => {
    const categoryKey = selectedCategory.toLowerCase();
    const normalizedCategoryKey = categoryKey === 'indian' ? 'domestic' : categoryKey === 'nearby' ? 'solo' : categoryKey;
    const categorySpecific = categorySuggestionMap[normalizedCategoryKey] || categorySuggestionMap.all;
    const fromPackages = packages
      .flatMap((pkg) => {
        const destination = pkg.destination?.trim() || '';
        const locationPrimary = (pkg.location || '')
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)[0];
        return [destination, locationPrimary || ''];
      })
      .filter(Boolean);
    const recentRelevant = recentSearches.filter((item) => {
      if (categoryKey === 'international') return !isIndianDestination(item);
      if (categoryKey === 'all') return true;
      if (normalizedCategoryKey === 'domestic' || normalizedCategoryKey === 'solo' || normalizedCategoryKey === 'south' || normalizedCategoryKey === 'north' || normalizedCategoryKey === 'educational') return isIndianDestination(item);
      return true;
    });

    let unique = dedupeSuggestions([...categorySpecific, ...fromPackages, ...recentRelevant]);
    if (categoryKey === 'international') {
      unique = unique.filter((item) => !isIndianDestination(item));
    } else if (normalizedCategoryKey === 'domestic' || normalizedCategoryKey === 'solo' || normalizedCategoryKey === 'south' || normalizedCategoryKey === 'north' || normalizedCategoryKey === 'educational') {
      unique = unique.filter((item) => isIndianDestination(item));
    }

    const term = normalizeSuggestion(searchInput);
    const filtered = !term ? unique : unique.filter((item) => normalizeSuggestion(item).includes(term));
    return filtered.slice(0, 12);
  }, [packages, recentSearches, searchInput, selectedCategory]);

  const aiRecommendations = useMemo(
    () => [...packages].sort((a, b) => scoreRecommendation(b) - scoreRecommendation(a)).slice(0, 3),
    [packages]
  );

  const expensiveAlternatives = useMemo(() => {
    const firstExpensive = packages.find((pkg) => pkg.nearbyAlternatives.length > 0);
    return firstExpensive?.nearbyAlternatives || [];
  }, [packages]);

  const saveRecent = (value: string) => {
    const v = value.trim();
    if (!v) return;
    const next = [v, ...recentSearches.filter((item) => item.toLowerCase() !== v.toLowerCase())].slice(0, 6);
    setRecentSearches(next);
    try {
      localStorage.setItem(recentSearchesKey, JSON.stringify(next));
    } catch {
      // no-op
    }
  };

  const applySearch = (value: string) => {
    setSearchInput(value);
    setDebouncedSearch(value.trim());
    setShowSuggestions(false);
    setPage(1);
    saveRecent(value);
  };

  const handleVoiceSearch = () => {
    const ctor =
      (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (!ctor || voiceBusy) return;
    const recognition = new ctor();
    setVoiceBusy(true);
    recognition.lang = 'en-IN';
    recognition.onresult = (event) => {
      const spoken = event.results?.[0]?.[0]?.transcript || '';
      applySearch(spoken);
      setVoiceBusy(false);
    };
    recognition.onerror = () => setVoiceBusy(false);
    recognition.start();
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation || askingGeo) return;
    setAskingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
        setLocationStatus('ready');
        setLocationNote('Using your current browser location for solo trip recommendations.');
        setAskingGeo(false);
      },
      () => {
        setLocationStatus('error');
        setLocationNote('Location permission denied. Add your address in profile to continue.');
        setAskingGeo(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };

  return (
    <Layout>
      <PageTransition>
        <section className="hero-section py-16">
          <div className="page-container">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{pageTitle}</h1>
              <p className="text-white/90 text-lg max-w-2xl mx-auto mb-8">
                Simple and fast destination discovery with one smart place search.
              </p>
            </div>

            <div className="sticky top-20 z-20">
              <div className="bg-white/95 backdrop-blur rounded-2xl p-4 md:p-5 shadow-xl border border-white/80">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') applySearch(searchInput);
                    }}
                    placeholder="Search city, state, country, or tourist place"
                    className="w-full pl-10 pr-24 py-3 rounded-xl border border-border bg-background text-slate-900 placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleVoiceSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-xs font-medium border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                    disabled={voiceBusy}
                    title="Voice search"
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                </div>

                {showSuggestions && liveSuggestions.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs text-slate-500 mb-2">
                      Suggestions{selectedCategory !== 'all' ? ` for ${selectedCategory[0].toUpperCase()}${selectedCategory.slice(1)}` : ''}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {liveSuggestions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onMouseDown={() => applySearch(item)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-800 hover:bg-slate-50"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'south', label: 'South India' },
                  { id: 'north', label: 'North India' },
                  { id: 'solo', label: 'Solo Trips' },
                  { id: 'honeymoon', label: 'Honeymoon' },
                  { id: 'educational', label: 'Educational' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => navigate(cat.id === 'all' ? '/packages' : `/packages/${cat.id}`)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedCategory === cat.id || (cat.id === 'solo' && selectedCategory === 'nearby')
                        ? 'bg-sky-400 text-white shadow-lg'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

            </div>
          </div>
        </section>

        <section className="py-16 bg-background">
          <div className="page-container">
            {isSoloCategory ? (
              <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">Solo Trip Recommendations</p>
                <p className="text-sm text-slate-700 mt-1">{locationNote || 'Resolving your location preferences...'}</p>
                {nearbyCityPlaces.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs text-slate-600 mb-2">Suggested places from your city:</p>
                    <div className="flex flex-wrap gap-2">
                      {nearbyCityPlaces.map((place) => (
                        <button
                          key={place}
                          type="button"
                          onMouseDown={() => applySearch(place)}
                          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-white"
                        >
                          {place}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {locationStatus === 'needs_profile' && !profileCity ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn-outline text-sm"
                      onClick={() => navigate('/profile')}
                    >
                      Update Profile Address
                    </button>
                    <button
                      type="button"
                      className="btn-outline text-sm"
                      onClick={useCurrentLocation}
                      disabled={askingGeo}
                    >
                      {askingGeo ? 'Detecting...' : 'Use Current Location'}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {aiRecommendations.length > 0 ? (
              <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-sm font-medium text-blue-900 inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Smart picks for you
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  {aiRecommendations.map((pkg) => pkg.destination).join(', ')} based on affordability, popularity, and ratings.
                </p>
              </div>
            ) : null}

            {expensiveAlternatives.length > 0 ? (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Nearby affordable alternatives: {expensiveAlternatives.join(', ')}
              </div>
            ) : null}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <PackageCardSkeleton key={index} />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive text-lg">{error}</p>
                <button type="button" className="btn-outline mt-4" onClick={() => setReloadToken((prev) => prev + 1)}>
                  Retry
                </button>
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <div className="max-w-md mx-auto">
                  <p className="text-slate-900 text-xl font-bold mb-2">
                    {selectedCategory === 'group' ? 'New Group Tours Coming Soon' : `No ${selectedCategory} destinations found`}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedCategory === 'group' 
                      ? 'We are currently preparing exciting new group departure dates. Check back soon or explore our popular Indian packages.' 
                      : `We couldn't find any packages matching your search criteria. Try a different destination or category.`}
                  </p>
                  {selectedCategory === 'group' && (
                    <Link to="/packages/indian" className="btn-primary mt-6 inline-block">
                      Explore Indian Packages
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total} destinations
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {packages.map((pkg, index) => {
                    const cardImageUrl = isIndianPackagesView ? resolveIndianPackageImage(pkg) : pkg.imageUrl;
                    return (
                    <PackageCard
                      key={pkg.id}
                      id={pkg.id}
                      detailsPath={selectedCategory === 'group' ? `/package/${pkg.id}?group=1` : `/package/${pkg.id}`}
                      title={pkg.title}
                      destination={
                        isSoloCategory && nearbyMetaById[pkg.id]
                          ? `${pkg.destination} - ${Math.round(nearbyMetaById[pkg.id].distanceKm)} km`
                          : pkg.destination
                      }
                      duration={pkg.duration}
                      price={pkg.price}
                      discount={pkg.discount}
                      rating={pkg.rating}
                      reviews={pkg.reviews}
                      imageUrl={cardImageUrl}
                      imageAlt={pkg.imageAlt}
                      category={pkg.category}
                      shortDescription={pkg.shortDescription}
                      budgetType={pkg.budgetType}
                      pricingTier={pkg.pricingTier}
                      travelerSegments={pkg.travelerSegments}
                      affordabilityScore={pkg.affordabilityScore}
                      dynamicPricing={pkg.dynamicPricing}
                      specialTags={pkg.specialTags}
                      badges={pkg.badges}
                      isGroupTour={pkg.isGroupTour}
                      groupDepartures={pkg.groupDepartures}
                      highlightQuery={debouncedSearch}
                      imageLoading={index < 3 ? 'eager' : 'lazy'}
                      imagePriority={index < 3}
                    />
                  )})}
                </div>
                <div className="flex items-center justify-center gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1}
                    className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page >= totalPages}
                    className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default Packages;
