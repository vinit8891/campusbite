"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import OrderNotification from "@/components/notifications/OrderNotification";
import LiveDeliveryNotification from "@/components/notifications/LiveDeliveryNotification";
import OrderTimeline from "@/components/orders/OrderTimeline";
import ReviewModal from "@/components/reviews/ReviewModal";
import { getOrderOTP } from "@/services/deliveryService";
import { getMyOrders } from "@/services/orderService";
import { AuthHttpError } from "@/services/authFetch";
import { useAuth } from "@/context/AuthContext";
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
  customer_name: string;
  phone: string;
  address: string;
  payment_method: string;
  payment_status?: string;
  restaurant_email: string;
  restaurant_name?: string;
  restaurant_image?: string;
  restaurant_cuisine?: string;
  total: number;
  status: string;
  items: OrderItem[];

  latitude?: number;
  longitude?: number;

  delivery_partner?: DeliveryPartner;

  otp_verified?: boolean;
  review_submitted?: boolean;

  created_at?: string;
};

type FilterType = "All" | "Active" | "Delivered" | "Cancelled";
type SortType = "Newest" | "Oldest" | "Highest Amount" | "Lowest Amount";

function formatOrderDate(date?: string) {
  if (!date) return "Recently";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Recently";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isActiveStatus(status: string) {
  return !["Delivered", "Cancelled", "Rejected"].includes(status);
}

function getBadgeColor(status: string) {
  switch (status) {
    case "Pending":
      return "bg-orange-100 text-orange-700";

    case "Accepted":
      return "bg-orange-100 text-orange-700";

    case "Preparing":
      return "bg-yellow-100 text-yellow-700";

    case "Ready for Pickup":
      return "bg-yellow-100 text-yellow-700";

    case "Assigned":
      return "bg-blue-100 text-blue-700";

    case "Picked Up":
      return "bg-blue-100 text-blue-700";

    case "Out for Delivery":
      return "bg-blue-100 text-blue-700";

    case "Delivered":
      return "bg-green-100 text-green-700";

    case "Rejected":
    case "Cancelled":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "Pending":
      return "Pending";

    case "Accepted":
      return "Accepted";

    case "Preparing":
      return "Preparing";

    case "Ready for Pickup":
      return "Ready for Pickup";

    case "Assigned":
      return "Assigned";

    case "Picked Up":
      return "Picked Up";

    case "Out for Delivery":
      return "Out for Delivery";

    case "Delivered":
      return "Delivered";

    case "Rejected":
      return "Rejected";

    case "Cancelled":
      return "Cancelled";

    default:
      return status;
  }
}

export default function MyOrdersPage() {
  const { isLoggedIn } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("All");
  const [sort, setSort] = useState<SortType>("Newest");

  const [orderOtps, setOrderOtps] = useState<
    Record<
      string,
      {
        otp: number | null;
        verified: boolean;
        status: string;
      }
    >
  >({});

  async function loadOrderOTP(orderId: string) {
    try {
      const otp = await getOrderOTP(orderId);

      setOrderOtps((prev) => ({
        ...prev,
        [orderId]: otp,
      }));
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchOrders() {
    try {
      if (!isLoggedIn && !localStorage.getItem("token")) {
        setError("Please log in to view your orders.");
        setOrders([]);
        setLoading(false);
        return;
      }

      const data = await getMyOrders();

      setOrders(data);
      setError("");

      for (const order of data) {
        if (
          (order.status === "Picked Up" ||
            order.status === "Out for Delivery") &&
          !orderOtps[order._id]
        ) {
          loadOrderOTP(order._id);
        }
      }
    } catch (error) {
      console.error(error);

      if (error instanceof AuthHttpError && error.status === 401) {
        return;
      }

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load your orders."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(fetchOrders, 5000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const activeOrdersCount = orders.filter((order) =>
    isActiveStatus(order.status)
  ).length;

  const deliveredOrdersCount = orders.filter(
    (order) => order.status === "Delivered"
  ).length;

  const cancelledOrdersCount = orders.filter((order) =>
    ["Cancelled", "Rejected"].includes(order.status)
  ).length;

  const filterButtons: {
    label: FilterType;
    count: number;
  }[] = [
    {
      label: "All",
      count: orders.length,
    },
    {
      label: "Active",
      count: activeOrdersCount,
    },
    {
      label: "Delivered",
      count: deliveredOrdersCount,
    },
    {
      label: "Cancelled",
      count: cancelledOrdersCount,
    },
  ];

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    let result = orders.filter((order) => {
      if (filter === "Active" && !isActiveStatus(order.status)) {
        return false;
      }

      if (filter === "Delivered" && order.status !== "Delivered") {
        return false;
      }

      if (
        filter === "Cancelled" &&
        !["Cancelled", "Rejected"].includes(order.status)
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const restaurantName =
        order.restaurant_name || "Campus Restaurant";

      const foodNames = order.items
        .map((item) => item.name)
        .join(" ");

      const searchableText = [
        restaurantName,
        order.restaurant_email,
        order._id,
        foodNames,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });

    result = [...result].sort((a, b) => {
      const aTime = a.created_at
        ? new Date(a.created_at).getTime()
        : 0;

      const bTime = b.created_at
        ? new Date(b.created_at).getTime()
        : 0;

      switch (sort) {
        case "Oldest":
          return aTime - bTime;

        case "Highest Amount":
          return b.total - a.total;

        case "Lowest Amount":
          return a.total - b.total;

        case "Newest":
        default:
          return bTime - aTime;
      }
    });

    return result;
  }, [orders, search, filter, sort]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Hero Skeleton */}
          <section className="animate-pulse rounded-3xl bg-gradient-to-br from-orange-400 to-orange-500 p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/30" />

              <div className="flex-1">
                <div className="h-4 w-24 rounded bg-white/30" />

                <div className="mt-2 h-8 w-44 rounded bg-white/30" />

                <div className="mt-2 h-4 w-64 max-w-full rounded bg-white/20" />
              </div>
            </div>
          </section>

          {/* Search Skeleton */}
          <div className="mt-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="h-11 animate-pulse rounded-xl bg-gray-100" />

            <div className="mt-3 flex gap-3 overflow-hidden">
              {filterButtons.map((item) => (
                <div
                  key={item.label}
                  className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-gray-100"
                />
              ))}
            </div>
          </div>

          {/* Order Card Skeletons */}
          <div className="mt-5 space-y-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gray-200" />

                  <div className="flex-1">
                    <div className="h-5 w-40 rounded bg-gray-200" />

                    <div className="mt-2 h-3 w-28 rounded bg-gray-100" />
                  </div>

                  <div className="h-7 w-24 rounded-full bg-gray-200" />
                </div>

                <div className="mt-4 h-16 rounded-xl bg-gray-100" />

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="h-16 rounded-xl bg-gray-100" />
                  <div className="h-16 rounded-xl bg-gray-100" />
                  <div className="h-16 rounded-xl bg-gray-100" />
                </div>

                <div className="mt-4 flex gap-3">
                  <div className="h-10 flex-1 rounded-xl bg-gray-200" />
                  <div className="h-10 flex-1 rounded-xl bg-gray-100" />
                </div>
              </div>
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
            onClick={fetchOrders}
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
      <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Compact Empty Hero */}
          <section className="rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 p-5 text-white shadow-xl sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl">
                  📦
                </div>

                <div>
                  <p className="text-sm font-medium text-orange-100">
                    Your order history
                  </p>

                  <h1 className="mt-1 text-3xl font-extrabold">
                    My Orders
                  </h1>

                  <p className="mt-1 text-sm text-orange-100">
                    Track current orders and reorder your favourites.
                  </p>
                </div>
              </div>

              <span className="w-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-orange-600">
                0 Orders
              </span>
            </div>
          </section>

          {/* Empty State */}
          <section className="mt-5 rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 text-4xl">
              📦
            </div>

            <h2 className="mt-5 text-2xl font-bold text-gray-900">
              No Orders Yet
            </h2>

            <p className="mt-2 text-gray-500">
              Looks like you haven't ordered anything.
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
      <div className="mx-auto max-w-6xl">
        {/* Premium Header */}
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
                  Track current orders and reorder your favourites.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-orange-600 shadow-sm">
                {orders.length}{" "}
                {orders.length === 1 ? "Order" : "Orders"}
              </span>

              {activeOrdersCount > 0 && (
                <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-orange-600 shadow-sm">
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
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search restaurants, items or order ID"
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div className="relative flex-1 sm:flex-none">
              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as SortType)
                }
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 pr-9 text-sm font-medium text-gray-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:w-44"
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
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {filterButtons.map((item) => {
              const active = filter === item.label;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setFilter(item.label)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  {item.label} ({item.count})
                </button>
              );
            })}
          </div>
        </section>

        {/* Results Count */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">
            {search.trim() || filter !== "All" ? (
              <>
                Showing{" "}
                <span className="font-bold text-gray-900">
                  {filteredOrders.length}
                </span>{" "}
                matching{" "}
                {filteredOrders.length === 1 ? "order" : "orders"}
              </>
            ) : (
              <>
                Showing{" "}
                <span className="font-bold text-gray-900">
                  {filteredOrders.length}
                </span>{" "}
                of{" "}
                <span className="font-bold text-gray-900">
                  {orders.length}
                </span>{" "}
                {orders.length === 1 ? "order" : "orders"}
              </>
            )}
          </p>
        </div>

        {/* Order Cards */}
        {filteredOrders.length === 0 ? (
          <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
              🔍
            </div>

            <h2 className="mt-4 text-xl font-bold text-gray-900">
              No matching orders
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
              Try searching by restaurant, food item or order ID.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilter("All");
              }}
              className="mt-5 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Clear Filters
            </button>
          </section>
        ) : (
          <div className="mt-4 space-y-4">
            {filteredOrders.map((order) => {
              const restaurantName =
                order.restaurant_name || "Campus Restaurant";

              const restaurantCuisine =
                order.restaurant_cuisine || "Campus Dining";

              const itemPreview = order.items.slice(0, 2);

              const remainingItems = Math.max(
                order.items.length - 2,
                0
              );

              const active = isActiveStatus(order.status);

              const paymentStatus =
                order.payment_status?.toLowerCase() ?? "";

              return (
                <article
                  key={order._id}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <OrderNotification status={order.status} />

                  <LiveDeliveryNotification
                    status={order.status}
                  />

                  {/* Restaurant + Order Info */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      {order.restaurant_image ? (
                        <Image
                          src={order.restaurant_image}
                          alt={restaurantName}
                          width={60}
                          height={60}
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
                        <h2 className="truncate text-lg font-bold text-gray-900">
                          {restaurantName}
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          {restaurantCuisine}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-gray-400">
                          {order.restaurant_email}
                        </p>
                      </div>
                    </div>

                    {/* Order Number + Status */}
                    <div className="shrink-0 sm:text-right">
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <p className="text-sm font-bold text-gray-900">
                          #{order._id.slice(-8).toUpperCase()}
                        </p>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getBadgeColor(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-gray-500">
                        Placed {formatOrderDate(order.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Item Preview + Price */}
                  <div className="mt-4 flex flex-col gap-4 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Items
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-gray-800">
                        {itemPreview.map((item, index) => (
                          <span key={item.id}>
                            {index > 0 && (
                              <span className="mr-2 text-gray-300">
                                •
                              </span>
                            )}

                            {item.name}
                          </span>
                        ))}

                        {remainingItems > 0 && (
                          <span className="text-orange-600">
                            +{remainingItems} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <p className="text-xs text-gray-400">
                        Total
                      </p>

                      <p className="text-xl font-extrabold text-orange-600">
                        ₹{order.total}
                      </p>
                    </div>
                  </div>

                  {/* Compact Order Details */}
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-xl border border-gray-100 bg-white p-3">
                      <p className="text-xs text-gray-400">
                        Delivery Address
                      </p>

                      <p className="mt-1 line-clamp-2 font-medium text-gray-700">
                        {order.address}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-white p-3">
                      <p className="text-xs text-gray-400">
                        Payment
                      </p>

                      <p className="mt-1 font-medium text-gray-700">
                        {formatPaymentMethod(order.payment_method)}
                      </p>

                      <span
                        className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          paymentStatus === "paid"
                            ? "bg-green-100 text-green-700"
                            : paymentStatus.includes("fail")
                            ? "bg-red-100 text-red-700"
                            : order.payment_method
                                ?.toLowerCase()
                                .includes("cash")
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {formatPaymentStatus(
                          order.payment_status,
                          order.payment_method
                        )}
                      </span>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-white p-3">
                      <p className="text-xs text-gray-400">
                        Phone
                      </p>

                      <p className="mt-1 font-medium text-gray-700">
                        {order.phone}
                      </p>
                    </div>
                  </div>

                  {/* Timeline */}
                  {active && (
                    <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <OrderTimeline status={order.status} />
                    </div>
                  )}

                  {/* Delivery Partner */}
                  {order.delivery_partner && (
                    <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                          Delivery Partner
                        </p>

                        <p className="mt-1 font-bold text-gray-900">
                          {order.delivery_partner.name}
                        </p>

                        <p className="text-sm text-gray-600">
                          {order.delivery_partner.phone}
                          {order.delivery_partner.vehicle
                            ? ` • ${order.delivery_partner.vehicle}`
                            : ""}
                        </p>
                      </div>

                      {/* OTP */}
                      {!orderOtps[order._id]?.verified &&
                        (order.status === "Picked Up" ||
                          order.status ===
                            "Out for Delivery") &&
                        orderOtps[order._id]?.otp && (
                          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-center">
                            <h4 className="text-sm font-bold text-orange-900">
                              🔐 Delivery OTP
                            </h4>

                            <p className="mt-1 text-4xl font-extrabold tracking-[8px] text-orange-700">
                              {orderOtps[order._id]?.otp}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              Share this OTP only after receiving
                              your order.
                            </p>
                          </div>
                        )}

                      {/* Review */}
                      {order.status === "Delivered" &&
                        !order.review_submitted && (
                          <div className="mt-4">
                            <ReviewModal
                              orderId={order._id}
                              restaurantEmail={
                                order.restaurant_email
                              }
                              deliveryPartnerPhone={
                                order.delivery_partner.phone
                              }
                              customerName={order.customer_name}
                              onSuccess={fetchOrders}
                            />
                          </div>
                        )}

                      {order.status === "Delivered" &&
                        order.review_submitted && (
                          <div className="mt-4 rounded-xl border border-green-200 bg-white p-4 text-center">
                            <h3 className="font-bold text-green-700">
                              ⭐ Thank You!
                            </h3>

                            <p className="mt-1 text-sm text-gray-600">
                              Your review has been submitted
                              successfully.
                            </p>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {active && (
                      <Link
                        href={`/track-order/${order._id}`}
                        className="order-1 rounded-xl bg-blue-600 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700 sm:order-none"
                      >
                        Track Order
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

                    <Link
                      href={`/orders/${order._id}`}
                      className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-center text-sm font-semibold text-gray-700 transition hover:border-orange-300 hover:text-orange-600"
                    >
                      View Details
                    </Link>
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