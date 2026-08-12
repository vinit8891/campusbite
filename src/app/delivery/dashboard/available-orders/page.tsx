"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapPin,
  Phone,
  User,
  Clock3,
  Bike,
  IndianRupee,
  Navigation,
  RefreshCw,
  Search,
} from "lucide-react";

import PaginationControls from "@/components/ui/PaginationControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import {
  formatPaymentMethod,
  formatPaymentStatus,
} from "@/lib/paymentLabels";
import {
  getAvailableOrders,
  acceptDelivery,
  type AvailableOrdersQuery,
} from "@/services/deliveryService";
import { AuthHttpError } from "@/services/authFetch";

type AvailableOrder = {
  _id: string;
  restaurant_email?: string;
  customer_name?: string;
  phone?: string;
  address?: string;
  total?: number;
  payment_method?: string;
  payment_status?: string;
  distance?: string | number | null;
  created_at?: string;
  latitude?: number | null;
  longitude?: number | null;
  items?: Array<{
    id?: string | number;
    name?: string;
    quantity?: number;
    price?: number;
  }>;
};

const selectClassName =
  "h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function formatCreatedAt(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-2xl" />
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-56 w-full rounded-3xl" />
      ))}
    </div>
  );
}

export default function AvailableOrdersPage() {
  const [orders, setOrders] = useState<AvailableOrder[]>([]);
  const [restaurantOptions, setRestaurantOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const filtersRef = useRef({ q, restaurant, paymentMethod, page });

  useEffect(() => {
    filtersRef.current = { q, restaurant, paymentMethod, page };
  }, [q, restaurant, paymentMethod, page]);

  function currentFilters(
    overrides: Partial<AvailableOrdersQuery> = {}
  ): AvailableOrdersQuery {
    const latest = filtersRef.current;
    return {
      q: (overrides.q ?? latest.q).trim() || undefined,
      restaurant:
        (overrides.restaurant ?? latest.restaurant).trim() || undefined,
      payment_method:
        (overrides.payment_method ?? latest.paymentMethod) || undefined,
      page: overrides.page ?? latest.page,
      limit: 20,
    };
  }

  async function loadOrders(
    filters: AvailableOrdersQuery = currentFilters(),
    options: { showLoading?: boolean } = {}
  ) {
    if (options.showLoading) {
      setLoading(true);
    }

    try {
      const data = await getAvailableOrders(filters);
      setOrders(data.items);
      setPage(data.page);
      setPages(data.pages);
      setTotal(data.total);
      setRestaurantOptions((prev) => {
        const next = new Set(prev);
        for (const order of data.items) {
          if (order.restaurant_email) next.add(order.restaurant_email);
        }
        return Array.from(next).sort();
      });
      setError("");
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) return;
      setError(
        err instanceof Error ? err.message : "Unable to load available orders"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders(currentFilters(), { showLoading: true });
  }, []);

  async function handleAccept(orderId: string) {
    try {
      const partner = getDeliveryPartnerSession();

      if (!partner) {
        alert("Please log in as a delivery partner.");
        window.location.assign("/delivery/login");
        return;
      }

      setAcceptingId(orderId);

      await acceptDelivery(orderId, {
        name: partner.name,
        phone: partner.phone,
        vehicle: partner.vehicle || "Bike",
      });

      await loadOrders(currentFilters());
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) return;
      alert(
        err instanceof Error ? err.message : "Failed to accept order"
      );
    } finally {
      setAcceptingId(null);
    }
  }

  function openNavigation(order: AvailableOrder) {
    if (order.latitude == null || order.longitude == null) {
      alert("Customer location not available.");
      return;
    }

    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`,
      "_blank"
    );
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    void loadOrders(currentFilters({ page: 1 }), { showLoading: true });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Available Orders</h1>
        <p className="mt-2 text-gray-500">
          Accept a delivery and start earning.
        </p>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow md:grid-cols-[1fr_180px_160px_auto_auto]"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer, restaurant, address, or order ID"
            className="pl-9"
          />
        </div>

        <select
          value={restaurant}
          onChange={(e) => {
            setRestaurant(e.target.value);
            setPage(1);
            void loadOrders(
              currentFilters({ restaurant: e.target.value, page: 1 }),
              { showLoading: true }
            );
          }}
          className={selectClassName}
        >
          <option value="">All restaurants</option>
          {restaurantOptions.map((email) => (
            <option key={email} value={email}>
              {email}
            </option>
          ))}
        </select>

        <select
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            setPage(1);
            void loadOrders(
              currentFilters({ payment_method: e.target.value, page: 1 }),
              { showLoading: true }
            );
          }}
          className={selectClassName}
        >
          <option value="">All payments</option>
          <option value="cod">COD</option>
          <option value="online">Online</option>
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
        <div className="rounded-3xl border border-dashed bg-white p-16 text-center shadow">
          <Bike className="mx-auto mb-5 h-16 w-16 text-orange-500" />
          <h2 className="text-3xl font-bold">No Orders Available</h2>
          <p className="mt-3 text-gray-500">
            Try clearing filters, or wait for new delivery requests.
          </p>
        </div>
      ) : (
        <div className="grid gap-8">
          {orders.map((order) => (
            <div
              key={order._id}
              className="rounded-3xl border bg-white p-7 shadow transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-gray-500">
                    Order ID: {shortId(order._id)}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">
                    {order.restaurant_email || "Restaurant"}
                  </h2>

                  <div className="mt-3 space-y-2 text-gray-600">
                    <p className="flex items-center gap-2">
                      <User size={18} />
                      {order.customer_name || "Customer"}
                    </p>

                    <p className="flex items-center gap-2">
                      <Phone size={18} />
                      {order.phone || "—"}
                    </p>

                    <p className="flex items-center gap-2">
                      <MapPin size={18} />
                      {order.address || "Address not available"}
                    </p>

                    <p className="flex items-center gap-2">
                      <Clock3 size={18} />
                      {formatCreatedAt(order.created_at)}
                    </p>

                    {order.distance != null && order.distance !== "" ? (
                      <p className="text-sm text-gray-500">
                        Distance: {order.distance}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="text-right">
                  <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
                    {formatPaymentMethod(order.payment_method)}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {formatPaymentStatus(
                      order.payment_status,
                      order.payment_method
                    )}
                  </p>

                  <div className="mt-5 flex items-center justify-end text-4xl font-bold text-orange-600">
                    <IndianRupee size={30} />
                    {order.total ?? 0}
                  </div>
                </div>
              </div>

              {Array.isArray(order.items) && order.items.length > 0 ? (
                <div className="mt-8 rounded-2xl bg-gray-50 p-5">
                  <h3 className="mb-4 text-lg font-bold">Ordered Items</h3>
                  <div className="space-y-3">
                    {order.items.map((item, index) => (
                      <div
                        key={item.id || `${item.name}-${index}`}
                        className="flex justify-between"
                      >
                        <span>
                          {item.name || "Item"} × {item.quantity || 1}
                        </span>
                        <span className="font-semibold">
                          ₹{(item.price || 0) * (item.quantity || 1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-5">
                <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
                  Ready for Pickup
                </span>

                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => openNavigation(order)}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-lg font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Navigation size={20} />
                    Navigate
                  </button>

                  <button
                    onClick={() => handleAccept(order._id)}
                    disabled={acceptingId === order._id}
                    className="rounded-xl bg-green-600 px-8 py-3 text-lg font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                  >
                    {acceptingId === order._id
                      ? "Accepting..."
                      : "🚴 Accept Delivery"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PaginationControls
        page={page}
        pages={pages}
        total={total}
        disabled={loading}
        onPageChange={(next) => {
          setPage(next);
          void loadOrders(currentFilters({ page: next }), {
            showLoading: true,
          });
        }}
      />
    </div>
  );
}
