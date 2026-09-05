"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export type DeliveryPaginationProps = {
  page: number;
  pages: number;
  total?: number;
  pageSize?: number;
  itemName?: string;
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

export function DeliveryPagination({
  page,
  pages,
  total,
  pageSize = 20,
  itemName = "runs",
  disabled = false,
  onPageChange,
}: DeliveryPaginationProps) {
  const safePages = Math.max(0, pages || 0);
  const isSinglePage =
    safePages <= 1 ||
    (typeof total === "number" && typeof pageSize === "number" && total <= pageSize);

  // Auto-hide when only a single page of results exists
  if (isSinglePage) {
    return null;
  }

  const safePage = Math.min(Math.max(1, page || 1), safePages);

  return (
    <nav
      className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-white/95 p-3 shadow-xs"
      aria-label="Delivery pagination"
    >
      {/* Mobile & Desktop subtle run counter */}
      <p className="text-xs sm:text-sm font-medium text-stone-500" aria-live="polite">
        Showing page <strong className="text-stone-900">{safePage}</strong> of{" "}
        <strong className="text-stone-900">{safePages}</strong>
        {typeof total === "number" ? (
          <span className="text-stone-400 font-normal"> • {total} {itemName}</span>
        ) : null}
      </p>

      {/* Lightweight directional arrows */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={disabled || safePage <= 1}
          aria-label="Previous page"
          className="flex h-9 w-9 sm:w-auto sm:px-3 items-center justify-center gap-1 rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer active:scale-95"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <span
          className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-orange-50 border border-orange-200 px-2 text-xs font-black text-orange-700"
          aria-current="page"
          aria-label={`Current page, page ${safePage}`}
        >
          {safePage}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={disabled || safePage >= safePages}
          aria-label="Next page"
          className="flex h-9 w-9 sm:w-auto sm:px-3 items-center justify-center gap-1 rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer active:scale-95"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </button>
      </div>
    </nav>
  );
}

export default DeliveryPagination;
