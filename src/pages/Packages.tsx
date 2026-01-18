import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import PackageCard from '@/components/packages/PackageCard';
import packagesData from '@/data/packages.json';
import { Search } from 'lucide-react';
import { useState } from 'react';

const Packages = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPackages = packagesData.filter(
    (pkg) =>
      pkg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <PageTransition>
        {/* Header */}
        <section className="hero-section py-16">
          <div className="page-container">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Travel Packages
              </h1>
              <p className="text-white/90 text-lg max-w-2xl mx-auto mb-8">
                Explore our curated collection of travel packages designed to create unforgettable memories
              </p>

              {/* Search */}
              <div className="max-w-xl mx-auto relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search destinations..."
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-0 focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Packages List */}
        <section className="py-16 bg-background">
          <div className="page-container">
            {filteredPackages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  No packages found matching "{searchTerm}"
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredPackages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    id={pkg.id}
                    title={pkg.title}
                    location={pkg.location}
                    duration={pkg.duration}
                    price={pkg.price}
                    rating={pkg.rating}
                    reviews={pkg.reviews}
                    image={pkg.image}
                    description={pkg.description}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default Packages;
