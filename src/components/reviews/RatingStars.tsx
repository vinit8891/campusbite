"use client";

import { useState } from "react";

type RatingStarsProps = {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
  disabled?: boolean;
};

export default function RatingStars({
  value,
  onChange,
  size = 36,
  disabled = false,
}: RatingStarsProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const active =
          hover >= star || (!hover && value >= star);

        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            aria-pressed={value >= star}
            onClick={() => onChange(star)}
            onMouseEnter={() =>
              !disabled && setHover(star)
            }
            onMouseLeave={() =>
              !disabled && setHover(0)
            }
            className={`transition-all duration-200 ${
              disabled
                ? "cursor-default"
                : "cursor-pointer hover:scale-110"
            }`}
          >
            <span
              style={{ fontSize: `${size}px` }}
              className={
                active
                  ? "text-yellow-400"
                  : "text-gray-300"
              }
            >
              ★
            </span>
          </button>
        );
      })}

      {value > 0 && (
        <span className="ml-2 text-sm font-semibold text-gray-600">
          {value}/5
        </span>
      )}
    </div>
  );
}