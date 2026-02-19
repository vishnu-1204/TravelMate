import { Link } from 'react-router-dom';
import { Star, MapPin, Clock, ArrowRight } from 'lucide-react';

interface PackageCardProps {
  id: string;
  title: string;
  destination: string;
  duration: string;
  price: number;
  discount: number;
  rating: number;
  reviews: number;
  imageUrl: string;
  shortDescription: string;
}

const PackageCard = ({
  id,
  title,
  destination,
  duration,
  price,
  discount,
  rating,
  reviews,
  imageUrl,
  shortDescription,
}: PackageCardProps) => {
  const finalPrice = discount > 0 ? Math.round(price * (1 - discount / 100)) : price;

  return (
    <Link to={`/package/${id}`} className="card-travel group overflow-hidden">
      <div className="relative h-56 overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          onError={(event) => {
            event.currentTarget.src = '/placeholder.svg';
          }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {discount > 0 ? (
          <div className="absolute top-3 left-3 rounded-full bg-red-500 text-white text-xs font-semibold px-3 py-1">
            {discount}% OFF
          </div>
        ) : null}
      </div>
      <div className="p-5 flex flex-col">
        <div className="flex items-center gap-1 text-amber-500 mb-2">
          <Star className="h-4 w-4 fill-current" />
          <span className="text-sm font-medium">{rating}</span>
          <span className="text-muted-foreground text-sm">({reviews} reviews)</span>
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-1">{title}</h3>
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-3">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{destination}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{duration}</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2 min-h-10">{shortDescription}</p>
        <div className="flex items-end justify-between mt-auto">
          <div>
            {discount > 0 ? (
              <p className="text-xs text-muted-foreground line-through">₹{price.toLocaleString('en-IN')}</p>
            ) : null}
            <span className="text-2xl font-bold text-primary">₹{finalPrice.toLocaleString('en-IN')}</span>
            <span className="text-muted-foreground text-sm"> / person</span>
          </div>
          <div className="flex items-center text-primary font-medium group-hover:gap-2 transition-all">
            View Details
            <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PackageCard;
