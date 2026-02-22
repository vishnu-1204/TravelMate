import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import { PackageCard } from '@/components/packages/PackageCard';
import { Skeleton } from '@/components/ui/skeleton';
import { getPackagesPage, type TravelPackage } from '@/lib/packagesApi';
import { Mic, Search, Sparkles, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

type SpeechRecognitionCtor = new () => {
  lang: string;
  onresult: ((event: { results: { 0: { transcript: string } }[] }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};

const pageSize = 12;
const recentSearchesKey = 'travelmate_recent_place_searches_v1';

const popularDestinations = ['Goa', 'Manali', 'Ooty', 'Bali', 'Maldives', 'Paris', 'Kerala', 'Dubai'];
const trendingNearby = ['Pondicherry', 'Coorg', 'Munnar', 'Lonavala', 'Rishikesh', 'Alleppey'];
const indianDestinationSet = new Set([
  'ahmedabad',
  'gandhinagar',
  'chennai',
  'mahabalipuram',
  'goa',
  'manali',
  'ooty',
  'kerala',
  'pondicherry',
  'coorg',
  'munnar',
  'lonavala',
  'rishikesh',
  'alleppey',
  'kashmir',
  'jaipur',
  'andaman',
  'nainital',
  'kodaikanal',
  'udaipur',
  'kasol',
  'mysore',
  'delhi',
  'agra',
  'hampi',
  'kolkata',
]);
const indianDestinationKeywords = Array.from(indianDestinationSet);
const categorySuggestionMap: Record<string, string[]> = {
  all: ['Goa', 'Manali', 'Kerala', 'Bali', 'Maldives', 'Paris', 'Dubai', 'Thailand'],
  domestic: ['Goa', 'Ooty', 'Manali', 'Munnar', 'Kashmir', 'Jaipur', 'Kerala', 'Andaman'],
  international: ['Bali', 'Maldives', 'Paris', 'Dubai', 'Singapore', 'Thailand', 'Switzerland', 'London'],
  nearby: ['Pondicherry', 'Coorg', 'Lonavala', 'Rishikesh', 'Alleppey', 'Nainital', 'Kodaikanal', 'Udaipur'],
  budget: ['Goa', 'Pondicherry', 'Rishikesh', 'Jaipur', 'Kasol', 'Coorg', 'Mysore', 'Ooty'],
  honeymoon: ['Maldives', 'Bali', 'Paris', 'Santorini', 'Kerala', 'Manali', 'Kashmir', 'Mauritius'],
  group: ['Goa', 'Dubai', 'Thailand', 'Rishikesh', 'Kasol', 'Bali', 'Manali', 'Singapore'],
  educational: ['Delhi', 'Agra', 'Jaipur', 'Mysore', 'Hampi', 'Kolkata', 'London', 'Rome'],
};

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

const scoreRecommendation = (pkg: TravelPackage) =>
  pkg.rating * 30 + pkg.affordabilityScore * 0.8 + (pkg.badges.bestValue ? 18 : 0) + (pkg.badges.mostAffordable ? 20 : 0) - pkg.price / 6000;

const normalizeCountry = (country?: string) => (country || '').trim().toLowerCase();
const normalizeSuggestion = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const dedupeSuggestions = (items: string[]) =>
  Array.from(
    new Map(
      items
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => [normalizeSuggestion(item), item] as const)
    ).values()
  );
const isIndiaCountry = (country?: string) => {
  const normalized = normalizeCountry(country);
  return normalized === 'india' || normalized === 'in' || normalized === 'ind';
};

const isIndianDestination = (name: string) => {
  const normalized = name.trim().toLowerCase();
  if (indianDestinationSet.has(normalized)) return true;
  return indianDestinationKeywords.some((keyword) => normalized.includes(keyword));
};

const Packages = () => {
  const { category } = useParams<{ category?: string }>();
  const selectedCategory = category || 'all';

  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [voiceBusy, setVoiceBusy] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(recentSearchesKey);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      setRecentSearches(Array.isArray(parsed) ? parsed.slice(0, 6) : []);
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadPackages = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await getPackagesPage({
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          destination: debouncedSearch || undefined,
          search: debouncedSearch || undefined,
          sortBy: 'trending',
          sortOrder: 'desc',
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });
        if (!active) return;
        const safetyFiltered = result.packages.filter((pkg) => {
          const looksIndianByText = isIndianDestination(`${pkg.destination} ${pkg.location} ${pkg.title}`);
          if (selectedCategory === 'international') {
            return pkg.category === 'international' && !isIndiaCountry(pkg.country) && !looksIndianByText;
          }
          if (selectedCategory === 'domestic') {
            return pkg.category === 'domestic' || isIndiaCountry(pkg.country) || looksIndianByText;
          }
          return true;
        });
        setPackages(safetyFiltered);
        if (selectedCategory === 'international' || selectedCategory === 'domestic') {
          const removedOnPage = Math.max(result.packages.length - safetyFiltered.length, 0);
          setTotal(Math.max(result.total - removedOnPage, safetyFiltered.length));
        } else {
          setTotal(result.total);
        }
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
  }, [selectedCategory, debouncedSearch, page, reloadToken]);

  const pageTitle = selectedCategory === 'all' ? 'Find Your Next Destination' : `${selectedCategory[0].toUpperCase()}${selectedCategory.slice(1)} Packages`;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const liveSuggestions = useMemo(() => {
    const categoryKey = selectedCategory.toLowerCase();
    const categorySpecific = categorySuggestionMap[categoryKey] || categorySuggestionMap.all;
    const fromPackages = packages
      .flatMap((pkg) => {
        const destination = pkg.destination?.trim() || '';
        const locationPrimary = (pkg.location || '')
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)[0];
        return [destination, locationPrimary || ''];
      })
      .filter(Boolean);
    const recentRelevant = recentSearches.filter((item) => {
      if (categoryKey === 'international') return !isIndianDestination(item);
      if (categoryKey === 'all') return true;
      if (categoryKey === 'domestic' || categoryKey === 'nearby' || categoryKey === 'educational') return isIndianDestination(item);
      return true;
    });

    let unique = dedupeSuggestions([...categorySpecific, ...fromPackages, ...recentRelevant]);
    if (categoryKey === 'international') {
      unique = unique.filter((item) => !isIndianDestination(item));
    } else if (categoryKey === 'domestic' || categoryKey === 'nearby' || categoryKey === 'educational') {
      unique = unique.filter((item) => isIndianDestination(item));
    }

    const term = normalizeSuggestion(searchInput);
    const filtered = !term ? unique : unique.filter((item) => normalizeSuggestion(item).includes(term));
    return filtered.slice(0, 12);
  }, [packages, recentSearches, searchInput, selectedCategory]);

  const aiRecommendations = useMemo(
    () => [...packages].sort((a, b) => scoreRecommendation(b) - scoreRecommendation(a)).slice(0, 3),
    [packages]
  );

  const expensiveAlternatives = useMemo(() => {
    const firstExpensive = packages.find((pkg) => pkg.nearbyAlternatives.length > 0);
    return firstExpensive?.nearbyAlternatives || [];
  }, [packages]);

  const saveRecent = (value: string) => {
    const v = value.trim();
    if (!v) return;
    const next = [v, ...recentSearches.filter((item) => item.toLowerCase() !== v.toLowerCase())].slice(0, 6);
    setRecentSearches(next);
    try {
      localStorage.setItem(recentSearchesKey, JSON.stringify(next));
    } catch {
      // no-op
    }
  };

  const applySearch = (value: string) => {
    setSearchInput(value);
    setDebouncedSearch(value.trim());
    setShowSuggestions(false);
    setPage(1);
    saveRecent(value);
  };

  const handleVoiceSearch = () => {
    const ctor =
      (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (!ctor || voiceBusy) return;
    const recognition = new ctor();
    setVoiceBusy(true);
    recognition.lang = 'en-IN';
    recognition.onresult = (event) => {
      const spoken = event.results?.[0]?.[0]?.transcript || '';
      applySearch(spoken);
      setVoiceBusy(false);
    };
    recognition.onerror = () => setVoiceBusy(false);
    recognition.start();
  };

  return (
    <Layout>
      <PageTransition>
        <section className="hero-section py-16">
          <div className="page-container">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{pageTitle}</h1>
              <p className="text-white/90 text-lg max-w-2xl mx-auto mb-8">
                Simple and fast destination discovery with one smart place search.
              </p>
            </div>

            <div className="sticky top-20 z-20">
              <div className="bg-white/95 backdrop-blur rounded-2xl p-4 md:p-5 shadow-xl border border-white/80">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') applySearch(searchInput);
                    }}
                    placeholder="Search city, state, country, or tourist place"
                    className="w-full pl-10 pr-24 py-3 rounded-xl border border-border bg-background text-slate-900 placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleVoiceSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-xs font-medium border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                    disabled={voiceBusy}
                    title="Voice search"
                  >
                    <span className="inline-flex items-center gap-1">
                      <Mic className="h-3.5 w-3.5" />
                      {voiceBusy ? 'Listening...' : 'Voice'}
                    </span>
                  </button>
                </div>

                {showSuggestions && liveSuggestions.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs text-slate-500 mb-2">
                      Suggestions{selectedCategory !== 'all' ? ` for ${selectedCategory[0].toUpperCase()}${selectedCategory.slice(1)}` : ''}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {liveSuggestions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onMouseDown={() => applySearch(item)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-800 hover:bg-slate-50"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-background">
          <div className="page-container">
            {aiRecommendations.length > 0 ? (
              <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-sm font-medium text-blue-900 inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Smart picks for you
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  {aiRecommendations.map((pkg) => pkg.destination).join(', ')} based on affordability, popularity, and ratings.
                </p>
              </div>
            ) : null}

            {expensiveAlternatives.length > 0 ? (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Nearby affordable alternatives: {expensiveAlternatives.join(', ')}
              </div>
            ) : null}

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
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No results found for "{debouncedSearch || 'your search'}".</p>
                <p className="text-sm text-muted-foreground mt-2">Try: {popularDestinations.slice(0, 5).join(', ')}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total} destinations
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
                      imageAlt={pkg.imageAlt}
                      category={pkg.category}
                      shortDescription={pkg.shortDescription}
                      budgetType={pkg.budgetType}
                      pricingTier={pkg.pricingTier}
                      travelerSegments={pkg.travelerSegments}
                      affordabilityScore={pkg.affordabilityScore}
                      dynamicPricing={pkg.dynamicPricing}
                      specialTags={pkg.specialTags}
                      badges={pkg.badges}
                      highlightQuery={debouncedSearch}
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
