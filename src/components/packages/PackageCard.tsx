import { Link } from 'react-router-dom';
import { Star, MapPin, Clock, ArrowRight, TrendingUp } from 'lucide-react';
import type { DynamicPricing, PricingTier, TravelerSegment } from '@/lib/packagePricing';
import PackageImage from '@/components/common/PackageImage';
import type { ReactNode } from 'react';

interface PackageCardProps {
  id: string;
  detailsPath?: string;
  title: string;
  destination: string;
  duration: string;
  price: number;
  discount: number;
  rating: number;
  reviews: number;
  imageUrl: string;
  imageAlt: string;
  category: string;
  shortDescription: string;
  budgetType: 'low' | 'medium' | 'premium';
  pricingTier: PricingTier;
  travelerSegments: TravelerSegment[];
  affordabilityScore: number;
  dynamicPricing: DynamicPricing;
  specialTags: string[];
  badges: { bestValue: boolean; mostAffordable: boolean };
  isGroupTour?: boolean;
  groupDepartures?: Array<{ date: string; maxCapacity: number; currentBookings: number }>;
  highlightQuery?: string;
  imageLoading?: 'lazy' | 'eager';
  imagePriority?: boolean;
}

const highlightText = (value: string, query?: string): ReactNode => {
  const trimmed = (query || '').trim();
  if (!trimmed) return value;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`(${escaped})`, 'ig');
  const pieces = value.split(matcher);
  if (pieces.length <= 1) return value;

  return pieces.map((piece, index) =>
    piece.toLowerCase() === trimmed.toLowerCase() ? (
      <mark key={`${piece}-${index}`} className="rounded bg-amber-100 px-0.5 text-foreground">
        {piece}
      </mark>
    ) : (
      <span key={`${piece}-${index}`}>{piece}</span>
    )
  );
};

export const PackageCard = ({
  id,
  detailsPath,
  title,
  destination,
  duration,
  price,
  discount,
  rating,
  reviews,
  imageUrl,
  imageAlt,
  category,
  shortDescription,
  pricingTier,
  travelerSegments,
  affordabilityScore,
  dynamicPricing,
  specialTags,
  isGroupTour,
  groupDepartures,
  highlightQuery,
  imageLoading = 'lazy',
  imagePriority = false,
}: PackageCardProps) => {
  const finalPrice = dynamicPricing.finalPricePerPerson || (discount > 0 ? Math.round(price * (1 - discount / 100)) : price);
  const savings = dynamicPricing.savingsPerPerson || Math.max(price - finalPrice, 0);

  return (
    <Link to={detailsPath || `/package/${id}`} className="card-travel group overflow-hidden">
      <div className="relative h-56 overflow-hidden">
        <PackageImage
          src={imageUrl}
          alt={imageAlt || `${title} in ${destination}`}
          category={category}
          imageQuery={`${title} ${destination}`}
          packageId={id}
          loading={imageLoading}
          priority={imagePriority}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <div className="p-5 flex flex-col">
        <div className="flex items-center gap-1 text-amber-500 mb-2">
          <Star className="h-4 w-4 fill-current" />
          <span className="text-sm font-medium">{Number(rating).toFixed(1)}</span>
          <span className="text-muted-foreground text-sm">({reviews} reviews)</span>
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-1">{highlightText(title, highlightQuery)}</h3>
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-3">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{highlightText(destination, highlightQuery)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{duration}</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2 min-h-10">{shortDescription}</p>
        
 


        <div className="flex items-end justify-between mt-auto">
          <div>
            {dynamicPricing.basePricePerPerson > finalPrice ? (
              <p className="text-xs text-muted-foreground line-through">Rs {dynamicPricing.basePricePerPerson.toLocaleString('en-IN')}</p>
            ) : null}
            <span className="text-2xl font-bold text-primary">Rs {finalPrice.toLocaleString('en-IN')}</span>
            <span className="text-muted-foreground text-sm"> / person</span>
            {savings > 0 ? <p className="text-xs text-emerald-600">You save Rs {savings.toLocaleString('en-IN')}</p> : null}
          </div>
          <div className="flex items-center text-primary font-medium group-hover:gap-2 transition-all">
            Book Now
            <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PackageCard;
