"use client";

import { useState } from "react";
import { Search, X, RefreshCw, ChevronDown, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";

type DeliveryHistoryFilterBarProps = {
  q: string;
  setQ: (val: string) => void;
  fromDate: string;
  setFromDate: (val: string) => void;
  toDate: string;
  setToDate: (val: string) => void;
  onRefresh: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function DeliveryHistoryFilterBar({
  q,
  setQ,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  onRefresh,
  onSubmit,
}: DeliveryHistoryFilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const activeFiltersCount = (fromDate ? 1 : 0) + (toDate ? 1 : 0);

  return (
    <div className="space-y-2">
      {/* Single-Row Clean Search Bar */}
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 rounded-2xl border border-stone-200/80 bg-white p-2 shadow-xs transition-all focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-400/20"
      >
        <div className="relative flex-1 flex items-center min-w-0">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-stone-400 shrink-0" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer, room, or order ID..."
            className="h-10 w-full rounded-xl bg-transparent pl-9 pr-8 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 outline-none"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="absolute right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 text-xs cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>

        {/* Collapsible Filters Toggle Pill */}
        <button
          type="button"
          onClick={() => setShowFilters((prev) => !prev)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 ${
            showFilters || activeFiltersCount > 0
              ? "bg-orange-600 text-white shadow-xs"
              : "border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
          }`}
          aria-label="Toggle filters"
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Filters</span>
          <ChevronDown
            className={`h-3 w-3 transition-transform ${
              showFilters ? "rotate-180" : ""
            }`}
          />
          {activeFiltersCount > 0 ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-orange-600">
              {activeFiltersCount}
            </span>
          ) : null}
        </button>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh deliveries"
          aria-label="Refresh deliveries"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100 transition-colors shrink-0 active:scale-95 cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </form>

      {/* Collapsible Date Range Filters */}
      {showFilters ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-2xl border border-stone-200/80 bg-stone-50/80 p-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">
              From Date
            </label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label="From date"
              className="h-10 bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">
              To Date
            </label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="To date"
              className="h-10 bg-white"
            />
          </div>

          {activeFiltersCount > 0 ? (
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
              >
                Clear Date Filters
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default DeliveryHistoryFilterBar;
