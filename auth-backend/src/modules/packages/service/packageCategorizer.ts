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

  const categories = new Set<PackageCategory>();
  categories.add(inferDomesticVsInternational(mergedText, input.country));

  if (hasAnyKeyword(mergedText, HONEYMOON_KEYWORDS)) categories.add('honeymoon');
  if (hasAnyKeyword(mergedText, EDUCATIONAL_KEYWORDS)) categories.add('educational');
  if (hasAnyKeyword(mergedText, GROUP_KEYWORDS)) categories.add('group');
  if (hasAnyKeyword(mergedText, BUDGET_KEYWORDS) || (input.durationDays || 0) <= 4) categories.add('budget');
  if (hasAnyKeyword(mergedText, WEEKEND_KEYWORDS) || (input.durationDays || 0) <= 3) categories.add('nearby');

  if (Array.isArray(input.categories)) {
    input.categories.forEach((item) => {
      const normalized = item.toLowerCase();
      if (allCategories.has(normalized as PackageCategory)) {
        categories.add(normalized as PackageCategory);
      }
    });
  }

  if (input.category) {
    const normalized = input.category.toLowerCase();
    if (normalized === 'indian') {
      categories.add('domestic');
    } else if (allCategories.has(normalized as PackageCategory)) {
      categories.add(normalized as PackageCategory);
    }
  }

  return Array.from(categories);
};

const priority: PackageCategory[] = ['domestic', 'international', 'nearby', 'budget', 'honeymoon', 'group', 'educational'];

export const pickPrimaryCategory = (categories: PackageCategory[]): PackageCategory => {
  for (const item of priority) {
    if (categories.includes(item)) return item;
  }
  return 'international';
};
