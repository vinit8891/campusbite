"use client";

import { useEffect, useRef, useState } from "react";
import { Package, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import {
  formatPaymentMethod,
  formatPaymentStatus,
} from "@/lib/paymentLabels";
import { AuthHttpError } from "@/services/authFetch";
import {
  getMyDeliveries,
  updateDeliveryOrderStatus,
  updateLiveLocation,
  verifyDeliveryOTP,
  type MyDeliveriesQuery,
} from "@/services/deliveryService";

type OrderItem = {
  id?: number | string;
  name?: string;
  price?: number;
  quantity?: number;
};

type DeliveryOrder = {
  _id: string;
  customer_name?: string;
  customer_email?: string;
  phone?: string;
  address?: string;
  payment_method?: string;
  payment_status?: string;
  total?: number;
  status?: string;
  items?: OrderItem[];
  restaurant_email?: string;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
  delivery_partner?: {
    accepted_at?: string;
    phone?: string;
    name?: string;
  };
};

const STATUS_OPTIONS = [
  "Assigned",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
] as const;

const selectClassName =
  "h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function formatAssignedTime(order: DeliveryOrder) {
  const value =
    order.delivery_partner?.accepted_at || order.created_at || "";
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function badgeColor(status?: string) {
  switch (status) {
    case "Assigned":
      return "bg-orange-100 text-orange-700";
    case "Picked Up":
      return "bg-blue-100 text-blue-700";
    case "Out for Delivery":
      return "bg-cyan-100 text-cyan-700";
    case "Delivered":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-2xl" />
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-40 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function DeliveryOrdersPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const [otpOrderId, setOtpOrderId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");

  const watchIdRef = useRef<number | null>(null);
  const ordersRef = useRef<DeliveryOrder[]>([]);
  const filtersRef = useRef({ q, status });

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    filtersRef.current = { q, status };
  }, [q, status]);

  function currentFilters(
    overrides: Partial<MyDeliveriesQuery> = {}
  ): MyDeliveriesQuery {
    const latest = filtersRef.current;
    return {
      q: (overrides.q ?? latest.q).trim() || undefined,
      status: (overrides.status ?? latest.status) || undefined,
      limit: 50,
    };
  }

  async function loadOrders(
    filters: MyDeliveriesQuery = currentFilters(),
    options: { showLoading?: boolean } = {}
  ) {
    if (options.showLoading) {
      setLoading(true);
    }

    try {
      const partner = getDeliveryPartnerSession();

      if (!partner?.phone) {
        setOrders([]);
        setError("Delivery partner phone not found. Please log in again.");
        return;
      }

      const data = await getMyDeliveries(partner.phone, filters);
      setOrders(data);
      setError("");
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) return;
      setError(err instanceof Error ? err.message : "Unable to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders(currentFilters(), { showLoading: true });

    const refresh = setInterval(() => {
      void loadOrders(currentFilters());
    }, 5000);

    return () => clearInterval(refresh);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    if (watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const activeOrders = ordersRef.current.filter((order) =>
          ["Assigned", "Picked Up", "Out for Delivery"].includes(
            order.status || ""
          )
        );

        for (const order of activeOrders) {
          try {
            await updateLiveLocation(
              order._id,
              position.coords.latitude,
              position.coords.longitude
            );
          } catch (err) {
            console.error(err);
          }
        }
      },
      (err) => {
        console.error("GPS Error:", err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  async function updateStatus(id: string, nextStatus: string) {
    try {
      await updateDeliveryOrderStatus(id, nextStatus);
      await loadOrders(currentFilters());
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) return;
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function verifyOTP() {
    if (!otpOrderId) return;

    try {
      setVerifying(true);
      setOtpError("");

      await verifyDeliveryOTP(otpOrderId, Number(otp));

      setOtp("");
      setOtpOrderId(null);

      await loadOrders(currentFilters());

      alert("✅ Delivery Completed Successfully");
    } catch (err: any) {
      setOtpError(err.message || "Invalid OTP");
    } finally {
      setVerifying(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void loadOrders(currentFilters(), { showLoading: true });
  }

  function renderActions(order: DeliveryOrder) {
    return (
      <div className="flex flex-wrap gap-3">
        <button
          disabled={order.status !== "Assigned"}
          onClick={() => updateStatus(order._id, "Picked Up")}
          className="rounded-lg bg-orange-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          📦 Picked Up
        </button>

        <button
          disabled={order.status !== "Picked Up"}
          onClick={() => updateStatus(order._id, "Out for Delivery")}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          🛵 Out for Delivery
        </button>

        <button
          disabled={order.status !== "Out for Delivery"}
          onClick={() => {
            setOtpOrderId(order._id);
            setOtp("");
            setOtpError("");
          }}
          className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          ✅ Delivered
        </button>

        {order.status === "Out for Delivery" && (
          <button
            onClick={() =>
              window.open(`/track-order/${order._id}`, "_blank")
            }
            className="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-700"
          >
            📍 Live Tracking
          </button>
        )}

        <button
          onClick={() => {
            if (order.latitude != null && order.longitude != null) {
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`,
                "_blank"
              );
            } else {
              window.open(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  order.address || ""
                )}`,
                "_blank"
              );
            }
          }}
          className="rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-800"
        >
          🗺 Navigate
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold">My Orders</h1>
          <p className="mt-2 text-gray-500">
            Track and complete your assigned deliveries.
          </p>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="grid gap-3 rounded-2xl border bg-white p-4 shadow md:grid-cols-[1fr_180px_auto_auto]"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search customer, email, or order ID"
              className="pl-9"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              void loadOrders(
                currentFilters({ status: e.target.value }),
                { showLoading: true }
              );
            }}
            className={selectClassName}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <Button type="submit" variant="outline">
            Search
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void loadOrders(currentFilters(), { showLoading: true })
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

        {loading ? (
          <OrdersSkeleton />
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white px-6 py-16 text-center shadow">
            <Package className="mx-auto mb-4 h-12 w-12 text-orange-500" />
            <h2 className="text-2xl font-semibold">No orders found</h2>
            <p className="mt-2 text-gray-500">
              Try clearing filters, or accept a new delivery from Available
              Orders.
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
                    <th className="px-4 py-3 font-medium">Address</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Payment Method</th>
                    <th className="px-4 py-3 font-medium">Payment Status</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Assigned Time</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
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
                      <td className="max-w-[14rem] px-4 py-4 text-gray-600">
                        {order.address || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${badgeColor(
                            order.status
                          )}`}
                        >
                          {order.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {formatPaymentMethod(order.payment_method)}
                      </td>
                      <td className="px-4 py-4">
                        {formatPaymentStatus(
                          order.payment_status,
                          order.payment_method
                        )}
                      </td>
                      <td className="px-4 py-4 font-semibold text-orange-600">
                        ₹{order.total ?? 0}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {formatAssignedTime(order)}
                      </td>
                      <td className="px-4 py-4">{renderActions(order)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 lg:hidden">
              {orders.map((order) => (
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
                        {order.customer_email || order.phone || "—"}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">
                        {order.address || "Address not available"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-orange-600">
                        ₹{order.total ?? 0}
                      </p>
                      <span
                        className={`mt-2 inline-block rounded px-3 py-1 text-xs font-medium ${badgeColor(
                          order.status
                        )}`}
                      >
                        {order.status || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-gray-600">
                    <p>
                      <span className="font-medium text-gray-800">
                        Payment:
                      </span>{" "}
                      {formatPaymentMethod(order.payment_method)}
                    </p>
                    <p>
                      <span className="font-medium text-gray-800">
                        Payment status:
                      </span>{" "}
                      {formatPaymentStatus(
                        order.payment_status,
                        order.payment_method
                      )}
                    </p>
                    <p>
                      <span className="font-medium text-gray-800">
                        Assigned:
                      </span>{" "}
                      {formatAssignedTime(order)}
                    </p>
                  </div>

                  {Array.isArray(order.items) && order.items.length > 0 ? (
                    <>
                      <hr className="my-4" />
                      <div className="space-y-2 text-sm">
                        {order.items.map((item, index) => (
                          <div
                            key={item.id || `${item.name}-${index}`}
                            className="flex justify-between gap-3"
                          >
                            <span>
                              {item.name || "Item"} × {item.quantity || 1}
                            </span>
                            <span>
                              ₹{(item.price || 0) * (item.quantity || 1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}

                  <div className="mt-5">{renderActions(order)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {otpOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-2xl font-bold">
              🔐 Verify Delivery OTP
            </h2>

            <p className="mb-4 text-gray-600">
              Ask the customer for the 4-digit OTP.
            </p>

            <input
              type="text"
              maxLength={4}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full rounded-lg border p-3 text-center text-2xl tracking-widest"
              placeholder="1234"
            />

            {otpError && (
              <p className="mt-3 text-red-600">{otpError}</p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setOtpOrderId(null);
                  setOtp("");
                  setOtpError("");
                }}
                className="flex-1 rounded-lg border py-3"
              >
                Cancel
              </button>

              <button
                onClick={verifyOTP}
                disabled={verifying || otp.length !== 4}
                className="flex-1 rounded-lg bg-green-600 py-3 text-white disabled:opacity-50"
              >
                {verifying ? "Verifying..." : "Verify OTP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
