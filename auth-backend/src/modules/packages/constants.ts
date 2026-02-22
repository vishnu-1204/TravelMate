import type { PackageCategory } from './types';

export const CATEGORY_LABELS: Record<PackageCategory, string> = {
  international: 'International',
  domestic: 'Domestic (India)',
  nearby: 'Nearby / Weekend',
  budget: 'Budget Travel',
  honeymoon: 'Honeymoon',
  group: 'Group Tours',
  educational: 'Educational Tours',
};

export const DEFAULT_INCLUSIONS = [
  'Accommodation',
  'Daily breakfast',
  'Airport transfers',
  'Guided sightseeing',
];

export const DEFAULT_EXCLUSIONS = [
  'Visa fees',
  'Personal expenses',
  'Travel insurance',
  'Optional activities',
];
