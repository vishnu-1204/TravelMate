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
        id: 'south',
        title: 'South Indian Packages',
        image: packageCategories.find((category) => category.id === 'south')?.image || packageCategories.find((c) => c.id === 'south-india')?.image || '',
      },
      {
        id: 'north',
        title: 'North Indian Packages',
        image: packageCategories.find((category) => category.id === 'north')?.image || packageCategories.find((c) => c.id === 'north-india')?.image || '',
      },
      {
        id: 'solo',
        title: 'Solo Trips',
        image: packageCategories.find((category) => category.id === 'solo')?.image || '',
      },
      {
        id: 'honeymoon',
        title: 'Honeymoon Packages',
        image: packageCategories.find((category) => category.id === 'honeymoon')?.image || '',
      },
      {
        id: 'educational',
        title: 'Educational Packages',
        image: packageCategories.find((category) => category.id === 'educational')?.image || '',
      },
    ],
    []
  );

  return (
    <section className="py-20 bg-gradient-to-r from-[#0F0F0F] to-[#020202] border-t border-b border-white/5">
      <div className="page-container">
        <h2
          className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          Explore by Category
        </h2>
        <p className="text-[#B0B0B0] mb-10 font-medium">Choose from curated tours across all major travel styles.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => navigate(`/packages/${category.id}`)}
              className="relative text-left group overflow-hidden rounded-2xl h-56 shadow-lg hover:shadow-2xl border border-white/5 hover:border-white/10 transition-all active:scale-[0.99]"
            >
              <img
                src={category.image}
                alt={category.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-white text-lg font-bold group-hover:text-[#FFC857] transition-colors">{category.title}</h3>
                <p className="text-gray-300 text-xs font-semibold mt-1">{countsByCategory.get(category.id) || 0} Packages</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedPackages;
