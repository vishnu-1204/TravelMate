import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { getPackages, type TravelPackage } from '@/lib/packagesApi';
import { packageCategories } from '@/lib/packageCategories';

const FeaturedPackages = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<TravelPackage[]>([]);

  useEffect(() => {
    let active = true;

    const loadPackages = async () => {
      const items = await getPackages();
      if (!active) return;
      setPackages(items);
    };

    void loadPackages();

    return () => {
      active = false;
    };
  }, []);

  const countsByCategory = useMemo(() => {
    const countMap = new Map<string, number>();
    packages.forEach((pkg) => {
      countMap.set(pkg.category, (countMap.get(pkg.category) || 0) + 1);
    });
    return countMap;
  }, [packages]);

  const featuredCategories = useMemo(
    () => [
      {
        id: 'indian',
        title: 'Indian Tour Packages',
        image: packageCategories.find((category) => category.id === 'indian')?.image || '',
      },
      {
        id: 'international',
        title: 'International Tour Packages',
        image: packageCategories.find((category) => category.id === 'international')?.image || '',
      },
      {
        id: 'educational',
        title: 'Educational Tour Packages',
        image: packageCategories.find((category) => category.id === 'educational')?.image || '',
      },
      {
        id: 'group',
        title: 'Group Tours',
        image: packageCategories.find((category) => category.id === 'group')?.image || '',
      },
      {
        id: 'solo',
        title: 'Solo Trips',
        image: 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=1200',
      },
      {
        id: 'european',
        title: 'European Packages',
        image: 'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?w=1200',
      },
    ],
    []
  );

  return (
    <section className="py-20 bg-[hsl(220,25%,12%)]">
      <div className="page-container">
        <h2
          className="text-3xl md:text-4xl font-bold text-white mb-4"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Explore by Category
        </h2>
        <p className="text-white/80 mb-10">Choose from curated tours across all major travel styles.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => navigate(`/packages/${category.id}`)}
              className="relative text-left group overflow-hidden rounded-xl h-56"
            >
              <img
                src={category.image}
                alt={category.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white text-lg font-semibold">{category.title}</h3>
                <p className="text-white/80 text-sm">{countsByCategory.get(category.id) || 0} Packages</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedPackages;
