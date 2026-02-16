import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import PackageCard from '@/components/packages/PackageCard';
import { packageCategories, packageCategoryLabelById } from '@/lib/packageCategories';
import { getPackagesPage, type TravelPackage } from '@/lib/packagesApi';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type SortOption = 'price-low-high' | 'price-high-low' | 'rating-high-low' | 'duration-short-long';

const sortMap: Record<SortOption, { sortBy: 'price' | 'rating' | 'duration'; sortOrder: 'asc' | 'desc' }> = {
  'price-low-high': { sortBy: 'price', sortOrder: 'asc' },
  'price-high-low': { sortBy: 'price', sortOrder: 'desc' },
  'rating-high-low': { sortBy: 'rating', sortOrder: 'desc' },
  'duration-short-long': { sortBy: 'duration', sortOrder: 'asc' },
};

const pageSize = 12;

const Packages = () => {
  const { category } = useParams<{ category?: string }>();
  const navigate = useNavigate();

  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');
  const [sortBy, setSortBy] = useState<SortOption>('rating-high-low');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setSelectedCategory(category || 'all');
    setPage(1);
  }, [category]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  useEffect(() => {
    let active = true;

    const loadPackages = async () => {
      setLoading(true);
      const sortQuery = sortMap[sortBy];

      const result = await getPackagesPage({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: debouncedSearch || undefined,
        sortBy: sortQuery.sortBy,
        sortOrder: sortQuery.sortOrder,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });

      if (!active) return;
      setPackages(result.packages);
      setTotal(result.total);
      setLoading(false);
    };

    void loadPackages();

    return () => {
      active = false;
    };
  }, [selectedCategory, debouncedSearch, sortBy, page]);

  const pageTitle =
    selectedCategory === 'all'
      ? 'All Travel Packages'
      : packageCategoryLabelById[selectedCategory] || 'Travel Packages';

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setPage(1);
    navigate(value === 'all' ? '/packages' : `/packages/${value}`);
  };

  return (
    <Layout>
      <PageTransition>
        <section className="hero-section py-16">
          <div className="page-container">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{pageTitle}</h1>
              <p className="text-white/90 text-lg max-w-2xl mx-auto mb-8">
                Explore curated tours across international, Indian, luxury, honeymoon, and more categories.
              </p>
            </div>

            <div className="bg-white/95 rounded-2xl p-4 md:p-5 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by destination or package name"
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-border bg-background text-foreground"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(event) => handleCategoryChange(event.target.value)}
                className="w-full py-3 px-3 rounded-xl border border-border bg-background text-foreground"
              >
                <option value="all">All Categories</option>
                {packageCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as SortOption);
                  setPage(1);
                }}
                className="w-full py-3 px-3 rounded-xl border border-border bg-background text-foreground"
              >
                <option value="rating-high-low">Sort: Rating (High to Low)</option>
                <option value="price-low-high">Sort: Price (Low to High)</option>
                <option value="price-high-low">Sort: Price (High to Low)</option>
                <option value="duration-short-long">Sort: Duration (Short to Long)</option>
              </select>
            </div>
          </div>
        </section>

        <section className="py-16 bg-background">
          <div className="page-container">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-lg">Loading packages...</div>
            ) : packages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-lg">
                No packages found. Try changing search, category, or sort.
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-6">
                  Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total} packages
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {packages.map((pkg) => (
                    <PackageCard
                      key={pkg.id}
                      id={pkg.id}
                      title={pkg.title}
                      destination={pkg.destination}
                      duration={pkg.duration}
                      price={pkg.price}
                      discount={pkg.discount}
                      rating={pkg.rating}
                      reviews={pkg.reviews}
                      imageUrl={pkg.imageUrl}
                      shortDescription={pkg.shortDescription}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-center gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1}
                    className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page >= totalPages}
                    className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default Packages;
