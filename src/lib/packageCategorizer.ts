import type { PackageCategory, TravelPackage } from './packagesApi';
import { packageCategoryLabelById } from './packageCategories';

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

const categoryPriority: PackageCategory[] = [
  'honeymoon',
  'educational',
  'solo',
  'south-india',
  'north-india',
  'international',
  'group',
  'budget',
  'domestic',
  'nearby',
  'kerala',
];

export const classifyPackageCategories = (
  pkg: Pick<TravelPackage, 'title' | 'description' | 'shortDescription' | 'destination' | 'location' | 'durationDays' | 'highlights' | 'country'> & {
    category?: string;
    categories?: string[];
  }
): PackageCategory[] => {
  const mergedText = [
    pkg.title,
    pkg.description,
    pkg.shortDescription,
    pkg.destination,
    pkg.location,
    pkg.highlights?.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const explicit = String(pkg.category || '').trim().toLowerCase();
  if (explicit) {
    if (explicit === 'indian') return ['north-india'];
    if (explicit === 'nearby') return ['solo'];
    if (categoryPriority.includes(explicit as PackageCategory)) return [explicit as PackageCategory];
  }

  const fromCategories = (pkg.categories || [])
    .map((item) => String(item || '').toLowerCase().trim())
    .find((item) => categoryPriority.includes(item as PackageCategory));
  if (fromCategories) {
    if (fromCategories === 'nearby') return ['solo'];
    return [fromCategories as PackageCategory];
  }

  if (hasAnyKeyword(mergedText, HONEYMOON_KEYWORDS)) return ['honeymoon'];
  if (hasAnyKeyword(mergedText, EDUCATIONAL_KEYWORDS)) return ['educational'];
  if (hasAnyKeyword(mergedText, GROUP_KEYWORDS)) return ['group'];
  if (hasAnyKeyword(mergedText, WEEKEND_KEYWORDS) || (pkg.durationDays || 0) <= 4) return ['solo'];
  if (hasAnyKeyword(mergedText, BUDGET_KEYWORDS)) return ['budget'];

  const baseCategory = inferDomesticVsInternational(mergedText, pkg.country);
  if (baseCategory === 'international') return ['international'];
  if (hasAnyKeyword(mergedText, SOUTH_INDIA_KEYWORDS)) return ['south-india'];
  if (hasAnyKeyword(mergedText, NORTH_INDIA_KEYWORDS)) return ['north-india'];
  return ['north-india'];
};

export const pickPrimaryCategory = (categories: PackageCategory[]): PackageCategory => {
  for (const item of categoryPriority) {
    if (categories.includes(item)) return item;
  }
  return 'international';
};

export const applyCategorization = (
  pkg: Pick<
    TravelPackage,
    | 'id'
    | 'packageId'
    | 'category'
    | 'categoryLabel'
    | 'country'
    | 'title'
    | 'destination'
    | 'location'
    | 'duration'
    | 'durationDays'
    | 'price'
    | 'discount'
    | 'rating'
    | 'reviews'
    | 'shortDescription'
    | 'inclusions'
    | 'exclusions'
    | 'imageUrl'
    | 'availableDates'
    | 'image'
    | 'description'
    | 'highlights'
    | 'included'
    | 'excluded'
    | 'source'
    | 'trendingScore'
    | 'budgetFriendly'
    | 'budgetType'
    | 'priceRange'
    | 'uniqueImageId'
    | 'affordabilityScore'
    | 'peopleCount'
    | 'hotelType'
    | 'transportMode'
    | 'season'
    | 'specialTags'
    | 'isLuxury'
    | 'lastUpdatedAt'
    | 'categories'
  >
): TravelPackage => {
  const categories = classifyPackageCategories(pkg);
  const primaryCategory = pickPrimaryCategory(categories);

  return {
    ...pkg,
    category: primaryCategory,
    categoryLabel: packageCategoryLabelById[primaryCategory] || pkg.categoryLabel,
    categories: [primaryCategory],
  } as TravelPackage;
};
