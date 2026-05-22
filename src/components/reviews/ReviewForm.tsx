import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { BACKEND_URL } from '@/lib/apiConfig';

interface ReviewFormProps {
  packageId: string;
  onReviewSubmitted: () => void;
}

export default function ReviewForm({ packageId, onReviewSubmitted }: ReviewFormProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  const backendUrl = BACKEND_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to submit a review.');
      return;
    }

    if (comment.length < 10) {
      toast.error('Please write a review of at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${backendUrl}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          packageId,
          rating,
          comment,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      toast.success('Review submitted successfully!');
      setComment('');
      setRating(5);
      onReviewSubmitted();
    } catch (error) {
      console.error('Submit review error:', error);
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-muted/30 border border-dashed border-border rounded-xl p-8 text-center">
        <p className="text-muted-foreground mb-4">You must be logged in to write a review.</p>
        <button 
          onClick={() => window.location.href = '/login'}
          className="btn-outline"
        >
          Login Now
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-foreground mb-4">Write a Review</h3>
      
      <div className="mb-4">
        <label className="text-sm font-medium text-muted-foreground block mb-2">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
              className="focus:outline-none"
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium text-muted-foreground block mb-2">
          Your Feedback
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this destination..."
          className="input-field min-h-[120px] resize-none"
          required
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitting ? 'Submitting...' : 'Post Review'}
      </button>
    </form>
  );
}
