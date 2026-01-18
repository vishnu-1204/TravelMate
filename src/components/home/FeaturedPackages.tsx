import { Link } from 'react-router-dom';
import { Star, MapPin, Clock, ArrowRight } from 'lucide-react';
import packagesData from '@/data/packages.json';

const FeaturedPackages = () => {
  const featuredPackages = packagesData.slice(0, 3);

  return (
    <section className="py-20 bg-background">
      <div className="page-container">
        <div className="text-center mb-12">
          <h2 className="section-title">Popular Destinations</h2>
          <p className="section-subtitle max-w-2xl mx-auto">
            Discover our most loved travel packages, handpicked for unforgettable experiences
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredPackages.map((pkg) => (
            <Link
              key={pkg.id}
              to={`/packages/${pkg.id}`}
              className="card-travel group"
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={pkg.image}
                  alt={pkg.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full">
                  <span className="text-primary font-bold">${pkg.price}</span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-1 text-amber-500 mb-2">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-sm font-medium">{pkg.rating}</span>
                  <span className="text-muted-foreground text-sm">
                    ({pkg.reviews} reviews)
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {pkg.title}
                </h3>
                <div className="flex items-center gap-4 text-muted-foreground text-sm mb-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{pkg.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{pkg.duration}</span>
                  </div>
                </div>
                <div className="flex items-center text-primary font-medium group-hover:gap-2 transition-all">
                  View Details
                  <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/packages" className="btn-outline">
            View All Packages
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedPackages;
