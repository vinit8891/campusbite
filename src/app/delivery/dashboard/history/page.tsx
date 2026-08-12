"use client";

import { useEffect, useRef, useState } from "react";
import { Package, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import PaginationControls from "@/components/ui/PaginationControls";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import { formatPaymentMethod } from "@/lib/paymentLabels";
import { AuthHttpError } from "@/services/authFetch";
import {
  getDeliveryHistory,
  type DeliveryHistoryQuery,
} from "@/services/deliveryService";
import {
  getDeliveryStats,
  type DeliveryDashboardStats,
} from "@/services/deliveryPartnerService";

type HistoryOrder = {
  _id: string;
  customer_name?: string;
  customer_email?: string;
  phone?: string;
  address?: string;
  restaurant_email?: string;
  total?: number;
  status?: string;
  payment_method?: string;
  delivered_at?: string;
  created_at?: string;
  delivery_earnings?: number | null;
  delivery_earning?: number | null;
  partner_earnings?: number | null;
};

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function formatDeliveredTime(order: HistoryOrder) {
  const value = order.delivered_at || order.created_at || "";
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function storedEarnings(order: HistoryOrder): number | null {
  const value =
    order.delivery_earnings ??
    order.delivery_earning ??
    order.partner_earnings;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function HistorySkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-36 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function DeliveryHistoryPage() {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [stats, setStats] = useState<DeliveryDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtersRef = useRef({ q, fromDate, toDate, page });

  useEffect(() => {
    filtersRef.current = { q, fromDate, toDate, page };
  }, [q, fromDate, toDate, page]);

  function currentFilters(
    overrides: Partial<DeliveryHistoryQuery & { fromDate?: string; toDate?: string; page?: number }> = {}
  ): DeliveryHistoryQuery {
    const latest = filtersRef.current;
    return {
      q: (overrides.q ?? latest.q).trim() || undefined,
      from_date: (overrides.from_date ?? overrides.fromDate ?? latest.fromDate) || undefined,
      to_date: (overrides.to_date ?? overrides.toDate ?? latest.toDate) || undefined,
      page: overrides.page ?? latest.page,
      limit: 20,
    };
  }

  async function loadPage(
    filters: DeliveryHistoryQuery = currentFilters(),
    options: { showLoading?: boolean } = {}
  ) {
    if (options.showLoading) {
      setLoading(true);
    }

    try {
      const partner = getDeliveryPartnerSession();
      const phone = partner?.phone;

      const historyPromise = getDeliveryHistory(filters);
      const statsPromise = phone
        ? getDeliveryStats(phone)
        : Promise.resolve(null);

      const [history, nextStats] = await Promise.all([
        historyPromise,
        statsPromise,
      ]);

      setOrders(history.items);
      setPage(history.page);
      setPages(history.pages);
      setTotal(history.total);
      if (nextStats) {
        setStats(nextStats);
      }
      setError("");
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) return;
      setError(
        err instanceof Error ? err.message : "Unable to load delivery history"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage(currentFilters({ page: 1 }), { showLoading: true });
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    void loadPage(currentFilters({ page: 1 }), { showLoading: true });
  }

  const totalDeliveries = stats?.total_deliveries ?? stats?.completed ?? 0;
  const weekDeliveries = stats?.deliveries_this_week ?? 0;
  const monthDeliveries = stats?.deliveries_this_month ?? 0;
  const showEarningsColumn = orders.some(
    (order) => storedEarnings(order) !== null
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Delivery History</h1>
        <p className="mt-2 text-gray-500">
          Review your completed deliveries.
        </p>
      </div>

      {loading ? (
        <HistorySkeleton />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm text-gray-500">Total Deliveries</p>
              <p className="mt-2 text-4xl font-bold text-slate-800">
                {totalDeliveries}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm text-gray-500">Deliveries This Week</p>
              <p className="mt-2 text-4xl font-bold text-orange-600">
                {weekDeliveries}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-sm text-gray-500">Deliveries This Month</p>
              <p className="mt-2 text-4xl font-bold text-emerald-700">
                {monthDeliveries}
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-3 rounded-2xl border bg-white p-4 shadow md:grid-cols-[1fr_140px_140px_auto_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search customer, restaurant, or order ID"
                className="pl-9"
              />
            </div>

            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label="From date"
            />

            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="To date"
            />

            <Button type="submit" variant="outline">
              Search
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void loadPage(currentFilters(), { showLoading: true })
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </form>

          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white px-6 py-16 text-center shadow">
              <Package className="mx-auto mb-4 h-12 w-12 text-orange-500" />
              <h2 className="text-2xl font-semibold">No deliveries found</h2>
              <p className="mt-2 text-gray-500">
                Try adjusting search or date filters.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-2xl border bg-white shadow lg:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b bg-orange-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Order ID</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Restaurant</th>
                      <th className="px-4 py-3 font-medium">
                        Delivery Address
                      </th>
                      <th className="px-4 py-3 font-medium">Delivered Time</th>
                      <th className="px-4 py-3 font-medium">Payment Method</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                      {showEarningsColumn ? (
                        <th className="px-4 py-3 font-medium">
                          Delivery Earnings
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const earnings = storedEarnings(order);
                      return (
                        <tr key={order._id} className="border-b align-top">
                          <td className="px-4 py-4 font-mono text-xs">
                            {shortId(order._id)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium">
                              {order.customer_name || "—"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {order.customer_email || order.phone || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {order.restaurant_email || "—"}
                          </td>
                          <td className="max-w-[14rem] px-4 py-4 text-gray-600">
                            {order.address || "—"}
                          </td>
                          <td className="px-4 py-4 text-gray-600">
                            {formatDeliveredTime(order)}
                          </td>
                          <td className="px-4 py-4">
                            {formatPaymentMethod(order.payment_method)}
                          </td>
                          <td className="px-4 py-4 font-semibold text-orange-600">
                            ₹{order.total ?? 0}
                          </td>
                          {showEarningsColumn ? (
                            <td className="px-4 py-4 text-emerald-700">
                              {earnings !== null ? `₹${earnings}` : "—"}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 lg:hidden">
                {orders.map((order) => {
                  const earnings = storedEarnings(order);
                  return (
                    <div
                      key={order._id}
                      className="rounded-2xl border bg-white p-6 shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-mono text-xs text-gray-500">
                            {shortId(order._id)}
                          </p>
                          <h2 className="mt-1 text-xl font-bold">
                            {order.customer_name || "Customer"}
                          </h2>
                          <p className="text-sm text-gray-500">
                            {order.restaurant_email || "Restaurant"}
                          </p>
                          <p className="mt-2 text-sm text-gray-600">
                            {order.address || "Address not available"}
                          </p>
                        </div>
                        <p className="text-xl font-bold text-orange-600">
                          ₹{order.total ?? 0}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-gray-600">
                        <p>
                          <span className="font-medium text-gray-800">
                            Delivered:
                          </span>{" "}
                          {formatDeliveredTime(order)}
                        </p>
                        <p>
                          <span className="font-medium text-gray-800">
                            Payment:
                          </span>{" "}
                          {formatPaymentMethod(order.payment_method)}
                        </p>
                        {earnings !== null ? (
                          <p>
                            <span className="font-medium text-gray-800">
                              Delivery earnings:
                            </span>{" "}
                            ₹{earnings}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <PaginationControls
            page={page}
            pages={pages}
            total={total}
            disabled={loading}
            onPageChange={(next) => {
              setPage(next);
              void loadPage(currentFilters({ page: next }), {
                showLoading: true,
              });
            }}
          />
        </>
      )}
    </div>
  );
}
