"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  pages: number;
  total?: number;
  pageSize?: number;
  itemName?: string;
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

export default function PaginationControls({
  page,
  pages,
  total,
  pageSize,
  itemName = "total",
  disabled = false,
  onPageChange,
}: Props) {
  const safePages = Math.max(0, pages || 0);
  const isSinglePage =
    safePages <= 1 ||
    (typeof total === "number" && typeof pageSize === "number" && total <= pageSize);

  // Auto-hide when there is only a single page of results
  if (isSinglePage) {
    return null;
  }

  const safePage = Math.min(Math.max(1, page || 1), safePages);

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-white/95 p-3 shadow-xs"
      aria-label="Pagination"
    >
      <p className="text-xs sm:text-sm text-stone-500 font-medium" aria-live="polite">
        Showing page <strong className="text-stone-900">{safePage}</strong> of{" "}
        <strong className="text-stone-900">{safePages}</strong>
        {typeof total === "number" ? ` · ${total} ${itemName}` : ""}
      </p>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          aria-label="Go to previous page"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="flex h-9 items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 px-2.5 sm:px-3 text-xs font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <span
          className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-orange-50 border border-orange-200 px-2 text-xs font-extrabold text-orange-700"
          aria-current="page"
          aria-label={`Current page, page ${safePage}`}
        >
          {safePage}
        </span>

        <button
          type="button"
          aria-label="Go to next page"
          disabled={disabled || safePage >= safePages}
          onClick={() => onPageChange(safePage + 1)}
          className="flex h-9 items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 px-2.5 sm:px-3 text-xs font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer active:scale-95"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
