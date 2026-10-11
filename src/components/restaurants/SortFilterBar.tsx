"use client";

import React from "react";
import { Navigation, Sparkles, Star, Zap, DollarSign } from "lucide-react";

export type SortOption = "distance" | "rating" | "delivery_time" | "price";

export interface SortFilterBarProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  userCampusLabel?: string;
  isLocating?: boolean;
  onDetectLocation?: () => void;
}

const SORT_PILLS: {
  id: SortOption;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "distance",
    label: "Distance (Nearest First)",
    icon: <Navigation className="h-3.5 w-3.5" />,
  },
  {
    id: "rating",
    label: "Rating (High to Low)",
    icon: <Star className="h-3.5 w-3.5 fill-current" />,
  },
  {
    id: "delivery_time",
    label: "Fastest Delivery",
    icon: <Zap className="h-3.5 w-3.5" />,
  },
  {
    id: "price",
    label: "Price: Low to High",
    icon: <DollarSign className="h-3.5 w-3.5" />,
  },
];

export function SortFilterBar({
  currentSort,
  onSortChange,
  userCampusLabel,
  isLocating,
  onDetectLocation,
}: SortFilterBarProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-orange-100/80 bg-white/95 p-3.5 shadow-sm backdrop-blur-sm">
      {/* Sort Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden lg:inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-stone-500 mr-1">
          <Sparkles className="h-3.5 w-3.5 text-orange-500" />
          Sort by:
        </span>
        {SORT_PILLS.map((pill) => {
          const isActive = currentSort === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => onSortChange(pill.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                isActive
                  ? "bg-orange-600 text-white shadow-sm shadow-orange-500/20 hover:bg-orange-700"
                  : "bg-stone-50 text-stone-700 border border-stone-200/80 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700"
              }`}
            >
              {pill.icon}
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Geolocation Live Status & Re-locate Button */}
      {onDetectLocation && (
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={onDetectLocation}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50/80 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-50"
            title="Update to precise GPS location"
          >
            <Navigation
              className={`h-3 w-3 text-orange-600 ${
                isLocating ? "animate-spin" : ""
              }`}
            />
            <span>{isLocating ? "Locating..." : userCampusLabel || "Share GPS"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default SortFilterBar;
