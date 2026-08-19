"use client";

import { useCallback, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { getMyOrders } from "@/services/orderService";
import { AuthHttpError } from "@/services/authFetch";
import { usePolling } from "@/hooks/usePolling";
import { useOrderFiltering, useOrderOtp } from "@/hooks/orders";
import type { Order } from "@/types/orders";

import {
  OrderCard,
  OrderFilterBar,
  OrdersHeader,
} from "@/components/orders";
import { EmptyState } from "@/components/common";
import { FILTER_BUTTONS } from "@/hooks/orders/useOrderFiltering";

export default function OrdersPage() {
  const { isLoggedIn } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filteredOrders,
    activeOrdersCount,
    filterCounts,
    hasActiveOrders,
    resetFilters,
  } = useOrderFiltering(orders);

  const { orderOtps, syncOrderOtps } = useOrderOtp();

  const fetchOrders = useCallback(async () => {
    try {
      if (!isLoggedIn && !localStorage.getItem("token")) {
        setError("Please log in to view your orders.");
        setOrders([]);
        setLoading(false);
        return;
      }

      const result = await getMyOrders();

      setOrders(result);
      setError("");

      syncOrderOtps(result);
    } catch (err) {
      console.error(err);

      if (err instanceof AuthHttpError && err.status === 401) {
        return;
      }

      setError(
        err instanceof Error ? err.message : "Unable to load your orders."
      );
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, syncOrderOtps]);

  const initialLoadRef = useRef(false);

  const pollOrders = useCallback(async () => {
    if (!initialLoadRef.current || hasActiveOrders) {
      initialLoadRef.current = true;
      await fetchOrders();
    }
  }, [fetchOrders, hasActiveOrders]);

  /**
   * Managed via shared usePolling infrastructure (5s interval, in-flight guard, auto-unmount cleanup).
   */
  usePolling(pollOrders, 5000, {
    enabled: true,
    runImmediately: true,
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="animate-pulse rounded-3xl bg-gradient-to-br from-orange-400 to-orange-500 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 shrink-0 rounded-2xl bg-white/30" />

                <div>
                  <div className="h-4 w-28 rounded bg-white/30" />
                  <div className="mt-2 h-8 w-44 rounded bg-white/30" />
                  <div className="mt-2 h-4 w-64 max-w-full rounded bg-white/20" />
                </div>
              </div>

              <div className="flex gap-2">
                <div className="h-9 w-24 rounded-full bg-white/20" />
                <div className="h-9 w-20 rounded-full bg-white/20" />
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="h-11 animate-pulse rounded-xl bg-gray-100" />

            <div className="mt-3 flex gap-2 overflow-hidden">
              {FILTER_BUTTONS.map((item) => (
                <div
                  key={item}
                  className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-gray-100"
                />
              ))}
            </div>
          </section>

          <div className="mt-4 space-y-4">
            {[1, 2, 3].map((item) => (
              <article
                key={item}
                className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gray-200" />

                  <div className="flex-1">
                    <div className="h-5 w-44 rounded bg-gray-200" />
                    <div className="mt-2 h-3 w-32 rounded bg-gray-100" />
                    <div className="mt-2 h-3 w-40 rounded bg-gray-100" />
                  </div>

                  <div className="h-7 w-24 rounded-full bg-gray-200" />
                </div>

                <div className="mt-4 h-20 rounded-xl bg-gray-100" />

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="h-20 rounded-xl bg-gray-100" />
                  <div className="h-20 rounded-xl bg-gray-100" />
                  <div className="h-20 rounded-xl bg-gray-100" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-5xl rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <div className="text-5xl">😕</div>

          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Unable to load orders
          </h1>

          <p className="mt-3 text-red-600">{error}</p>

          <button
            type="button"
            onClick={() => void fetchOrders()}
            className="mt-6 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (orders.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <OrdersHeader
            totalOrders={0}
            activeOrdersCount={0}
          />

          <EmptyState
            icon="📦"
            title="No Orders Yet"
            description="You haven't placed any orders yet. Start exploring restaurants and order your favourite food."
            actionHref="/restaurants"
            actionLabel="Browse Restaurants"
            className="mt-4"
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <OrdersHeader
          totalOrders={orders.length}
          activeOrdersCount={activeOrdersCount}
        />

        <OrderFilterBar
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          sort={sort}
          onSortChange={setSort}
          filterCounts={filterCounts}
          className="mt-4"
        />

        {/* Result Count */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">
            Showing{" "}
            <span className="font-bold text-gray-900">
              {filteredOrders.length}
            </span>{" "}
            {search.trim() || filter !== "All"
              ? "matching"
              : "of"}{" "}
            {search.trim() || filter !== "All"
              ? "orders"
              : `${orders.length} ${
                  orders.length === 1 ? "order" : "orders"
                }`}
          </p>
        </div>

        {filteredOrders.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No matching orders"
            description="Try searching by restaurant, food item or order ID."
            onAction={resetFilters}
            actionLabel="Clear Filters"
            className="mt-4"
          />
        ) : (
          <div className="mt-4 space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                orderOtp={orderOtps[order._id]}
                onRefreshOrders={fetchOrders}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}