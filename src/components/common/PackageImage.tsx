import { useMemo, useRef } from 'react';

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
  packageId?: string;
};

/* ── Segment hints appended to fallback search keywords ── */
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

/* ── Large curated pool per destination region (used only when src is empty/placeholder) ── */
const DESTINATION_IMAGES: Record<string, string[]> = {
  'kerala|munnar|alleppey|wayanad|thekkady|kovalam|kochi|varkala|kumarakom': [
    'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944',
    'https://images.unsplash.com/photo-1595815771614-ade501f4b7d8',
    'https://images.unsplash.com/photo-1593693397690-362cb9666fc2',
    'https://images.unsplash.com/photo-1609340667284-1a4cb816cc61',
    'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1',
    'https://images.unsplash.com/photo-1567157577867-05ccb1388e13',
    'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3',
  ],
  'goa|baga|calangute|palolem|aguada': [
    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2',
    'https://images.unsplash.com/photo-1537996194471-e657df975ab4',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
    'https://images.unsplash.com/photo-1559827291-baf86b9deb2a',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5',
  ],
  'rajasthan|jaipur|udaipur|jodhpur|jaisalmer|pushkar': [
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1',
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c',
    'https://images.unsplash.com/photo-1599661046289-e31897846e41',
    'https://images.unsplash.com/photo-1548013146-72479768bada',
  ],
  'himachal|manali|shimla|kasol|spiti|dharamshala|dalhousie': [
    'https://images.unsplash.com/photo-1521292270410-a8c4d716d518',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
    'https://images.unsplash.com/photo-1431274172761-fca41d930114',
    'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
  ],
  'uttarakhand|rishikesh|nainital|mussoorie|auli|corbett|haridwar': [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
    'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99',
  ],
  'karnataka|coorg|mysuru|mysore|hampi|gokarna|udupi|chikmagalur': [
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e',
    'https://images.unsplash.com/photo-1433086966358-54859d0ed716',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
  ],
  'ooty|kodaikanal|chennai|kanyakumari|pondicherry|mahabalipuram': [
    'https://images.unsplash.com/photo-1582510003544-4d00b7f74220',
    'https://images.unsplash.com/photo-1506929562872-bb421503ef21',
    'https://images.unsplash.com/photo-1530789253388-582c481c54b0',
  ],
  'kashmir|srinagar|gulmarg|pahalgam|leh|ladakh': [
    'https://images.unsplash.com/photo-1431274172761-fca41d930114',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba',
  ],
  'maharashtra|mumbai|pune|lonavala|mahabaleshwar|nashik|alibaug|gujarat|ahmedabad|kutch|gir|somnath|dwarka': [
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5',
    'https://images.unsplash.com/photo-1559827291-baf86b9deb2a',
  ],
  'meghalaya|shillong|cherrapunji|dawki|sikkim|gangtok|pelling|lachung|darjeeling': [
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e',
  ],
  'delhi|agra': [
    'https://images.unsplash.com/photo-1548013146-72479768bada',
    'https://images.unsplash.com/photo-1585135497273-1a86d9d43f07',
  ],
  'andaman|lakshadweep': [
    'https://images.unsplash.com/photo-1559827291-baf86b9deb2a',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5',
  ],
};

const normalizeQuery = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const hashSeed = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 10000);
};

let globalRenderCounter = 0;

/**
 * Only flag a URL as "needs replacement" if it is truly empty or a placeholder.
 * Trust all real Unsplash / Pexels / Amadeus URLs from packages.json.
 */
const needsDynamicImage = (url: string): boolean => {
  const trimmed = url.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  if (lower === '/placeholder.svg') return true;
  if (lower.includes('placeholder')) return true;
  if (lower.includes('test-image')) return true;
  if (lower.includes('sample-image')) return true;
  if (lower.includes('ftketypeknq')) return true;
  if (lower.includes('nydo21ssgao')) return true;
  return false;
};

const getSegmentHint = (category?: string, title?: string): string => {
  const combined = `${category || ''} ${title || ''}`.toLowerCase();
  for (const [key, hint] of Object.entries(SEGMENT_HINTS)) {
    if (combined.includes(key)) return hint;
  }
  return '';
};

const getDestinationImage = (query: string, seed: number): string => {
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
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e',
    'https://images.unsplash.com/photo-1433086966358-54859d0ed716',
  ];
  return genericPool[seed % genericPool.length];
};

const extractCityName = (query: string): string => {
  const parts = query.split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] || 'travel';
};

const optimizeUrl = (url: string, width: number) => {
  if (!url) return url;
  if (url.includes('source.unsplash.com')) return url;
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
  packageId,
}: PackageImageProps) => {
  const normalizedQuery = normalizeQuery(imageQuery || alt || category || 'travel');
  const instanceId = useRef(++globalRenderCounter);

  const resolvedBaseSrc = useMemo(() => {
    const rawSrc = (src || '').trim();

    // Trust the provided URL if it's a real image (not a placeholder)
    if (!forceDynamic && !needsDynamicImage(rawSrc)) {
      return rawSrc;
    }

    // Generate a unique curated image using packageId for stability
    const uniqueSeed = hashSeed(`${normalizedQuery}-${category || ''}-${packageId || instanceId.current}`);
    return getDestinationImage(normalizedQuery, uniqueSeed);
  }, [src, forceDynamic, normalizedQuery, category]);

  const srcSet = useMemo(() => {
    return [480, 768, 1024, 1400]
      .map((w) => `${optimizeUrl(resolvedBaseSrc, w)} ${w}w`)
      .join(', ');
  }, [resolvedBaseSrc]);

  const fallbackSrc = useMemo(() => {
    const uniqueSeed = hashSeed(`${normalizedQuery}-${category || ''}-fallback`);
    return getDestinationImage(normalizedQuery, uniqueSeed);
  }, [normalizedQuery, category]);

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
