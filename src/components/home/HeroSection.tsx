import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Calendar, Users } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="hero-section relative min-h-[600px] flex items-center">
      {/* Background Image Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920)',
        }}
      >
        <div className="absolute inset-0 bg-primary/80" />
      </div>

      <div className="page-container relative z-10 py-20">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance">
            Discover Your Next Adventure
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl">
            Explore the world's most breathtaking destinations with our carefully curated travel packages. Your dream vacation starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/packages"
              className="bg-white text-primary px-8 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-white/90 transition-colors"
            >
              Explore Packages
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/register"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
            >
              Join Now
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-12 bg-white rounded-xl p-6 shadow-lg max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Destination</p>
                <p className="font-medium text-foreground">Where to?</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium text-foreground">When?</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Travelers</p>
                <p className="font-medium text-foreground">2 Adults</p>
              </div>
            </div>
            <Link
              to="/packages"
              className="btn-primary flex items-center justify-center gap-2"
            >
              Search
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
