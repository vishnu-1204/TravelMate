import { Link } from 'react-router-dom';

const packageCategories = [
  {
    id: 'india',
    title: 'India Tour Packages',
    tours: 98,
    image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800',
    size: 'large'
  },
  {
    id: 'international',
    title: 'International Tour Packages',
    tours: 362,
    image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800',
    size: 'large'
  },
  {
    id: 'honeymoon',
    title: 'International Honeymoon Packages',
    tours: 17,
    image: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800',
    size: 'small'
  },
  {
    id: 'europe',
    title: 'Europe Tour Packages',
    tours: 144,
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
    size: 'small'
  },
  {
    id: 'educational',
    title: 'Educational Tour Packages',
    tours: 15,
    image: '',
    size: 'small'
  }
];

const FeaturedPackages = () => {
  return (
    <section className="py-20 bg-[hsl(220,25%,12%)]">
      <div className="page-container">
        <h2 
          className="text-3xl md:text-4xl font-bold text-white mb-12"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Popular Packages
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Large Cards - First Row */}
          {packageCategories.filter(cat => cat.size === 'large').map((category, index) => (
            <Link
              key={category.id}
              to={`/packages?category=${category.id}`}
              className={`relative group overflow-hidden rounded-lg ${
                index === 0 ? 'lg:col-span-3' : 'lg:col-span-3'
              } h-64 md:h-80`}
            >
              <img
                src={category.image}
                alt={category.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <h3 className="text-white text-xl md:text-2xl font-medium mb-3">
                  {category.title}
                </h3>
                <span className="bg-[hsl(var(--cyan-accent))] text-[hsl(220,25%,12%)] px-4 py-1 rounded text-sm font-semibold">
                  {category.tours} TOURS
                </span>
              </div>
            </Link>
          ))}

          {/* Small Cards - Second Row */}
          {packageCategories.filter(cat => cat.size === 'small').map((category) => (
            <Link
              key={category.id}
              to={`/packages?category=${category.id}`}
              className="relative group overflow-hidden rounded-lg lg:col-span-2 h-56"
            >
              {category.image ? (
                <>
                  <img
                    src={category.image}
                    alt={category.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                </>
              ) : (
                <div className="w-full h-full bg-[hsl(220,20%,18%)]" />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <h3 className="text-white text-lg md:text-xl font-medium mb-3">
                  {category.title}
                </h3>
                <span className="bg-[hsl(var(--cyan-accent))] text-[hsl(220,25%,12%)] px-4 py-1 rounded text-sm font-semibold">
                  {category.tours} TOURS
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedPackages;
