export type PackageCategory = {
  id: string;
  title: string;
  image: string;
};

export const packageCategories: PackageCategory[] = [
  {
    id: 'south',
    title: 'South Indian Packages',
    image: 'https://media.istockphoto.com/id/1347088244/photo/kerala-most-beautiful-place-of-india.webp?a=1&b=1&s=612x612&w=0&k=20&c=azs5OiyZpD_zPj96NASr737IVrCq2_m0iu08EVDvIvE=',
  },
  {
    id: 'north',
    title: 'North Indian Packages',
    image: 'https://images.unsplash.com/photo-1615555199911-7e6be103ded8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTl8fG5vcnRoJTIwaW5kaWFuJTIwaW1hZ2VzfGVufDB8fDB8fHww',
  },
  {
    id: 'solo',
    title: 'Solo Trips',
    image: 'https://media.istockphoto.com/id/177426108/photo/backpacker.webp?a=1&b=1&s=612x612&w=0&k=20&c=oqT-ELcigAyejjqbX-1I0btmstwJ6Q9ANuq7dfHWr_k=',
  },
  {
    id: 'honeymoon',
    title: 'Honeymoon',
    image: 'https://media.istockphoto.com/id/1196528669/photo/couple-walks-down-a-wooden-pier-in-the-maldives-indian-ocean.webp?a=1&b=1&s=612x612&w=0&k=20&c=gc9p9H4lWzNZk8n_llqBXKxbonBrSBBewvJYaXGv9Fs=',
  },
  {
    id: 'educational',
    title: 'Educational Packages',
    image: 'https://images.unsplash.com/photo-1764072970350-2ce4f354a483?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8ZWR1Y2F0aW9uJTIwdG91cnxlbnwwfHwwfHx8MA%3D%3D',
  }
];

export const packageCategoryLabelById = Object.fromEntries(
  packageCategories.map((category) => [category.id, category.title])
) as Record<string, string>;
