"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import {
  formatPaymentMethod,
  formatPaymentStatus,
  isOnlinePayment,
} from "@/lib/paymentLabels";
import { AuthHttpError, authJson } from "@/services/authFetch";

type OrderItem = {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  _id: string;
  customer_name: string;
  customer_email?: string;
  phone: string;
  address: string;
  payment_method: string;
  payment_status?: string;
  total: number;
  status: string;
  items: OrderItem[];
  created_at?: string;
};

type OrdersQuery = {
  status?: string;
  payment_status?: string;
  payment_method?: string;
  q?: string;
  limit?: number;
};

const ORDER_STATUSES = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready for Pickup",
  "Assigned",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
] as const;

const PAYMENT_STATUSES = [
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
] as const;

const PAYMENT_METHODS = [
  { value: "cod", label: "COD" },
  { value: "online", label: "Online" },
] as const;

const selectClassName =
  "h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatCreatedAt(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-48 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const filtersRef = useRef({
    q,
    status,
    paymentStatus,
    paymentMethod,
  });

  useEffect(() => {
    filtersRef.current = { q, status, paymentStatus, paymentMethod };
  }, [q, status, paymentStatus, paymentMethod]);

  function buildPath(filters: OrdersQuery) {
    const email = getRestaurantOwnerEmail();
    if (!email) return null;

    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.payment_status) {
      params.set("payment_status", filters.payment_status);
    }
    if (filters.payment_method) {
      params.set("payment_method", filters.payment_method);
    }
    if (filters.q?.trim()) params.set("q", filters.q.trim());
    params.set("limit", String(filters.limit ?? 50));

    const query = params.toString();
    return `/orders/restaurant/${encodeURIComponent(email)}?${query}`;
  }

  function currentFilters(overrides: Partial<OrdersQuery> = {}): OrdersQuery {
    const latest = filtersRef.current;
    return {
      q: (overrides.q ?? latest.q).trim() || undefined,
      status: (overrides.status ?? latest.status) || undefined,
      payment_status:
        (overrides.payment_status ?? latest.paymentStatus) || undefined,
      payment_method:
        (overrides.payment_method ?? latest.paymentMethod) || undefined,
      limit: 50,
    };
  }

  async function fetchOrders(
    filters: OrdersQuery = currentFilters(),
    options: { showLoading?: boolean } = {}
  ) {
    if (options.showLoading) {
      setLoading(true);
    }

    try {
      const path = buildPath(filters);

      if (!path) {
        setError("Restaurant owner email not found. Please log in again.");
        router.replace("/restaurant/login");
        return;
      }

      const data = await authJson<Order[]>(path, {
        role: "restaurant_owner",
        cache: "no-store",
      });

      setOrders(data);
      setError("");
    } catch (err) {
      console.error("Restaurant Orders Error:", err);
      if (err instanceof AuthHttpError && err.status === 401) {
        return;
      }
      setError(
        err instanceof Error ? err.message : "Unable to load orders"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const path = buildPath({ limit: 50 });
        if (!path) {
          setError("Restaurant owner email not found. Please log in again.");
          router.replace("/restaurant/login");
          return;
        }

        const data = await authJson<Order[]>(path, {
          role: "restaurant_owner",
          cache: "no-store",
        });

        if (cancelled) return;
        setOrders(data);
        setError("");
      } catch (err) {
        if (cancelled) return;
        console.error("Restaurant Orders Error:", err);
        if (err instanceof AuthHttpError && err.status === 401) {
          return;
        }
        setError(
          err instanceof Error ? err.message : "Unable to load orders"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialLoad();

    const interval = setInterval(() => {
      void fetchOrders(currentFilters());
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);

  async function updateStatus(id: string, nextStatus: string) {
    try {
      await authJson(`/orders/${id}/${encodeURIComponent(nextStatus)}`, {
        role: "restaurant_owner",
        method: "PUT",
      });

      await fetchOrders(currentFilters());
    } catch (error) {
      console.error("Update Status Error:", error);
      if (error instanceof AuthHttpError && error.status === 401) {
        return;
      }
      alert(
        error instanceof Error ? error.message : "Failed to update status"
      );
    }
  }

  function badgeColor(orderStatus: string) {
    switch (orderStatus) {
      case "Accepted":
        return "bg-blue-100 text-blue-700";
      case "Preparing":
        return "bg-yellow-100 text-yellow-700";
      case "Ready for Pickup":
        return "bg-indigo-100 text-indigo-700";
      case "Out for Delivery":
        return "bg-purple-100 text-purple-700";
      case "Delivered":
        return "bg-green-100 text-green-700";
      case "Rejected":
      case "Cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void fetchOrders(currentFilters(), { showLoading: true });
  }

  function renderActions(order: Order) {
    return (
      <div className="flex flex-wrap gap-3">
        {isOnlinePayment(order.payment_method) &&
        order.payment_status !== "paid" ? (
          <p className="w-full text-sm font-medium text-amber-700">
            Waiting for online payment before kitchen processing.
          </p>
        ) : null}

        <button
          disabled={
            order.status !== "Pending" ||
            (isOnlinePayment(order.payment_method) &&
              order.payment_status !== "paid")
          }
          onClick={() => updateStatus(order._id, "Accepted")}
          className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-40"
        >
          ✅ Accept
        </button>

        <button
          disabled={
            order.status !== "Accepted" ||
            (isOnlinePayment(order.payment_method) &&
              order.payment_status !== "paid")
          }
          onClick={() => updateStatus(order._id, "Preparing")}
          className="rounded-lg bg-yellow-500 px-4 py-2 text-white disabled:opacity-40"
        >
          🍳 Preparing
        </button>

        <button
          disabled={
            order.status !== "Preparing" ||
            (isOnlinePayment(order.payment_method) &&
              order.payment_status !== "paid")
          }
          onClick={() => updateStatus(order._id, "Ready for Pickup")}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-40"
        >
          📦 Ready for Pickup
        </button>

        <button
          disabled={
            order.status === "Delivered" || order.status === "Cancelled"
          }
          onClick={() => updateStatus(order._id, "Cancelled")}
          className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-40"
        >
          ❌ Reject
        </button>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Restaurant Orders</h1>
        <p className="mt-2 text-gray-500">
          Search, filter, and manage incoming orders
        </p>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2 xl:grid-cols-5"
      >
        <div className="relative xl:col-span-2">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer, email, or order ID…"
            className="h-10 pl-9"
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            const next = e.target.value;
            setStatus(next);
            void fetchOrders(currentFilters({ status: next }), {
              showLoading: true,
            });
          }}
          className={selectClassName}
          aria-label="Order status"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <select
          value={paymentStatus}
          onChange={(e) => {
            const next = e.target.value;
            setPaymentStatus(next);
            void fetchOrders(currentFilters({ payment_status: next }), {
              showLoading: true,
            });
          }}
          className={selectClassName}
          aria-label="Payment status"
        >
          <option value="">All payment statuses</option>
          {PAYMENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={paymentMethod}
            onChange={(e) => {
              const next = e.target.value;
              setPaymentMethod(next);
              void fetchOrders(currentFilters({ payment_method: next }), {
                showLoading: true,
              });
            }}
            className={selectClassName}
            aria-label="Payment method"
          >
            <option value="">All methods</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>

          <Button
            type="submit"
            variant="outline"
            className="h-10 shrink-0 gap-2"
            disabled={loading}
            aria-label="Refresh orders"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </Button>
        </div>
      </form>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <OrdersSkeleton />
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white px-6 py-16 text-center shadow-sm">
          <h2 className="text-2xl font-bold">No orders found</h2>
          <p className="mt-3 text-gray-500">
            Try clearing filters, or wait for new customer orders.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border bg-white lg:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order ID</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Items</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Payment Method</th>
                  <th className="px-4 py-3 font-semibold">Payment Status</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Created At</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} className="border-t align-top">
                    <td
                      className="px-4 py-3 font-mono text-xs"
                      title={order._id}
                    >
                      {shortId(order._id)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {order.customer_name || "—"}
                      </div>
                      <div className="text-xs text-gray-500">{order.phone}</div>
                      {order.customer_email && (
                        <div className="text-xs text-gray-500">
                          {order.customer_email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {order.items.map((item) => (
                          <div key={`${order._id}-${item.id}`}>
                            {item.name} × {item.quantity}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${badgeColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {formatPaymentMethod(order.payment_method)}
                    </td>
                    <td className="px-4 py-3">
                      {formatPaymentStatus(
                        order.payment_status,
                        order.payment_method
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-orange-600">
                      ₹{Number(order.total ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {formatCreatedAt(order.created_at)}
                    </td>
                    <td className="min-w-[220px] px-4 py-3">
                      {renderActions(order)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-6 lg:hidden">
            {orders.map((order) => (
              <div
                key={order._id}
                className="rounded-2xl border bg-white p-6 shadow"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p
                      className="font-mono text-xs text-gray-500"
                      title={order._id}
                    >
                      {shortId(order._id)}
                    </p>
                    <h2 className="text-xl font-bold">
                      {order.customer_name}
                    </h2>
                    <p>{order.phone}</p>
                    {order.customer_email && (
                      <p className="text-sm text-gray-500">
                        {order.customer_email}
                      </p>
                    )}
                    <p className="text-gray-500">{order.address}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatCreatedAt(order.created_at)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">
                      ₹{Number(order.total ?? 0).toFixed(2)}
                    </p>
                    <p className="font-semibold">
                      {formatPaymentMethod(order.payment_method)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatPaymentStatus(
                        order.payment_status,
                        order.payment_method
                      )}
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-4 py-2 text-sm font-semibold ${badgeColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                <hr className="my-6" />

                <h3 className="mb-3 text-lg font-bold">Ordered Items</h3>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={`${order._id}-${item.id}`}
                      className="flex justify-between border-b pb-2"
                    >
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6">{renderActions(order)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
