import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export type CardSkeletonProps = {
  count?: number;
  className?: string;
  cardHeight?: string;
};

export function CardSkeleton({
  count = 4,
  className = "",
  cardHeight = "h-36",
}: CardSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          className={`${cardHeight} w-full rounded-2xl`}
        />
      ))}
    </div>
  );
}
