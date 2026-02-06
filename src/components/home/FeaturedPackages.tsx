import { useNavigate } from 'react-router-dom';
import packagesData from '@/data/packages.json';

const packageCategories = [
  {
    id: 'india',
    title: 'India Tour Packages',
    image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800',
    size: 'large'
  },
  {
    id: 'international',
    title: 'International Tour Packages',
    image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800',
    size: 'large'
  },
  {
    id: 'honeymoon',
    title: 'International Honeymoon Packages',
    image: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800',
    size: 'small'
  },
  {
    id: 'europe',
    title: 'Europe Tour Packages',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
    size: 'small'
  },
  {
    id: 'educational',
    title: 'Educational Tour Packages',
    image: 'https://images.unsplash.com/photo-1764072970350-2ce4f354a483?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8RWR1Y2F0aW9uYWwlMjB0b3VyfGVufDB8fDB8fHww',
    size: 'small'
  }
];

const getTourCount = (categoryId: string) => {
  return packagesData.filter(pkg => pkg.category === categoryId).length;
};

const FeaturedPackages = () => {
  const navigate = useNavigate();

  const handleToursClick = (categoryId: string) => {
    navigate(`/packages/${categoryId}`);
  };

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
            <div
              key={category.id}
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
                <p className="text-white/80 text-sm mb-3">{getTourCount(category.id)} Tours Available</p>
                <button
                  onClick={() => handleToursClick(category.id)}
                  className="bg-[hsl(var(--cyan-accent))] text-[hsl(220,25%,12%)] px-6 py-2 rounded text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  TOURS
                </button>
              </div>
            </div>
          ))}

          {/* Small Cards - Second Row */}
          {packageCategories.filter(cat => cat.size === 'small').map((category) => (
            <div
              key={category.id}
              className="relative group overflow-hidden rounded-lg lg:col-span-2 h-56"
            >
              <img
                src={category.image}
                alt={category.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <h3 className="text-white text-lg md:text-xl font-medium mb-2">
                  {category.title}
                </h3>
                <p className="text-white/80 text-sm mb-3">{getTourCount(category.id)} Tours Available</p>
                <button
                  onClick={() => handleToursClick(category.id)}
                  className="bg-[hsl(var(--cyan-accent))] text-[hsl(220,25%,12%)] px-5 py-1.5 rounded text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  TOURS
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedPackages;