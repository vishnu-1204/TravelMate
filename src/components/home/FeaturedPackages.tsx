import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { getPackageCategoryCounts } from '@/lib/packagesApi';
import { packageCategories } from '@/lib/packageCategories';

const FeaturedPackages = () => {
  const navigate = useNavigate();
  const [countsByCategory, setCountsByCategory] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let active = true;

    const loadPackages = async () => {
      try {
        const counts = await getPackageCategoryCounts();
        if (!active) return;
        setCountsByCategory(new Map(Object.entries(counts)));
      } catch {
        if (!active) return;
        setCountsByCategory(new Map());
      }
    };

    void loadPackages();

    return () => {
      active = false;
    };
  }, []);

  const featuredCategories = useMemo(
    () => [
      {
        id: 'domestic',
        title: 'Domestic (India)',
        image: packageCategories.find((category) => category.id === 'domestic')?.image || '',
      },
      {
        id: 'international',
        title: 'International',
        image: packageCategories.find((category) => category.id === 'international')?.image || '',
      },
      {
        id: 'nearby',
        title: 'Nearby / Weekend',
        image: packageCategories.find((category) => category.id === 'nearby')?.image || '',
      },
      {
        id: 'budget',
        title: 'Budget Travel',
        image: packageCategories.find((category) => category.id === 'budget')?.image || '',
      },
      {
        id: 'honeymoon',
        title: 'Honeymoon',
        image: packageCategories.find((category) => category.id === 'honeymoon')?.image || '',
      },
      {
        id: 'group',
        title: 'Group Tours',
        image: packageCategories.find((category) => category.id === 'group')?.image || '',
      },
      {
        id: 'educational',
        title: 'Educational Tours',
        image: packageCategories.find((category) => category.id === 'educational')?.image || '',
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
