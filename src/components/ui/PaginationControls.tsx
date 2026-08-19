"use client";

import { Button } from "@/components/ui/button";

type Props = {
  page: number;
  pages: number;
  total?: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

export default function PaginationControls({
  page,
  pages,
  total,
  disabled = false,
  onPageChange,
}: Props) {
  const safePages = Math.max(1, pages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safePages);

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3"
      aria-label="Pagination"
    >
      <p className="text-sm text-gray-500" aria-live="polite">
        Page {safePage} of {safePages}
        {typeof total === "number" ? ` · ${total} total` : ""}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          aria-label="Go to previous page"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Previous
        </Button>
        <span
          className="min-w-10 text-center text-sm font-medium"
          aria-current="page"
          aria-label={`Current page, page ${safePage}`}
        >
          {safePage}
        </span>
        <Button
          type="button"
          variant="outline"
          aria-label="Go to next page"
          disabled={disabled || safePage >= safePages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
