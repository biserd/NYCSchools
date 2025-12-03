import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { NyceecReview } from "@shared/schema";

interface NyceecReviewFormProps {
  locCode: string;
  existingReview?: NyceecReview;
  onSuccess?: () => void;
}

export function NyceecReviewForm({ locCode, existingReview, onSuccess }: NyceecReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [reviewText, setReviewText] = useState(existingReview?.reviewText || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (existingReview) {
        return apiRequest("PATCH", `/api/nyceec-reviews/${existingReview.id}`, {
          rating,
          reviewText: reviewText.trim() || null,
        });
      }
      return apiRequest("POST", `/api/nyceec-centers/${locCode}/reviews`, {
        rating,
        reviewText: reviewText.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nyceec-centers", locCode, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nyceec-centers", locCode, "reviews", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nyceec-centers", locCode, "reviews", "user"] });
      toast({
        title: existingReview ? "Review updated" : "Review submitted",
        description: "Thank you for sharing your experience!",
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
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-nyceec-review">
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
          Your Experience (Optional)
        </label>
        <Textarea
          id="review-text"
          placeholder="Share your experience with this early childhood center..."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={4}
          maxLength={1000}
          data-testid="input-nyceec-review-text"
        />
        <p className="text-xs text-muted-foreground">
          {reviewText.length}/1000 characters
        </p>
      </div>

      <Button 
        type="submit" 
        disabled={reviewMutation.isPending || rating === 0}
        data-testid="button-submit-nyceec-review"
      >
        {reviewMutation.isPending ? "Submitting..." : existingReview ? "Update Review" : "Submit Review"}
      </Button>
    </form>
  );
}
