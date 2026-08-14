"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";

import { useAuth } from "@/context/AuthContext";
import { getMyOrders } from "@/services/orderService";
import { getOrderOTP } from "@/services/deliveryService";
import { AuthHttpError } from "@/services/authFetch";

import OrderNotification from "@/components/notifications/OrderNotification";
import LiveDeliveryNotification from "@/components/notifications/LiveDeliveryNotification";
import OrderTimeline from "@/components/orders/OrderTimeline";
import ReviewModal from "@/components/reviews/ReviewModal";

import {
  formatPaymentMethod,
  formatPaymentStatus,
} from "@/lib/paymentLabels";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type DeliveryPartner = {
  name: string;
  phone: string;
  vehicle?: string;
};

type Order = {
  _id: string;

  restaurant_email: string;
  restaurant_name?: string;
  restaurant_image?: string;
  restaurant_cuisine?: string;

  customer_name: string;
  phone: string;
  address: string;

  payment_method: string;
  payment_status?: string;

  total: number;
  status: string;
  items: OrderItem[];

  created_at?: string;
  delivery_for?: string;

  latitude?: number;
  longitude?: number;

  delivery_partner?: DeliveryPartner;

  otp_verified?: boolean;
  review_submitted?: boolean;
};

type OrderOtp = {
  otp: number | null;
  verified: boolean;
  status: string;
};

type FilterType = "All" | "Active" | "Delivered" | "Cancelled";

type SortType =
  | "Newest"
  | "Oldest"
  | "Highest Amount"
  | "Lowest Amount";

type StatusConfig = {
  label: string;
  className: string;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  Pending: {
    label: "Pending",
    className: "bg-orange-100 text-orange-700",
  },

  Accepted: {
    label: "Accepted",
    className: "bg-blue-100 text-blue-700",
  },

  Preparing: {
    label: "Preparing",
    className: "bg-yellow-100 text-yellow-700",
  },

  "Ready for Pickup": {
    label: "Ready for Pickup",
    className: "bg-purple-100 text-purple-700",
  },

  Assigned: {
    label: "Assigned",
    className: "bg-indigo-100 text-indigo-700",
  },

  "Picked Up": {
    label: "Picked Up",
    className: "bg-blue-100 text-blue-700",
  },

  "Out for Delivery": {
    label: "Out for Delivery",
    className: "bg-blue-100 text-blue-700",
  },

  Delivered: {
    label: "Delivered",
    className: "bg-green-100 text-green-700",
  },

  Rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700",
  },

  Cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700",
  },
};

const FILTER_BUTTONS: FilterType[] = [
  "All",
  "Active",
  "Delivered",
  "Cancelled",
];

function isActiveStatus(status: string) {
  return !["Delivered", "Cancelled", "Rejected"].includes(status);
}

function getStatusConfig(status: string): StatusConfig {
  return (
    STATUS_CONFIG[status] ?? {
      label: status,
      className: "bg-gray-100 text-gray-700",
    }
  );
}

function formatOrderDate(date?: string) {
  if (!date) {
    return "Recently";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function getPaymentStatusClass(
  paymentStatus?: string,
  paymentMethod?: string
) {
  const status = paymentStatus?.toLowerCase() ?? "";
  const method = paymentMethod?.toLowerCase() ?? "";

  if (status === "paid") {
    return "bg-green-100 text-green-700";
  }

  if (status.includes("fail")) {
    return "bg-red-100 text-red-700";
  }

  if (method.includes("cash")) {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-yellow-100 text-yellow-700";
}

export default function OrdersPage() {
  const { isLoggedIn } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("All");
  const [sort, setSort] = useState<SortType>("Newest");

  const [orderOtps, setOrderOtps] = useState<
    Record<string, OrderOtp>
  >({});

  /**
   * Prevents state updates after unmount.
   */
  const mountedRef = useRef(true);

  /**
   * Keeps polling independent from the render-created
   * `orders` value.
   */
  const activeOrdersRef = useRef(false);

  /**
   * Prevents the same OTP endpoint from being called
   * repeatedly every 5 seconds.
   */
  const otpRequestedRef = useRef<Set<string>>(new Set());

  /**
   * Used to avoid overlapping polling requests.
   */
  const fetchingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    activeOrdersRef.current = orders.some((order) =>
      isActiveStatus(order.status)
    );
  }, [orders]);

  const loadOrderOTP = useCallback(async (orderId: string) => {
    if (otpRequestedRef.current.has(orderId)) {
      return;
    }

    otpRequestedRef.current.add(orderId);

    try {
      const otp = await getOrderOTP(orderId);

      if (!mountedRef.current) {
        return;
      }

      setOrderOtps((previous) => ({
        ...previous,
        [orderId]: otp,
      }));
    } catch (err) {
      /**
       * Allow a retry if the OTP request failed.
       */
      otpRequestedRef.current.delete(orderId);

      console.error(
        `Unable to load OTP for order ${orderId}:`,
        err
      );
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;

    try {
      if (
        !isLoggedIn &&
        !localStorage.getItem("token")
      ) {
        if (!mountedRef.current) {
          return;
        }

        setError("Please log in to view your orders.");
        setOrders([]);
        setLoading(false);
        return;
      }

      const result = await getMyOrders();

      if (!mountedRef.current) {
        return;
      }

      setOrders(result);
      setError("");

      /**
       * Only request OTPs for delivery-stage orders.
       * `otpRequestedRef` ensures polling doesn't repeatedly
       * hit the OTP endpoint.
       */
      for (const order of result) {
        const requiresOtp =
          order.status === "Picked Up" ||
          order.status === "Out for Delivery";

        if (
          requiresOtp &&
          !orderOtps[order._id] &&
          !otpRequestedRef.current.has(order._id)
        ) {
          void loadOrderOTP(order._id);
        }
      }
    } catch (err) {
      console.error(err);

      if (
        err instanceof AuthHttpError &&
        err.status === 401
      ) {
        return;
      }

      if (!mountedRef.current) {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your orders."
      );
    } finally {
      fetchingRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isLoggedIn, loadOrderOTP, orderOtps]);

  /**
   * Initial load + polling.
   *
   * The interval remains lightweight because it only calls
   * the API when there are active orders.
   */
  useEffect(() => {
    void fetchOrders();

    const interval = window.setInterval(() => {
      if (activeOrdersRef.current) {
        void fetchOrders();
      }
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchOrders]);

  /**
   * Because fetchOrders references orderOtps, the callback can
   * technically be recreated after an OTP arrives. The interval
   * is cleaned up and recreated safely by the effect.
   *
   * The Set above still guarantees that the OTP endpoint itself
   * isn't repeatedly requested.
   */

  const activeOrdersCount = useMemo(
    () =>
      orders.filter((order) =>
        isActiveStatus(order.status)
      ).length,
    [orders]
  );

  const deliveredOrdersCount = useMemo(
    () =>
      orders.filter(
        (order) => order.status === "Delivered"
      ).length,
    [orders]
  );

  const cancelledOrdersCount = useMemo(
    () =>
      orders.filter((order) =>
        ["Cancelled", "Rejected"].includes(order.status)
      ).length,
    [orders]
  );

  const filterCounts = useMemo(
    () => ({
      All: orders.length,
      Active: activeOrdersCount,
      Delivered: deliveredOrdersCount,
      Cancelled: cancelledOrdersCount,
    }),
    [
      orders.length,
      activeOrdersCount,
      deliveredOrdersCount,
      cancelledOrdersCount,
    ]
  );

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = orders.filter((order) => {
      if (
        filter === "Active" &&
        !isActiveStatus(order.status)
      ) {
        return false;
      }

      if (
        filter === "Delivered" &&
        order.status !== "Delivered"
      ) {
        return false;
      }

      if (
        filter === "Cancelled" &&
        !["Cancelled", "Rejected"].includes(
          order.status
        )
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const restaurantName =
        order.restaurant_name ??
        "Campus Restaurant";

      const restaurantCuisine =
        order.restaurant_cuisine ??
        "Campus Dining";

      const itemNames = order.items
        .map((item) => item.name)
        .join(" ");

      const searchableText = [
        restaurantName,
        restaurantCuisine,
        order.restaurant_email,
        order._id,
        itemNames,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });

    return [...result].sort((a, b) => {
      switch (sort) {
        case "Oldest":
          return (
            new Date(a.created_at ?? 0).getTime() -
            new Date(b.created_at ?? 0).getTime()
          );

        case "Highest Amount":
          return b.total - a.total;

        case "Lowest Amount":
          return a.total - b.total;

        case "Newest":
        default:
          return (
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
          );
      }
    });
  }, [orders, search, filter, sort]);

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
          <section className="rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 p-5 text-white shadow-xl sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl shadow-inner">
                📦
              </div>

              <div>
                <p className="text-sm font-medium text-orange-100">
                  Your order history
                </p>

                <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  My Orders
                </h1>

                <p className="mt-1 text-sm text-orange-100">
                  Track current orders and reorder your
                  favourites.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 text-4xl">
              📦
            </div>

            <h2 className="mt-5 text-2xl font-bold text-gray-900">
              No Orders Yet
            </h2>

            <p className="mt-2 text-gray-500">
              You haven't placed any orders yet. Start
              exploring restaurants and order your
              favourite food.
            </p>

            <Link
              href="/restaurants"
              className="mt-6 inline-flex rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600"
            >
              Browse Restaurants
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Hero */}
        <section className="rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 p-5 text-white shadow-xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl shadow-inner">
                📦
              </div>

              <div>
                <p className="text-sm font-medium text-orange-100">
                  Your order history
                </p>

                <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  My Orders
                </h1>

                <p className="mt-1 text-sm text-orange-100">
                  Track current orders and reorder your
                  favourites.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-orange-600 shadow-sm">
                {orders.length}{" "}
                {orders.length === 1
                  ? "Order"
                  : "Orders"}
              </span>

              {activeOrdersCount > 0 && (
                <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                  {activeOrdersCount} Active
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Search + Filters */}
        <section className="mt-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search by restaurant, food item or order ID"
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as SortType)
              }
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:w-44"
            >
              <option value="Newest">Newest</option>
              <option value="Oldest">Oldest</option>
              <option value="Highest Amount">
                Highest Amount
              </option>
              <option value="Lowest Amount">
                Lowest Amount
              </option>
            </select>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {FILTER_BUTTONS.map((item) => {
              const active = filter === item;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  {item} ({filterCounts[item]})
                </button>
              );
            })}
          </div>
        </section>

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
                  orders.length === 1
                    ? "order"
                    : "orders"
                }`}
          </p>
        </div>

        {/* Empty Filter/Search State */}
        {filteredOrders.length === 0 ? (
          <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
              🔍
            </div>

            <h2 className="mt-4 text-xl font-bold text-gray-900">
              No matching orders
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Try searching by restaurant, food item or
              order ID.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilter("All");
              }}
              className="mt-5 rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Clear Filters
            </button>
          </section>
        ) : (
          <div className="mt-4 space-y-4">
            {filteredOrders.map((order) => {
              const status = getStatusConfig(
                order.status
              );

              const active = isActiveStatus(
                order.status
              );

              const restaurantName =
                order.restaurant_name ??
                "Campus Restaurant";

              const restaurantCuisine =
                order.restaurant_cuisine ??
                "Campus Dining";

              const itemCount = order.items.reduce(
                (sum, item) =>
                  sum + item.quantity,
                0
              );

              const paymentStatusClass =
                getPaymentStatusClass(
                  order.payment_status,
                  order.payment_method
                );

              return (
                <article
                  key={order._id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <OrderNotification
                    status={order.status}
                  />

                  <LiveDeliveryNotification
                    status={order.status}
                  />

                  {/* Order Header */}
                  <div className="border-b border-gray-100 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-4">
                        {order.restaurant_image ? (
                          <Image
                            src={order.restaurant_image}
                            alt={restaurantName}
                            width={56}
                            height={56}
                            className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                            unoptimized={order.restaurant_image.startsWith(
                              "http"
                            )}
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-2xl">
                            🍽️
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-lg font-bold text-gray-900">
                              {restaurantName}
                            </h2>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-gray-500">
                            {restaurantCuisine}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-gray-400">
                            {order.restaurant_email}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 sm:text-right">
                        <p className="text-xs font-medium text-gray-400">
                          Order #
                        </p>

                        <p className="font-bold text-gray-900">
                          {order._id
                            .slice(-8)
                            .toUpperCase()}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Placed{" "}
                          {formatOrderDate(
                            order.created_at
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="grid gap-4 p-5 lg:grid-cols-3">
                    {/* Items */}
                    <div className="lg:col-span-2">
                      <h3 className="mb-3 font-bold text-gray-900">
                        Ordered Items
                      </h3>

                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              {item.image ? (
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  width={44}
                                  height={44}
                                  className="h-11 w-11 shrink-0 rounded-xl object-cover"
                                  unoptimized={item.image.startsWith(
                                    "http"
                                  )}
                                />
                              ) : (
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-lg">
                                  🍴
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900">
                                  {item.name}
                                </p>

                                <p className="text-sm text-gray-500">
                                  ₹{item.price} ×{" "}
                                  {item.quantity}
                                </p>
                              </div>
                            </div>

                            <p className="shrink-0 font-semibold text-gray-900">
                              ₹
                              {item.price *
                                item.quantity}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Timeline */}
                      {active && (
                        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <OrderTimeline
                            status={order.status}
                          />
                        </div>
                      )}

                      {/* Delivery Partner */}
                      {order.delivery_partner && (
                        <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                                Delivery Partner
                              </p>

                              <p className="mt-1 font-bold text-gray-900">
                                {
                                  order
                                    .delivery_partner
                                    .name
                                }
                              </p>

                              <p className="text-sm text-gray-600">
                                {
                                  order
                                    .delivery_partner
                                    .phone
                                }

                                {order
                                  .delivery_partner
                                  .vehicle
                                  ? ` • ${order.delivery_partner.vehicle}`
                                  : ""}
                              </p>
                            </div>

                            {order.status ===
                              "Out for Delivery" && (
                              <Link
                                href={`/track-order/${order._id}`}
                                className="rounded-xl bg-blue-600 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
                              >
                                📍 Track Order
                              </Link>
                            )}
                          </div>

                          {/* OTP */}
                          {!orderOtps[order._id]
                            ?.verified &&
                            (order.status ===
                              "Picked Up" ||
                              order.status ===
                                "Out for Delivery") &&
                            orderOtps[order._id]?.otp && (
                              <div className="mt-4 rounded-xl border-2 border-orange-300 bg-orange-100 p-4 text-center">
                                <h4 className="text-sm font-bold text-orange-900">
                                  🔐 Delivery OTP
                                </h4>

                                <p className="mt-1 text-4xl font-extrabold tracking-[8px] text-orange-700">
                                  {
                                    orderOtps[
                                      order._id
                                    ]?.otp
                                  }
                                </p>

                                <p className="mt-1 text-xs text-gray-600">
                                  Share this OTP only
                                  after receiving
                                  your order.
                                </p>
                              </div>
                            )}

                          {/* Review */}
                          {order.status ===
                            "Delivered" &&
                            !order.review_submitted && (
                              <div className="mt-4">
                                <ReviewModal
                                  orderId={
                                    order._id
                                  }
                                  restaurantEmail={
                                    order.restaurant_email
                                  }
                                  deliveryPartnerPhone={
                                    order
                                      .delivery_partner
                                      .phone
                                  }
                                  customerName={
                                    order.customer_name
                                  }
                                  onSuccess={
                                    fetchOrders
                                  }
                                />
                              </div>
                            )}

                          {order.status ===
                            "Delivered" &&
                            order.review_submitted && (
                              <div className="mt-4 rounded-xl border border-green-200 bg-white p-4 text-center">
                                <h3 className="font-bold text-green-700">
                                  ⭐ Thank You!
                                </h3>

                                <p className="mt-1 text-sm text-gray-600">
                                  Your review has
                                  been submitted
                                  successfully.
                                </p>
                              </div>
                            )}
                        </div>
                      )}
                    </div>

                    {/* Summary */}
                    <aside className="rounded-2xl bg-gray-50 p-5">
                      <h3 className="font-bold text-gray-900">
                        Order Summary
                      </h3>

                      <div className="mt-4 space-y-3 text-sm">
                        {/* Payment */}
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-gray-500">
                            Payment
                          </span>

                          <span className="text-right font-medium text-gray-800">
                            {formatPaymentMethod(
                              order.payment_method
                            )}

                            <span
                              className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${paymentStatusClass}`}
                            >
                              {formatPaymentStatus(
                                order.payment_status,
                                order.payment_method
                              )}
                            </span>
                          </span>
                        </div>

                        {/* Items */}
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Items
                          </span>

                          <span className="font-medium text-gray-800">
                            {itemCount}
                          </span>
                        </div>

                        {/* Total */}
                        <div className="border-t pt-3">
                          <div className="flex justify-between text-lg font-bold">
                            <span>Total</span>

                            <span className="text-orange-600">
                              ₹{order.total}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Delivery */}
                      <div className="mt-5 border-t pt-5">
                        <p className="text-sm font-semibold text-gray-700">
                          Delivering to
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {order.customer_name}
                        </p>

                        <p className="text-sm text-gray-500">
                          {order.phone}
                        </p>

                        <p className="mt-2 line-clamp-2 break-words text-sm text-gray-500">
                          {order.address}
                        </p>
                      </div>
                    </aside>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 border-t border-gray-100 p-5 sm:flex-row sm:justify-end">
                    <Link
                      href={`/orders/${order._id}`}
                      className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-center text-sm font-semibold text-gray-700 transition hover:border-orange-300 hover:text-orange-600"
                    >
                      View Details
                    </Link>

                    {active && (
                      <Link
                        href={`/track-order/${order._id}`}
                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        📍 Track Order
                      </Link>
                    )}

                    {order.status === "Delivered" && (
                      <Link
                        href="/restaurants"
                        className="rounded-xl bg-orange-500 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-orange-600"
                      >
                        Order Again
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}