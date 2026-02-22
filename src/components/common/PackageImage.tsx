import { useMemo } from 'react';

type PackageImageProps = {
  src: string;
  alt: string;
  category?: string;
  imageQuery?: string;
  className?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  onErrorSrc?: string;
};

const CATEGORY_FALLBACKS: Record<string, string> = {
  domestic: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=75',
  international: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=75',
  nearby: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=75',
  budget: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=75',
  honeymoon: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=75',
  group: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=75',
  educational: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=75',
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

const normalizeQuery = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const hashSeed = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 1000) + 1;
};

const buildDynamicSeededUrl = (query: string, seed: number, width = 1600, height = 900) =>
  `https://picsum.photos/seed/${encodeURIComponent(`${query}-${seed}`)}/${width}/${height}`;

const shouldUseDynamicImage = (src?: string, fallbackSrc?: string) => {
  const value = (src || '').trim().toLowerCase();
  if (!value) return true;
  if (fallbackSrc && value === fallbackSrc.trim().toLowerCase()) return true;
  return GENERIC_IMAGE_MARKERS.some((marker) => value.includes(marker));
};

const inferQueryFromAlt = (alt?: string) => {
  if (!alt) return '';
  const first = alt.split(' in ')[0];
  return normalizeQuery(first);
};

const optimizeUrl = (url: string, width: number) => {
  if (!url) return url;
  if (url.includes('picsum.photos/seed/')) {
    return url.replace(/\/\d+\/\d+$/, `/${width}/${Math.round(width * 0.625)}`);
  }
  if (url.includes('images.unsplash.com')) {
    return `${url}${url.includes('?') ? '&' : '?'}auto=format&fit=crop&w=${width}&q=75`;
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
  className,
  sizes = '(max-width: 768px) 100vw, 50vw',
  loading = 'lazy',
  priority = false,
  onErrorSrc = '/placeholder.svg',
}: PackageImageProps) => {
  const fallbackSrc = CATEGORY_FALLBACKS[category || ''] || onErrorSrc;
  const normalizedQuery = normalizeQuery(imageQuery || inferQueryFromAlt(alt) || category || 'travel');
  const dynamicSeed = hashSeed(`${normalizedQuery}-${category || ''}`);
  const dynamicSrc = buildDynamicSeededUrl(normalizedQuery, dynamicSeed);
  const resolvedBaseSrc = shouldUseDynamicImage(src, fallbackSrc) ? dynamicSrc : src || fallbackSrc;

  const srcSet = useMemo(() => {
    const safe = resolvedBaseSrc;
    return [480, 768, 1024, 1400].map((w) => `${optimizeUrl(safe, w)} ${w}w`).join(', ');
  }, [resolvedBaseSrc]);

  return (
    <img
      src={optimizeUrl(resolvedBaseSrc, 1024)}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={loading}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={(event) => {
        const target = event.currentTarget;
        const current = target.getAttribute('data-fallback-step') || '0';
        if (current === '0') {
          target.setAttribute('data-fallback-step', '1');
          target.src = optimizeUrl(fallbackSrc, 1024);
          return;
        }
        target.setAttribute('data-fallback-step', '2');
        target.src = onErrorSrc;
      }}
      className={className}
    />
  );
};

export default PackageImage;
