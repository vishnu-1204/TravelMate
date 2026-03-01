import type { PackageCategory, TravelPackage } from '../types';

type ClassifyInput = Pick<
  TravelPackage,
  'title' | 'description' | 'shortDescription' | 'destination' | 'location' | 'durationDays' | 'highlights' | 'country'
> & {
  category?: string;
  categories?: string[];
};

const INDIA_KEYWORDS = [
  'india',
  'goa',
  'kerala',
  'delhi',
  'mumbai',
  'jaipur',
  'manali',
  'shimla',
  'ladakh',
  'kashmir',
  'rishikesh',
  'varanasi',
  'udaipur',
  'darjeeling',
  'coorg',
  'ooty',
  'mysore',
  'hampi',
  'amritsar',
  'jaisalmer',
  'nainital',
  'gangtok',
  'kodaikanal',
  'alleppey',
  'kochi',
  'mahabaleshwar',
  'puri',
  'konark',
  'bhuj',
];

const INTERNATIONAL_HINTS = [
  'switzerland',
  'swiss',
  'japan',
  'bali',
  'dubai',
  'europe',
  'paris',
  'rome',
  'tokyo',
  'london',
  'thailand',
  'france',
  'italy',
  'australia',
  'mexico',
  'usa',
  'uk',
  'uae',
];

const HONEYMOON_KEYWORDS = ['honeymoon', 'romantic', 'couple', 'newlywed', 'private'];
const EDUCATIONAL_KEYWORDS = ['school', 'college', 'educational', 'study', 'industrial visit', 'museum', 'campus'];
const GROUP_KEYWORDS = ['group', 'friends', 'team', 'corporate', 'batch', 'club', 'reunion'];
const BUDGET_KEYWORDS = ['budget', 'affordable', 'value', 'cheap', 'backpack'];
const WEEKEND_KEYWORDS = ['weekend', '2 nights', '3 days', 'quick break', 'short getaway'];
const SOUTH_INDIA_KEYWORDS = [
  'kerala',
  'tamil nadu',
  'karnataka',
  'andhra',
  'telangana',
  'ooty',
  'kodaikanal',
  'coorg',
  'mysore',
  'hampi',
  'munnar',
  'alleppey',
  'wayanad',
  'thekkady',
  'kovalam',
  'kochi',
  'varkala',
  'hyderabad',
  'visakhapatnam',
  'tirupati',
  'pondicherry',
  'mahabalipuram',
];
const NORTH_INDIA_KEYWORDS = [
  'himachal',
  'uttarakhand',
  'rajasthan',
  'kashmir',
  'ladakh',
  'manali',
  'shimla',
  'kasol',
  'dharamshala',
  'dalhousie',
  'rishikesh',
  'nainital',
  'mussoorie',
  'auli',
  'haridwar',
  'jaipur',
  'udaipur',
  'jodhpur',
  'jaisalmer',
  'agra',
  'delhi',
];

const allCategories = new Set<PackageCategory>([
  'international',
  'domestic',
  'nearby',
  'budget',
  'honeymoon',
  'group',
  'educational',
]);

const hasAnyKeyword = (value: string, keywords: string[]) => keywords.some((keyword) => value.includes(keyword));

const normalizeCountry = (country?: string) => (country || '').trim().toLowerCase();

const isIndiaCountry = (country?: string) => {
  const normalized = normalizeCountry(country);
  return normalized === 'india' || normalized === 'in' || normalized === 'ind';
};

const inferDomesticVsInternational = (input: string, country?: string): PackageCategory => {
  if (isIndiaCountry(country)) return 'domestic';
  if (hasAnyKeyword(input, INDIA_KEYWORDS)) return 'domestic';
  if (hasAnyKeyword(input, INTERNATIONAL_HINTS)) return 'international';
  return 'international';
};

export const classifyPackageCategories = (input: ClassifyInput): PackageCategory[] => {
  const mergedText = [
    input.title,
    input.description,
    input.shortDescription,
    input.destination,
    input.location,
    input.highlights?.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const explicit = String(input.category || '').trim().toLowerCase();
  if (explicit) {
    if (explicit === 'indian') return ['domestic'];
    if (explicit === 'solo' || explicit === 'solo-trips') return ['nearby'];
    if (allCategories.has(explicit as PackageCategory)) return [explicit as PackageCategory];
  }

  const fromCategories = (input.categories || [])
    .map((item) => String(item || '').toLowerCase().trim())
    .find((item) => allCategories.has(item as PackageCategory));
  if (fromCategories) {
    if (fromCategories === 'solo') return ['nearby'];
    return [fromCategories as PackageCategory];
  }

  if (hasAnyKeyword(mergedText, HONEYMOON_KEYWORDS)) return ['honeymoon'];
  if (hasAnyKeyword(mergedText, EDUCATIONAL_KEYWORDS)) return ['educational'];
  if (hasAnyKeyword(mergedText, GROUP_KEYWORDS)) return ['group'];
  if (hasAnyKeyword(mergedText, WEEKEND_KEYWORDS) || (input.durationDays || 0) <= 4) return ['nearby'];
  if (hasAnyKeyword(mergedText, BUDGET_KEYWORDS)) return ['budget'];

  const inferred = inferDomesticVsInternational(mergedText, input.country);
  if (inferred === 'international') return ['international'];
  if (hasAnyKeyword(mergedText, SOUTH_INDIA_KEYWORDS)) return ['domestic'];
  if (hasAnyKeyword(mergedText, NORTH_INDIA_KEYWORDS)) return ['domestic'];
  return ['domestic'];
};

const priority: PackageCategory[] = ['honeymoon', 'educational', 'domestic', 'international', 'nearby', 'budget', 'group'];

export const pickPrimaryCategory = (categories: PackageCategory[]): PackageCategory => {
  for (const item of priority) {
    if (categories.includes(item)) return item;
  }
  return 'international';
};
