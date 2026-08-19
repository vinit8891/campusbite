import React from "react";
import type { FilterType, SortType } from "@/types/orders";
import { FILTER_BUTTONS } from "@/hooks/orders/useOrderFiltering";

export type OrderFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  sort: SortType;
  onSortChange: (sort: SortType) => void;
  filterCounts: Record<FilterType, number>;
  className?: string;
};

export function OrderFilterBar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  filterCounts,
  className = "",
}: OrderFilterBarProps) {
  return (
    <section
      className={`rounded-3xl border border-gray-100 bg-white p-4 shadow-sm ${className}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>

          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by restaurant, food item or order ID"
            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortType)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:w-44"
        >
          <option value="Newest">Newest</option>
          <option value="Oldest">Oldest</option>
          <option value="Highest Amount">Highest Amount</option>
          <option value="Lowest Amount">Lowest Amount</option>
        </select>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {FILTER_BUTTONS.map((item) => {
          const active = filter === item;

          return (
            <button
              key={item}
              type="button"
              onClick={() => onFilterChange(item)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              {item} ({filterCounts[item] ?? 0})
            </button>
          );
        })}
      </div>
    </section>
  );
}
