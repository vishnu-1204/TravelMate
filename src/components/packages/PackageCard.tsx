import { Link } from 'react-router-dom';
import { Star, MapPin, Clock, ArrowRight } from 'lucide-react';
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
      <mark key={`${piece}-${index}`} className="rounded bg-[#FF7A00] text-white px-1 font-semibold">
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
  dynamicPricing,
  isGroupTour,
  highlightQuery,
  imageLoading = 'lazy',
  imagePriority = false,
}: PackageCardProps) => {
  const finalPrice = dynamicPricing.finalPricePerPerson || (discount > 0 ? Math.round(price * (1 - discount / 100)) : price);
  const savings = dynamicPricing.savingsPerPerson || Math.max(price - finalPrice, 0);

  return (
    <Link to={detailsPath || `/package/${id}`} className="card-travel group overflow-hidden bg-[#222222]/80 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all rounded-3xl shadow-lg block">
      <div className="relative h-56 overflow-hidden">
        {/* Luxury Glassmorphic Overlay Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 pointer-events-none">
          {category && (
            <span className="px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-[9px] font-extrabold tracking-widest uppercase text-white shadow-md">
              {category}
            </span>
          )}
          {isGroupTour && (
            <span className="px-2.5 py-1 rounded-lg bg-[#FF7A00] text-white text-[9px] font-extrabold tracking-widest uppercase shadow-md">
              Group Tour
            </span>
          )}
        </div>

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
        {/* Reviews Rating Section */}
        <div className="flex items-center gap-1 text-amber-500 mb-2">
          <Star className="h-4 w-4 fill-current" />
          <span className="text-sm font-semibold">{Number(rating).toFixed(1)}</span>
          <span className="text-gray-400 text-xs font-medium ml-1">({reviews} reviews)</span>
        </div>

        <h3 className="text-base md:text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-[hsl(var(--cyan-accent))] transition-colors">
          {highlightText(title, highlightQuery)}
        </h3>

        {/* Location & Time Specs */}
        <div className="flex flex-wrap items-center gap-3.5 text-gray-400 text-xs mb-3">
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-[hsl(var(--cyan-accent))]" />
            <span className="font-semibold text-gray-300">{highlightText(destination, highlightQuery)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-[hsl(var(--cyan-accent))]" />
            <span className="font-semibold text-gray-300">{duration}</span>
          </div>
        </div>

        <p className="text-gray-400 text-xs leading-relaxed mb-4 line-clamp-2 min-h-[2.5rem]">{shortDescription}</p>

        {/* Price & Book Button */}
        <div className="flex items-end justify-between mt-auto pt-3 border-t border-white/5">
          <div>
            {dynamicPricing.basePricePerPerson > finalPrice ? (
              <p className="text-[10px] text-gray-500 line-through">₹{dynamicPricing.basePricePerPerson.toLocaleString('en-IN')}</p>
            ) : null}
            <div className="flex items-baseline">
              <span className="text-xl font-extrabold text-[hsl(var(--cyan-accent))]">₹{finalPrice.toLocaleString('en-IN')}</span>
              <span className="text-gray-400 text-[10px] ml-0.5">/ person</span>
            </div>
            {savings > 0 ? (
              <p className="text-[9px] font-semibold text-emerald-400 mt-0.5">Save ₹{savings.toLocaleString('en-IN')}</p>
            ) : null}
          </div>

          <div className="flex items-center text-xs font-bold text-[hsl(var(--cyan-accent))] bg-[hsl(var(--cyan-accent))]/10 group-hover:bg-[hsl(var(--cyan-accent))]/20 px-3 py-1.5 rounded-xl transition-all">
            Book
            <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PackageCard;
