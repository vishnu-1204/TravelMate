export type PackageCategory = {
  id: string;
  title: string;
  image: string;
};

export const packageCategories: PackageCategory[] = [
  {
    id: 'international',
    title: 'International',
    image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200&auto=format&fit=crop',
  },
  {
    id: 'domestic',
    title: 'Indian Packages',
    image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200&auto=format&fit=crop',
  },
  {
    id: 'south',
    title: 'South Indian Packages',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&auto=format&fit=crop',
  },
  {
    id: 'north',
    title: 'North Indian Packages',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&auto=format&fit=crop',
  },
  {
    id: 'nearby',
    title: 'Solo Trips',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&auto=format&fit=crop',
  },
  {
    id: 'solo',
    title: 'Solo Trips',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&auto=format&fit=crop',
  },
  {
    id: 'budget',
    title: 'Budget Travel',
    image: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=1200&auto=format&fit=crop',
  },
  {
    id: 'honeymoon',
    title: 'Honeymoon',
    image: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200&auto=format&fit=crop',
  },
  {
    id: 'group',
    title: 'Group Tours',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&auto=format&fit=crop',
  },
  {
    id: 'educational',
    title: 'Educational Packages',
    image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&auto=format&fit=crop',
  },

  {
    id: 'trending',
    title: 'Trending Picks',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&auto=format&fit=crop',
  },
];

export const packageCategoryLabelById = Object.fromEntries(
  packageCategories.map((category) => [category.id, category.title])
) as Record<string, string>;
