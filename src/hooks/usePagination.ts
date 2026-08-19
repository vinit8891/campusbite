import { useCallback, useMemo, useState } from "react";

export type UsePaginationOptions = {
  /** Initial active page (1-indexed). Defaults to 1. */
  initialPage?: number;
  /** Initial items per page. Defaults to 20. */
  initialLimit?: number;
  /** Total count of items, if known upfront. */
  totalItems?: number;
};

export type UsePaginationReturn = {
  /** Current active page number (1-indexed). */
  page: number;
  /** Current items per page limit. */
  limit: number;
  /** Total items count across all pages. */
  totalItems: number;
  /** Calculated total number of pages. */
  totalPages: number;
  /** Whether a next page exists. */
  hasNextPage: boolean;
  /** Whether a previous page exists. */
  hasPrevPage: boolean;
  /** Zero-indexed offset for database queries ((page - 1) * limit). */
  offset: number;
  /** Object containing { page, limit } for easy API query spreading. */
  queryParams: { page: number; limit: number };
  /** Set the active page directly (clamped between 1 and totalPages). */
  setPage: (newPage: number) => void;
  /** Set the items per page limit. */
  setLimit: (newLimit: number) => void;
  /** Update the total items count (automatically recalculates totalPages). */
  setTotalItems: (total: number) => void;
  /** Advance to the next page if available. */
  nextPage: () => void;
  /** Return to the previous page if available. */
  prevPage: () => void;
  /** Reset page back to 1. */
  resetPage: () => void;
};

/**
 * State and navigation management hook for paginated lists and tables.
 */
export function usePagination(
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const {
    initialPage = 1,
    initialLimit = 20,
    totalItems: initialTotalItems = 0,
  } = options;

  const [page, setPageState] = useState(Math.max(1, initialPage));
  const [limit, setLimitState] = useState(Math.max(1, initialLimit));
  const [totalItems, setTotalItemsState] = useState(
    Math.max(0, initialTotalItems)
  );

  const totalPages = useMemo(() => {
    if (totalItems <= 0) return 1;
    return Math.max(1, Math.ceil(totalItems / limit));
  }, [totalItems, limit]);

  const setPage = useCallback(
    (newPage: number) => {
      setPageState(() => {
        const clamped = Math.max(1, Math.min(newPage, totalPages || 1));
        return clamped;
      });
    },
    [totalPages]
  );

  const setLimit = useCallback((newLimit: number) => {
    const validLimit = Math.max(1, newLimit);
    setLimitState(validLimit);
    setPageState(1);
  }, []);

  const setTotalItems = useCallback((total: number) => {
    const validTotal = Math.max(0, total);
    setTotalItemsState(validTotal);
  }, []);

  const nextPage = useCallback(() => {
    setPageState((current) => {
      if (current < totalPages) {
        return current + 1;
      }
      return current;
    });
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPageState((current) => {
      if (current > 1) {
        return current - 1;
      }
      return current;
    });
  }, []);

  const resetPage = useCallback(() => {
    setPageState(1);
  }, []);

  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const offset = (page - 1) * limit;

  const queryParams = useMemo(
    () => ({
      page,
      limit,
    }),
    [page, limit]
  );

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage,
    hasPrevPage,
    offset,
    queryParams,
    setPage,
    setLimit,
    setTotalItems,
    nextPage,
    prevPage,
    resetPage,
  };
}
