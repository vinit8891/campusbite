import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export type TableSkeletonProps = {
  rows?: number;
  columns?: number;
  className?: string;
};

export function TableSkeleton({
  rows = 5,
  columns = 6,
  className = "",
}: TableSkeletonProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}
    >
      <div className="space-y-3 p-4 sm:p-6">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-4 border-b border-gray-100 py-3 last:border-0"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className="h-5 flex-1 rounded-md"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
