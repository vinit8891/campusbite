'use client';

import React from 'react';
import { Star, Zap, IndianRupee, Navigation } from 'lucide-react';

export type SortOption = 'distance' | 'rating' | 'fastest' | 'price_asc' | 'delivery_time' | 'price' | string;

export interface SortFilterBarProps {
  currentSort: string;
  onSortChange: (sortKey: string) => void;
  userLocationName?: string;
  onLocationClick?: () => void;
  userCampusLabel?: string;
  isLocating?: boolean;
  onDetectLocation?: () => void;
}

export function SortFilterBar({
  currentSort,
  onSortChange,
  userLocationName,
  onLocationClick,
  userCampusLabel,
  isLocating,
  onDetectLocation,
}: SortFilterBarProps) {
  const sortOptions = [
    { id: 'distance', label: 'Nearest First', icon: Navigation },
    { id: 'rating', label: 'Rating 4.0+', icon: Star },
    { id: 'fastest', label: 'Fastest Delivery', icon: Zap },
    { id: 'price_asc', label: 'Cost: Low to High', icon: IndianRupee },
  ];

  const locationName = userLocationName || userCampusLabel;
  const handleLocationClick = onLocationClick || onDetectLocation;

  return (
    <div className="w-full my-3">
      {/* Sleek Horizontal Scrollable Filter Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar scrollbar-none scroll-smooth">
        {/* Dynamic Location Quick-Badge */}
        {locationName && (
          <button
            type="button"
            onClick={handleLocationClick}
            disabled={isLocating}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-orange-200/80 bg-orange-50/70 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <span className={`h-1.5 w-1.5 rounded-full bg-orange-500 ${isLocating ? 'animate-ping' : 'animate-pulse'}`} />
            <span className="max-w-[130px] truncate">{isLocating ? 'Locating...' : locationName}</span>
          </button>
        )}

        {/* Sort Chips */}
        {sortOptions.map((opt) => {
          const Icon = opt.icon;
          const isActive =
            currentSort === opt.id ||
            (opt.id === 'fastest' && currentSort === 'delivery_time') ||
            (opt.id === 'price_asc' && currentSort === 'price');

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSortChange(isActive ? '' : opt.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 shadow-2xs cursor-pointer active:scale-95 ${
                isActive
                  ? 'border-orange-500 bg-orange-500 text-white shadow-orange-500/20 font-semibold'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SortFilterBar;
