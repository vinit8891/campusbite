"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";

import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAdminDate } from "@/lib/adminFormat";
import {
  formatPaymentMethod,
  formatPaymentStatus,
} from "@/lib/paymentLabels";
import {
  AuthHttpError,
  getAdminOrders,
  type AdminOrder,
  type AdminOrdersQuery,
} from "@/services/adminService";

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

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  async function fetchOrders(filters: AdminOrdersQuery) {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminOrders({
        ...filters,
        limit: filters.limit ?? 50,
      });
      setOrders(data);
    } catch (err) {
      if (err instanceof AuthHttpError && err.status === 401) {
        return;
      }
      setError(
        err instanceof Error ? err.message : "Unable to load orders"
      );
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  function currentFilters(overrides: Partial<AdminOrdersQuery> = {}) {
    return {
      q: (overrides.q ?? q).trim() || undefined,
      status: (overrides.status ?? status) || undefined,
      payment_status:
        (overrides.payment_status ?? paymentStatus) || undefined,
      payment_method:
        (overrides.payment_method ?? paymentMethod) || undefined,
      limit: 50,
    };
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await getAdminOrders({ limit: 50 });
        if (cancelled) return;
        setOrders(data);
        setError("");
      } catch (err) {
        if (cancelled) return;
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

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void fetchOrders(currentFilters());
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      <AdminPageHeader
        title="Orders"
        description="Read-only view of platform orders"
      />

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
            placeholder="Search name, email, order ID, restaurant…"
            className="h-10 pl-9"
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            const next = e.target.value;
            setStatus(next);
            void fetchOrders(currentFilters({ status: next }));
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
            void fetchOrders(currentFilters({ payment_status: next }));
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
              void fetchOrders(currentFilters({ payment_method: next }));
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
        <AdminTableSkeleton rows={6} columns={8} />
      ) : orders.length === 0 ? (
        <AdminEmptyState
          title="No orders found"
          description="Try clearing filters or searching with a different term."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Order ID</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Restaurant</th>
                <th className="px-4 py-3 font-semibold">Order Status</th>
                <th className="px-4 py-3 font-semibold">Payment Method</th>
                <th className="px-4 py-3 font-semibold">Payment Status</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Created At</th>
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
                    {order.customer_email && (
                      <div className="text-xs text-gray-500">
                        {order.customer_email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {order.restaurant_name ||
                      order.restaurant_email ||
                      "—"}
                  </td>
                  <td className="px-4 py-3">{order.status || "—"}</td>
                  <td className="px-4 py-3">
                    {formatPaymentMethod(order.payment_method)}
                  </td>
                  <td className="px-4 py-3">
                    {formatPaymentStatus(
                      order.payment_status,
                      order.payment_method
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    ₹{Number(order.total ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {formatAdminDate(order.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
