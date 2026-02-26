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
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {dynamicPricing.totalDiscountPercent > 0 ? (
          <div className="absolute top-3 left-3 rounded-full bg-red-500 text-white text-xs font-semibold px-3 py-1">
            Save {dynamicPricing.totalDiscountPercent}%
          </div>
        ) : null}
        {isGroupTour && (
          <div className="absolute top-3 right-3 rounded-full bg-blue-600 text-white text-xs font-bold px-3 py-1 shadow-lg flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Group Tour
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col">
        <div className="flex items-center gap-1 text-amber-500 mb-2">
          <Star className="h-4 w-4 fill-current" />
          <span className="text-sm font-medium">{rating}</span>
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
        <p className="text-xs text-muted-foreground mb-1">Tier: {pricingTier} | Segments: {travelerSegments.slice(0, 2).join(', ')}</p>
        {specialTags.length > 0 ? <p className="text-xs text-emerald-700 mb-3 line-clamp-1">{specialTags[0]}</p> : null}
        
        {isGroupTour && groupDepartures && groupDepartures.length > 0 && (
          <div className="mb-3">
            {groupDepartures[0].maxCapacity - groupDepartures[0].currentBookings <= 5 ? (
              <p className="text-xs font-semibold text-rose-600 animate-pulse">
                Hurry! Only {groupDepartures[0].maxCapacity - groupDepartures[0].currentBookings} spots left for {new Date(groupDepartures[0].date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              </p>
            ) : (
              <p className="text-xs font-medium text-emerald-600">
                {groupDepartures[0].maxCapacity - groupDepartures[0].currentBookings} spots available for next departure
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground mb-3">Affordability score: {affordabilityScore}/100</p>
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
            View Details
            <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PackageCard;
