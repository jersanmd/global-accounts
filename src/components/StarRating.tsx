import { Star } from "lucide-react";
import { useState } from "react";

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: number;
  readonly?: boolean;
  onChange?: (rating: number) => void;
}

export function StarRating({ rating, max = 5, size = 16, readonly = false, onChange }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const starValue = i + 1;
        const filled = readonly ? starValue <= Math.round(rating) : starValue <= (hover || rating);

        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => !readonly && setHover(starValue)}
            onMouseLeave={() => !readonly && setHover(0)}
            className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
          >
            <Star
              style={{ width: size, height: size }}
              className={filled ? "fill-amber-400 stroke-amber-400" : "fill-none stroke-gray-300"}
            />
          </button>
        );
      })}
    </div>
  );
}
