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
    id: 'indian',
    title: 'Indian Tours',
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
    id: 'family',
    title: 'Family Tours',
    image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1200',
  },
  {
    id: 'luxury',
    title: 'Luxury Tours',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200',
  },
  {
    id: 'budget',
    title: 'Budget Tours',
    image: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1200',
  },
];

export const packageCategoryLabelById = Object.fromEntries(
  packageCategories.map((category) => [category.id, category.title])
) as Record<string, string>;
