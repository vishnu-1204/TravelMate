import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import PackageCard from '@/components/packages/PackageCard';
import { Skeleton } from '@/components/ui/skeleton';
import { getPackagesPage, type TravelPackage } from '@/lib/packagesApi';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type SortOption =
  | 'trending'
  | 'price-low-high'
  | 'price-high-low'
  | 'rating-high-low'
  | 'duration-short-long';

const categoryOptions = [
  { id: 'all', label: 'All Categories' },
  { id: 'international', label: 'International' },
  { id: 'domestic', label: 'Domestic' },
  { id: 'honeymoon', label: 'Honeymoon' },
  { id: 'group', label: 'Group' },
  { id: 'educational', label: 'Educational' },
  { id: 'adventure', label: 'Adventure' },
];

const sortMap: Record<SortOption, { sortBy: 'price' | 'rating' | 'duration' | 'trending'; sortOrder: 'asc' | 'desc' }> =
  {
    trending: { sortBy: 'trending', sortOrder: 'desc' },
    'price-low-high': { sortBy: 'price', sortOrder: 'asc' },
    'price-high-low': { sortBy: 'price', sortOrder: 'desc' },
    'rating-high-low': { sortBy: 'rating', sortOrder: 'desc' },
    'duration-short-long': { sortBy: 'duration', sortOrder: 'asc' },
  };

const pageSize = 12;

const PackageCardSkeleton = () => (
  <div className="rounded-xl border border-border overflow-hidden bg-card">
    <Skeleton className="h-56 w-full rounded-none" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-6 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  </div>
);

const Packages = () => {
  const { category } = useParams<{ category?: string }>();
  const navigate = useNavigate();

  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');
  const [sortBy, setSortBy] = useState<SortOption>('trending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [destination, setDestination] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minDuration, setMinDuration] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const [minRating, setMinRating] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setSelectedCategory(category || 'all');
    setPage(1);
  }, [category]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let active = true;

    const loadPackages = async () => {
      setLoading(true);
      setError('');

      try {
        const sortQuery = sortMap[sortBy];
        const result = await getPackagesPage({
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          search: debouncedSearch || undefined,
          destination: destination.trim() || undefined,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          minDuration: minDuration ? Number(minDuration) : undefined,
          maxDuration: maxDuration ? Number(maxDuration) : undefined,
          minRating: minRating ? Number(minRating) : undefined,
          sortBy: sortQuery.sortBy,
          sortOrder: sortQuery.sortOrder,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });

        if (!active) return;
        setPackages(result.packages);
        setTotal(result.total);
      } catch (err) {
        if (!active) return;
        setPackages([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : 'Failed to load packages');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPackages();

    return () => {
      active = false;
    };
  }, [selectedCategory, debouncedSearch, sortBy, page, destination, minPrice, maxPrice, minDuration, maxDuration, minRating, reloadToken]);

  const pageTitle =
    selectedCategory === 'all'
      ? 'Live Travel Packages'
      : categoryOptions.find((option) => option.id === selectedCategory)?.label || 'Travel Packages';

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
                Real-time packages powered by external travel APIs and cached for fast discovery.
              </p>
            </div>

            <div className="bg-white/95 rounded-2xl p-4 md:p-5 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by package title"
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-border bg-background text-foreground"
                />
              </div>

              <input
                type="text"
                value={destination}
                onChange={(event) => {
                  setDestination(event.target.value);
                  setPage(1);
                }}
                placeholder="Destination"
                className="w-full py-3 px-3 rounded-xl border border-border bg-background text-foreground"
              />

              <select
                value={selectedCategory}
                onChange={(event) => handleCategoryChange(event.target.value)}
                className="w-full py-3 px-3 rounded-xl border border-border bg-background text-foreground"
              >
                {categoryOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={0}
                value={minPrice}
                onChange={(event) => {
                  setMinPrice(event.target.value);
                  setPage(1);
                }}
                placeholder="Min price"
                className="w-full py-3 px-3 rounded-xl border border-border bg-background text-foreground"
              />

              <input
                type="number"
                min={0}
                value={maxPrice}
                onChange={(event) => {
                  setMaxPrice(event.target.value);
                  setPage(1);
                }}
                placeholder="Max price"
                className="w-full py-3 px-3 rounded-xl border border-border bg-background text-foreground"
              />

              <input
                type="number"
                min={1}
                value={minDuration}
                onChange={(event) => {
                  setMinDuration(event.target.value);
                  setPage(1);
                }}
                placeholder="Min days"
                className="w-full py-3 px-3 rounded-xl border border-border bg-background text-foreground"
              />

              <input
                type="number"
                min={1}
                value={maxDuration}
                onChange={(event) => {
                  setMaxDuration(event.target.value);
                  setPage(1);
                }}
                placeholder="Max days"
                className="w-full py-3 px-3 rounded-xl border border-border bg-background text-foreground"
              />

              <select
                value={minRating}
                onChange={(event) => {
                  setMinRating(event.target.value);
                  setPage(1);
                }}
                className="w-full py-3 px-3 rounded-xl border border-border bg-background text-foreground"
              >
                <option value="">Min rating</option>
                <option value="4.5">4.5+</option>
                <option value="4.2">4.2+</option>
                <option value="4.0">4.0+</option>
                <option value="3.8">3.8+</option>
              </select>

              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as SortOption);
                  setPage(1);
                }}
                className="w-full py-3 px-3 rounded-xl border border-border bg-background text-foreground"
              >
                <option value="trending">Sort: Trending</option>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <PackageCardSkeleton key={index} />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive text-lg">{error}</p>
                <button type="button" className="btn-outline mt-4" onClick={() => setReloadToken((prev) => prev + 1)}>
                  Retry
                </button>
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-lg">
                No packages found. Try changing the filters.
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
