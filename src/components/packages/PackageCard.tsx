import { Link } from 'react-router-dom';
import { Star, MapPin, Clock, ArrowRight } from 'lucide-react';

interface PackageCardProps {
  id: string;
  title: string;
  location: string;
  duration: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  description: string;
}

const PackageCard = ({
  id,
  title,
  location,
  duration,
  price,
  rating,
  reviews,
  image,
  description,
}: PackageCardProps) => {
  return (
    <Link
      to={`/packages/${id}`}
      className="card-travel group flex flex-col md:flex-row"
    >
      <div className="relative w-full md:w-72 h-56 md:h-auto overflow-hidden flex-shrink-0">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
          Popular
        </div>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-1 text-amber-500 mb-2">
          <Star className="h-4 w-4 fill-current" />
          <span className="text-sm font-medium">{rating}</span>
          <span className="text-muted-foreground text-sm">
            ({reviews} reviews)
          </span>
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-3">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{duration}</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2 flex-1">
          {description}
        </p>
        <div className="flex items-center justify-between mt-auto">
          <div>
            <span className="text-2xl font-bold text-primary">${price}</span>
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
