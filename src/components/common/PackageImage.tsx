import { useMemo } from 'react';

type PackageImageProps = {
  src: string;
  alt: string;
  category?: string;
  imageQuery?: string;
  forceDynamic?: boolean;
  className?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  onErrorSrc?: string;
};

/* ── Category-based segment hints for search keywords ── */
const SEGMENT_HINTS: Record<string, string> = {
  heritage: ',temple,ruins',
  historical: ',temple,ruins',
  nature: ',mountains,greenery',
  'hill station': ',mountains,hills',
  hillstation: ',mountains,hills',
  beach: ',beach,ocean',
  honeymoon: ',romantic,couple',
  adventure: ',adventure,trekking',
  wildlife: ',wildlife,safari',
  pilgrimage: ',temple,spiritual',
  educational: ',monument,history',
};

/* ── Curated destination-specific Unsplash photos ── */
const DESTINATION_IMAGES: Record<string, string[]> = {
  'kerala|munnar|alleppey|wayanad|thekkady|kovalam|kochi|varkala': [
    'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944',
    'https://images.unsplash.com/photo-1595815771614-ade501f4b7d8',
  ],
  'goa|baga|calangute|palolem|aguada': [
    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2',
    'https://images.unsplash.com/photo-1537996194471-e657df975ab4',
  ],
  'rajasthan|jaipur|udaipur|jodhpur|jaisalmer|pushkar': [
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1',
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c',
  ],
  'himachal|manali|shimla|kasol|spiti|dharamshala|dalhousie|uttarakhand|rishikesh|nainital|mussoorie|auli|corbett|haridwar': [
    'https://images.unsplash.com/photo-1521292270410-a8c4d716d518',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
    'https://images.unsplash.com/photo-1431274172761-fca41d930114',
  ],
  'karnataka|coorg|mysuru|mysore|hampi|gokarna|udupi|chikmagalur|tamil|ooty|kodaikanal|chennai|kanyakumari': [
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470',
    'https://images.unsplash.com/photo-1527631746610-bca00a040d60',
  ],
  'maharashtra|mumbai|pune|lonavala|mahabaleshwar|nashik|alibaug|gujarat|ahmedabad|kutch|gir|somnath|dwarka': [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
    'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86',
  ],
  'meghalaya|shillong|cherrapunji|dawki|sikkim|gangtok|pelling|lachung|darjeeling': [
    'https://images.unsplash.com/photo-1525625293386-3f8f99389edd',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828',
  ],
  'kashmir|srinagar|gulmarg|pahalgam|leh|ladakh': [
    'https://images.unsplash.com/photo-1431274172761-fca41d930114',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
  ],
  'delhi|agra': [
    'https://images.unsplash.com/photo-1524492412937-b28074a5d7da',
  ],
  'andaman|lakshadweep': [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
    'https://images.unsplash.com/photo-1559827291-baf86b9deb2a',
  ],
  'pondicherry|mahabalipuram': [
    'https://images.unsplash.com/photo-1582510003544-4d00b7f74220',
  ],
};

const GENERIC_IMAGE_MARKERS = [
  'photo-1524492412937-b28074a5d7da',
  'photo-1467269204594-9661b134dd2b',
  'photo-1501785888041-af3ef285b470',
  'photo-1527631746610-bca00a040d60',
  'photo-1518509562904-e7ef99cdcc86',
  'photo-1529156069898-49953e39b3ac',
  'photo-1525625293386-3f8f99389edd',
  '/placeholder.svg',
];

const NON_UNIQUE_MARKERS = ['placeholder', 'test', 'sample'];

const normalizeQuery = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const hashSeed = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 1000) + 1;
};

/* ── Global seen-URL tracker to detect duplicates across cards ── */
const seenUrls = new Set<string>();
let lastResetTime = 0;

const resetSeenIfStale = () => {
  const now = Date.now();
  // Reset every 5 seconds to avoid stale data between renders
  if (now - lastResetTime > 5000) {
    seenUrls.clear();
    lastResetTime = now;
  }
};

const isNonUniqueUrl = (url: string): boolean => {
  const lower = url.toLowerCase().trim();
  if (!lower) return true;

  // Check for non-unique markers
  if (NON_UNIQUE_MARKERS.some((m) => lower.includes(m))) return true;

  // Check for generic fallback markers
  if (GENERIC_IMAGE_MARKERS.some((m) => lower.includes(m))) return true;

  // Check for duplicate across cards
  resetSeenIfStale();
  if (seenUrls.has(lower)) return true;
  seenUrls.add(lower);

  return false;
};

const getSegmentHint = (category?: string, title?: string): string => {
  const combined = `${category || ''} ${title || ''}`.toLowerCase();
  for (const [key, hint] of Object.entries(SEGMENT_HINTS)) {
    if (combined.includes(key)) return hint;
  }
  return '';
};

const extractCityName = (query: string): string => {
  // Try to extract a city/destination name from the query
  const parts = query.split(/\s+/);
  // Return the most destination-like word (capitalize first)
  return parts[parts.length - 1] || 'travel';
};

const getDestinationImage = (query: string, seed: number) => {
  const normalized = query.toLowerCase();
  for (const [key, urls] of Object.entries(DESTINATION_IMAGES)) {
    const keywords = key.split('|');
    if (keywords.some((k) => normalized.includes(k))) {
      return urls[seed % urls.length];
    }
  }

  const genericPool = [
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470',
    'https://images.unsplash.com/photo-1467269204594-9661b134dd2b',
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c',
    'https://images.unsplash.com/photo-1527631746610-bca00a040d60',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac',
  ];
  return genericPool[seed % genericPool.length];
};

const buildDynamicUrl = (query: string, category?: string, title?: string): string => {
  const city = extractCityName(query);
  const hint = getSegmentHint(category, title);
  const seed = hashSeed(`${query}-${category || ''}`);

  // Try curated destination image first
  const curated = getDestinationImage(query, seed);
  if (curated) {
    // Append unique sig to avoid browser cache collisions between cards
    return `${curated}?auto=format&fit=crop&w=1200&q=75&sig=${seed}`;
  }

  // Primary: Unsplash search by city + segment hint
  return `https://source.unsplash.com/featured/800x600?${encodeURIComponent(city + ',travel' + hint)}`;
};

const optimizeUrl = (url: string, width: number) => {
  if (!url) return url;
  if (url.includes('source.unsplash.com')) return url; // already sized
  if (url.includes('loremflickr.com')) return url;
  if (url.includes('picsum.photos/seed/')) {
    return url.replace(/\/\d+\/\d+$/, `/${width}/${Math.round(width * 0.625)}`);
  }
  if (url.includes('images.unsplash.com')) {
    const base = url.split('?')[0];
    return `${base}?auto=format&fit=crop&w=${width}&q=75`;
  }
  if (url.includes('pexels.com')) {
    return `${url}${url.includes('?') ? '&' : '?'}auto=compress&cs=tinysrgb&w=${width}`;
  }
  return url;
};

export const PackageImage = ({
  src,
  alt,
  category,
  imageQuery,
  forceDynamic = false,
  className,
  sizes = '(max-width: 768px) 100vw, 50vw',
  loading = 'lazy',
  priority = false,
  onErrorSrc = '/placeholder.svg',
}: PackageImageProps) => {
  const normalizedQuery = normalizeQuery(imageQuery || alt || category || 'travel');

  const resolvedBaseSrc = useMemo(() => {
    const rawSrc = (src || '').trim();

    // If forced dynamic or the URL is non-unique → build a fresh one
    if (forceDynamic || isNonUniqueUrl(rawSrc)) {
      return buildDynamicUrl(normalizedQuery, category, alt);
    }

    return rawSrc;
  }, [src, forceDynamic, normalizedQuery, category, alt]);

  const srcSet = useMemo(() => {
    return [480, 768, 1024, 1400]
      .map((w) => `${optimizeUrl(resolvedBaseSrc, w)} ${w}w`)
      .join(', ');
  }, [resolvedBaseSrc]);

  const fallbackSrc = useMemo(() => {
    const city = extractCityName(normalizedQuery);
    const hint = getSegmentHint(category, alt);
    return `https://source.unsplash.com/featured/800x600?${encodeURIComponent(city + ',travel' + hint)}`;
  }, [normalizedQuery, category, alt]);

  return (
    <img
      src={optimizeUrl(resolvedBaseSrc, 1024)}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={(event) => {
        const target = event.currentTarget;
        const step = target.getAttribute('data-fallback-step') || '0';
        target.removeAttribute('srcset');
        target.removeAttribute('sizes');

        if (step === '0') {
          target.setAttribute('data-fallback-step', '1');
          target.src = fallbackSrc;
          return;
        }
        if (step === '1') {
          target.setAttribute('data-fallback-step', '2');
          const city = extractCityName(normalizedQuery);
          target.src = `https://loremflickr.com/800/600/${encodeURIComponent(city + ',landmark')}`;
          return;
        }
        target.setAttribute('data-fallback-step', '3');
        target.src = onErrorSrc;
      }}
      className={className}
      style={{ objectFit: 'cover' }}
    />
  );
};

export default PackageImage;
