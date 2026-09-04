"use client";

import { useState } from "react";
import { RefreshCw, Search, SlidersHorizontal, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClassName } from "@/lib/formatters";
import {
  RESTAURANT_ORDER_STATUSES,
  RESTAURANT_PAYMENT_STATUSES,
  RESTAURANT_PAYMENT_METHODS,
} from "@/hooks/restaurant/useRestaurantOrders";

type RestaurantOrderFilterBarProps = {
  q: string;
  setQ: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  paymentStatus: string;
  onPaymentStatusChange: (val: string) => void;
  paymentMethod: string;
  onPaymentMethodChange: (val: string) => void;
  loading: boolean;
  onSearchSubmit: (e: React.FormEvent) => void;
};

export function RestaurantOrderFilterBar({
  q,
  setQ,
  status,
  onStatusChange,
  paymentStatus,
  onPaymentStatusChange,
  paymentMethod,
  onPaymentMethodChange,
  loading,
  onSearchSubmit,
}: RestaurantOrderFilterBarProps) {
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const activeFilterCount =
    (status ? 1 : 0) + (paymentStatus ? 1 : 0) + (paymentMethod ? 1 : 0);

  const handleClearFilters = () => {
    onStatusChange("");
    onPaymentStatusChange("");
    onPaymentMethodChange("");
  };

  return (
    <form
      onSubmit={onSearchSubmit}
      className="rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white p-3 sm:p-5 shadow-xs transition-all"
    >
      {/* Mobile Top Row: Compact Search & Filter Toggle (< md) */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-stone-400"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order ID or phone..."
            className="h-10 pl-9 pr-8 text-xs rounded-xl border-stone-200 focus-visible:ring-orange-500 bg-stone-50/50"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsFiltersExpanded((prev) => !prev)}
          className={`flex h-10 items-center gap-1.5 px-3 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
            isFiltersExpanded || activeFilterCount > 0
              ? "bg-orange-50 border-orange-300 text-orange-700 shadow-xs"
              : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
          }`}
          aria-expanded={isFiltersExpanded}
          aria-label="Toggle advanced filters"
        >
          <SlidersHorizontal size={14} />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-orange-600 text-white font-black text-[10px]">
              {activeFilterCount}
            </span>
          )}
          {isFiltersExpanded ? (
            <ChevronUp size={14} className="text-stone-400 ml-0.5" />
          ) : (
            <ChevronDown size={14} className="text-stone-400 ml-0.5" />
          )}
        </button>
      </div>

      {/* Mobile Collapsible Dropdowns (< md) */}
      {isFiltersExpanded && (
        <div className="mt-3 pt-3 border-t border-stone-100 space-y-2.5 md:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className={`${selectClassName} h-10 rounded-xl text-xs bg-stone-50/60`}
              aria-label="Order status"
            >
              <option value="">All statuses</option>
              {RESTAURANT_ORDER_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <select
              value={paymentStatus}
              onChange={(e) => onPaymentStatusChange(e.target.value)}
              className={`${selectClassName} h-10 rounded-xl text-xs bg-stone-50/60`}
              aria-label="Payment status"
            >
              <option value="">All payment statuses</option>
              {RESTAURANT_PAYMENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <select
              value={paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value)}
              className={`${selectClassName} h-10 rounded-xl text-xs bg-stone-50/60`}
              aria-label="Payment method"
            >
              <option value="">All methods</option>
              {RESTAURANT_PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-stone-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <X size={12} />
                <span>Reset filters</span>
              </button>
            ) : (
              <span className="text-stone-400 text-[11px]">Auto-polled every 5s</span>
            )}

            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg text-xs gap-1.5 border-stone-200"
              disabled={loading}
            >
              <RefreshCw
                size={12}
                className={loading ? "animate-spin text-orange-600" : "text-stone-500"}
              />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      )}

      {/* Desktop Grid Layout (hidden on mobile, visible on md+) */}
      <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="relative xl:col-span-2">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-stone-400"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer, phone, or order ID…"
            className="h-11 pl-9 rounded-2xl border-stone-200 focus-visible:ring-orange-500"
          />
        </div>

        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className={`${selectClassName} h-11 rounded-2xl`}
          aria-label="Order status"
        >
          <option value="">All statuses</option>
          {RESTAURANT_ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <select
          value={paymentStatus}
          onChange={(e) => onPaymentStatusChange(e.target.value)}
          className={`${selectClassName} h-11 rounded-2xl`}
          aria-label="Payment status"
        >
          <option value="">All payment statuses</option>
          {RESTAURANT_PAYMENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
            className={`${selectClassName} h-11 rounded-2xl flex-1`}
            aria-label="Payment method"
          >
            <option value="">All methods</option>
            {RESTAURANT_PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>

          <Button
            type="submit"
            variant="outline"
            className="h-11 rounded-2xl shrink-0 gap-2 border-stone-200 hover:bg-stone-50 font-bold"
            disabled={loading}
            aria-label="Refresh orders"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin text-orange-600" : "text-stone-500"}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>
    </form>
  );
}

