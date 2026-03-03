import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Star, SearchX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import PackageImage from '@/components/common/PackageImage';

interface Package {
  id: string;
  category: string;
  title: string;
  location: string;
  duration: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  description: string;
}

interface SearchResultsProps {
  results: Package[];
  hasSearched: boolean;
}

const SearchResults = ({ results, hasSearched }: SearchResultsProps) => {
  const navigate = useNavigate();

  if (!hasSearched) return null;

  return (
    <section className="py-16 bg-background">
      <div className="page-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2
            className="text-2xl md:text-3xl font-bold text-foreground mb-2"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Search Results
          </h2>
          <p className="text-muted-foreground mb-8">
            {results.length} {results.length === 1 ? 'package' : 'packages'} found
          </p>
        </motion.div>

        {results.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <SearchX className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No packages found</h3>
            <p className="text-muted-foreground max-w-md">
              We couldn't find any packages matching your search. Try adjusting your destination or travel dates.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {results.map((pkg, index) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group bg-card rounded-xl overflow-hidden border border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <PackageImage
                      src={pkg.image}
                      alt={`${pkg.title} in ${pkg.location}`}
                      category={pkg.category}
                      imageQuery={`${pkg.title} ${pkg.location}`}
                      packageId={pkg.id}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />
                    <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm rounded-lg px-2.5 py-1 flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-accent fill-accent" />
                      <span className="text-xs font-semibold text-foreground">{Number(pkg.rating).toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3
                      className="text-lg font-semibold text-foreground mb-1 line-clamp-1"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      {pkg.title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="text-xs line-clamp-1">{pkg.location}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-muted-foreground mb-4">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs">{pkg.duration}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-primary">₹{pkg.price}</span>
                        <span className="text-xs text-muted-foreground"> /person</span>
                      </div>
                      <Button
                        onClick={() => navigate(`/package/${pkg.id}`)}
                        size="sm"
                        className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs rounded-lg"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
};

export default SearchResults;
