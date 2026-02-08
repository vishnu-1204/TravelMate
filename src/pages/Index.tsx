import { useState, useCallback } from 'react';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import HeroSection from '@/components/home/HeroSection';
import SearchBar from '@/components/home/SearchBar';
import SearchResults from '@/components/home/SearchResults';
import FeaturedPackages from '@/components/home/FeaturedPackages';
import WhyChooseUs from '@/components/home/WhyChooseUs';
import Testimonials from '@/components/home/Testimonials';
import packagesData from '@/data/packages.json';

interface SearchFilters {
  destination: string;
  checkIn: Date | undefined;
  checkOut: Date | undefined;
  adults: number;
  children: number;
}

const Index = () => {
  const [searchResults, setSearchResults] = useState<typeof packagesData>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback((filters: SearchFilters) => {
    const { destination, checkIn, checkOut } = filters;

    let filtered = [...packagesData];

    // Filter by destination (match against title, location, or category)
    if (destination.trim()) {
      const query = destination.toLowerCase().trim();
      filtered = filtered.filter(
        (pkg) =>
          pkg.title.toLowerCase().includes(query) ||
          pkg.location.toLowerCase().includes(query) ||
          pkg.category.toLowerCase().includes(query)
      );
    }

    // Filter by date range — match packages whose duration fits within selected dates
    if (checkIn && checkOut) {
      const diffDays = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 0) {
        filtered = filtered.filter((pkg) => {
          const daysMatch = pkg.duration.match(/(\d+)\s*Days/i);
          const pkgDays = daysMatch ? parseInt(daysMatch[1], 10) : 0;
          return pkgDays <= diffDays;
        });
      }
    }

    setSearchResults(filtered);
    setHasSearched(true);
  }, []);

  return (
    <Layout>
      <PageTransition>
        <HeroSection />
        <SearchBar onSearch={handleSearch} />
        <SearchResults results={searchResults} hasSearched={hasSearched} />
        <FeaturedPackages />
        <WhyChooseUs />
        <Testimonials />
      </PageTransition>
    </Layout>
  );
};

export default Index;
