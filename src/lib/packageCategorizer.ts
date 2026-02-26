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
  'group',
  'honeymoon',
  'educational',
  'domestic',
  'international',
  'nearby',
  'budget',
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

  const categories = new Set<PackageCategory>();
  categories.add(inferDomesticVsInternational(mergedText, pkg.country));

  if (hasAnyKeyword(mergedText, HONEYMOON_KEYWORDS)) categories.add('honeymoon');
  if (hasAnyKeyword(mergedText, EDUCATIONAL_KEYWORDS)) categories.add('educational');
  if (hasAnyKeyword(mergedText, GROUP_KEYWORDS)) categories.add('group');
  if (hasAnyKeyword(mergedText, BUDGET_KEYWORDS)) categories.add('budget');
  if (hasAnyKeyword(mergedText, WEEKEND_KEYWORDS) || (pkg.durationDays || 0) <= 3) categories.add('nearby');
  if ((pkg.durationDays || 0) <= 4) categories.add('budget');

  (pkg.categories || []).forEach((item) => {
    const normalized = item.toLowerCase() as PackageCategory;
    if (categoryPriority.includes(normalized)) categories.add(normalized);
  });

  if (pkg.category) {
    if (pkg.category === 'indian') {
      categories.add('domestic');
    } else {
      const normalized = pkg.category.toLowerCase() as PackageCategory;
      if (categoryPriority.includes(normalized)) categories.add(normalized);
    }
  }

  return Array.from(categories);
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
    categories,
  } as TravelPackage;
};
