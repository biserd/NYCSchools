import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StarRating({ rating, onRatingChange, readonly = false, size = "md" }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];
  
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const handleClick = (starValue: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(starValue);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          disabled={readonly}
          className={`${readonly ? "cursor-default" : "cursor-pointer hover-elevate"} transition-colors`}
          data-testid={`star-${star}`}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-none text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
