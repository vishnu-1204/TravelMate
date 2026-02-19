export type PackageCategory = {
  id: string;
  title: string;
  image: string;
};

export const packageCategories: PackageCategory[] = [
  {
    id: 'international',
    title: 'International Tours',
    image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200',
  },
  {
    id: 'domestic',
    title: 'Domestic Tours',
    image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200',
  },
  {
    id: 'honeymoon',
    title: 'Honeymoon Packages',
    image: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200',
  },
  {
    id: 'group',
    title: 'Group Tours',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200',
  },
  {
    id: 'educational',
    title: 'Educational Tours',
    image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200',
  },
  {
    id: 'adventure',
    title: 'Adventure Tours',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200',
  },
  {
    id: 'trending',
    title: 'Trending Picks',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
  },
];

export const packageCategoryLabelById = Object.fromEntries(
  packageCategories.map((category) => [category.id, category.title])
) as Record<string, string>;
