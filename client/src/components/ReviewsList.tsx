import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { StarRating } from "./StarRating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { ReviewWithUser } from "@shared/schema";

interface ReviewsListProps {
  schoolDbn: string;
  currentUserId?: string;
}

export function ReviewsList({ schoolDbn, currentUserId }: ReviewsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reviews, isLoading } = useQuery<ReviewWithUser[]>({
    queryKey: ["/api/schools", schoolDbn, "reviews"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      return apiRequest("DELETE", `/api/reviews/${reviewId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schools", schoolDbn, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schools", schoolDbn, "reviews", "stats"] });
      toast({
        title: "Review deleted",
        description: "Your review has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete review. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading reviews...</div>;
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground" data-testid="text-no-reviews">
        No reviews yet. Be the first to review this school!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const userName = review.user
          ? `${review.user.firstName || ""} ${review.user.lastName || ""}`.trim() || "Anonymous"
          : "Anonymous";
        
        const initials = review.user?.firstName && review.user?.lastName
          ? `${review.user.firstName[0]}${review.user.lastName[0]}`
          : "A";

        const isOwnReview = currentUserId && review.userId === currentUserId;

        return (
          <Card key={review.id} data-testid={`card-review-${review.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Avatar>
                    {review.user?.profileImageUrl && (
                      <AvatarImage src={review.user.profileImageUrl} alt={userName} />
                    )}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium" data-testid={`text-reviewer-${review.id}`}>
                        {userName}
                      </span>
                      {isOwnReview && (
                        <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                          Your Review
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <StarRating rating={review.rating} readonly size="sm" />
                    
                    {review.reviewText && (
                      <p className="text-sm" data-testid={`text-review-${review.id}`}>
                        {review.reviewText}
                      </p>
                    )}
                  </div>
                </div>

                {isOwnReview && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(review.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-review-${review.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
