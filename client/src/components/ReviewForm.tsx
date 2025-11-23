import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Review } from "@shared/schema";

interface ReviewFormProps {
  schoolDbn: string;
  existingReview?: Review;
  onSuccess?: () => void;
}

export function ReviewForm({ schoolDbn, existingReview, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [reviewText, setReviewText] = useState(existingReview?.reviewText || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reviewMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/schools/${schoolDbn}/reviews`, {
        rating,
        reviewText: reviewText.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schools", schoolDbn, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schools", schoolDbn, "reviews", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schools", schoolDbn, "reviews", "user"] });
      toast({
        title: existingReview ? "Review updated" : "Review submitted",
        description: "Thank you for your feedback!",
      });
      if (!existingReview) {
        setRating(0);
        setReviewText("");
      }
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({
        title: "Please select a rating",
        description: "You must select at least 1 star to submit a review.",
        variant: "destructive",
      });
      return;
    }
    reviewMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-review">
      <div className="space-y-2">
        <label className="text-sm font-medium">Your Rating</label>
        <StarRating 
          rating={rating} 
          onRatingChange={setRating} 
          size="lg"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="review-text" className="text-sm font-medium">
          Your Review (Optional)
        </label>
        <Textarea
          id="review-text"
          placeholder="Share your experience with this school..."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={4}
          maxLength={1000}
          data-testid="input-review-text"
        />
        <p className="text-xs text-muted-foreground">
          {reviewText.length}/1000 characters
        </p>
      </div>

      <Button 
        type="submit" 
        disabled={reviewMutation.isPending || rating === 0}
        data-testid="button-submit-review"
      >
        {reviewMutation.isPending ? "Submitting..." : existingReview ? "Update Review" : "Submit Review"}
      </Button>
    </form>
  );
}
