import { Star, CheckCircle } from 'lucide-react';

export type Review = {
  id: string;
  user_id: string;
  package_id: string;
  rating: number;
  comment: string;
  is_verified_purchase: boolean;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_path: string | null;
  };
};

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center text-[#FFC857] font-bold overflow-hidden shrink-0">
            {review.profiles?.avatar_path ? (
              <img
                src={review.profiles.avatar_path}
                alt={review.profiles.full_name || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              review.profiles?.full_name?.charAt(0) || 'U'
            )}
          </div>
          <div>
            <h4 className="font-semibold text-foreground">
              {review.profiles?.full_name || 'Anonymous User'}
            </h4>
            <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      <p className="text-foreground text-sm leading-relaxed mb-4">{review.comment}</p>

      {review.is_verified_purchase && (
        <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>Verified Purchase</span>
        </div>
      )}
    </div>
  );
}
