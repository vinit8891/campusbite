"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { getOrderById } from "@/services/orderService";
import { AuthHttpError } from "@/services/authFetch";
import {
  formatPaymentMethod,
  formatPaymentStatus,
} from "@/lib/paymentLabels";

type OrderItem = {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type Order = {
  _id: string;

  restaurant_id?: string;
  restaurant_name?: string;
  restaurant_email: string;
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

  estimated_delivery?: string;
  estimated_time?: string;

  delivery_partner?: {
    name?: string;
    phone?: string;
    vehicle?: string;
    latitude?: number | null;
    longitude?: number | null;
  };

  latitude?: number | null;
  longitude?: number | null;

  restaurant_latitude?: number | null;
  restaurant_longitude?: number | null;

  delivery_otp?: number;
  otp_verified?: boolean;

  created_at?: string;
};

const statuses = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready for Pickup",
  "Assigned",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
];

export default function OrderDetailsPage() {
  const params = useParams();

  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrder() {
    try {
      const data = await getOrderById(orderId);

      setOrder(data);
      setError("");
    } catch (err) {
      console.error(err);

      if (err instanceof AuthHttpError && err.status === 401) {
        return;
      }

      if (err instanceof AuthHttpError && err.status === 404) {
        setError("Order not found.");
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load order details."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();

    const interval = setInterval(loadOrder, 5000);

    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-5xl rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />

          <p className="mt-4 font-medium text-gray-600">
            Loading order...
          </p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-5xl rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <div className="text-5xl">😕</div>

          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Order Not Found
          </h1>

          <p className="mt-2 text-gray-500">
            {error || "We couldn't find this order."}
          </p>

          <Link
            href="/orders"
            className="mt-6 inline-block rounded-full bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600"
          >
            Back to My Orders
          </Link>
        </div>
      </main>
    );
  }

  const currentIndex = statuses.indexOf(order.status);

  const isDelivered = order.status === "Delivered";
  const isCancelled = order.status === "Cancelled";

  const estimatedDelivery =
    order.estimated_delivery ||
    order.estimated_time ||
    "22–28 mins";

  const restaurantName = order.restaurant_name || "Restaurant";
  const restaurantImage = order.restaurant_image;

  const restaurantLocation =
    order.address?.split(",")[0]?.trim() || "Campus Area";

  const paymentStatus = formatPaymentStatus(
    order.payment_status,
    order.payment_method
  );

  const normalizedPaymentStatus =
    order.payment_status?.toLowerCase() || "";

  const paymentStatusClass = normalizedPaymentStatus.includes("paid")
    ? "bg-green-100 text-green-700"
    : normalizedPaymentStatus.includes("pending")
    ? "bg-yellow-100 text-yellow-700"
    : normalizedPaymentStatus.includes("failed")
    ? "bg-red-100 text-red-700"
    : order.payment_method?.toLowerCase().includes("cash")
    ? "bg-blue-100 text-blue-700"
    : "bg-gray-100 text-gray-600";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back */}
        <Link
          href="/orders"
          className="inline-flex items-center text-sm font-medium text-gray-500 transition hover:text-orange-600"
        >
          ← Back to My Orders
        </Link>

        {/* ========================================================= */}
        {/* PREMIUM ORDER HERO */}
        {/* ========================================================= */}

        <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-4xl shadow-inner">
                🍽️
              </div>

              <div>
                <p className="text-sm font-medium text-orange-100">
                  {isCancelled
                    ? "Order Cancelled"
                    : isDelivered
                    ? "Order Delivered"
                    : "Order Confirmed"}
                </p>

                <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  #{order._id.slice(-8)}
                </h1>

                {order.created_at && (
                  <p className="mt-2 text-sm text-orange-100">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm sm:min-w-[210px]">
              <p className="text-sm text-orange-100">
                Estimated Delivery
              </p>

              <p className="mt-1 text-2xl font-extrabold">
                {estimatedDelivery}
              </p>

              <span
                className={`mt-3 inline-flex rounded-full px-4 py-1.5 text-xs font-bold ${
                  isDelivered
                    ? "bg-green-100 text-green-700"
                    : isCancelled
                    ? "bg-red-100 text-red-700"
                    : "bg-white text-orange-600"
                }`}
              >
                {order.status}
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* STATUS TIMELINE */}
        {/* ========================================================= */}

        {!isCancelled && (
          <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Order Status
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Follow your order from kitchen to delivery.
              </p>
            </div>

            <div className="mt-8">
              {statuses.map((status, index) => {
                const completed = currentIndex > index;
                const current = currentIndex === index;

                return (
                  <div
                    key={status}
                    className="flex items-start gap-4"
                  >
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                          completed
                            ? "bg-orange-500 text-white"
                            : current
                            ? "bg-orange-500 text-white ring-4 ring-orange-100"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {completed
                          ? "✓"
                          : current
                          ? "●"
                          : "○"}
                      </div>

                      {index < statuses.length - 1 && (
                        <div
                          className={`h-10 w-0.5 ${
                            currentIndex > index
                              ? "bg-orange-500"
                              : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>

                    {/* Status text */}
                    <div className="pb-8 pt-1">
                      <p
                        className={`font-semibold ${
                          current
                            ? "text-orange-600"
                            : completed
                            ? "text-gray-900"
                            : "text-gray-400"
                        }`}
                      >
                        {status}
                      </p>

                      {current && (
                        <p className="mt-1 text-sm text-gray-500">
                          Current order status
                        </p>
                      )}

                      {completed && !current && (
                        <p className="mt-1 text-xs text-green-600">
                          Completed
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* RESTAURANT CARD */}
        {/* ========================================================= */}

        <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-4">
            {restaurantImage ? (
              <Image
                src={restaurantImage}
                alt={restaurantName}
                width={72}
                height={72}
                className="h-[72px] w-[72px] rounded-2xl object-cover"
                unoptimized={restaurantImage.startsWith("http")}
              />
            ) : (
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-3xl">
                🍽️
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-500">
                Restaurant
              </p>

              <h2 className="text-2xl font-bold text-gray-900">
                {restaurantName}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {order.restaurant_cuisine || "Campus Area"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">
                Location
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {restaurantLocation}
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">
                Restaurant Email
              </p>

              <p className="mt-1 break-all font-semibold text-gray-900">
                {order.restaurant_email}
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* DELIVERY PARTNER */}
        {/* ========================================================= */}

        {order.delivery_partner && (
          <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">
                🛵
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Delivery Partner
                </h2>

                <p className="text-sm text-gray-500">
                  Your delivery partner information.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">
                  Name
                </p>

                <p className="mt-1 font-semibold">
                  {order.delivery_partner.name ||
                    "Delivery Partner"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">
                  Phone
                </p>

                <p className="mt-1 font-semibold">
                  {order.delivery_partner.phone ||
                    "Not available"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">
                  Vehicle
                </p>

                <p className="mt-1 font-semibold">
                  {order.delivery_partner.vehicle ||
                    "Not specified"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">
                  Current Status
                </p>

                <p className="mt-1 font-semibold text-blue-600">
                  {order.status}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* LIVE LOCATION */}
        {/* ========================================================= */}

        {order.status === "Out for Delivery" &&
          order.delivery_partner && (
            <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
                  📍
                </div>

                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Live Delivery Location
                  </h2>

                  <p className="text-sm text-gray-500">
                    Your delivery partner's latest location.
                  </p>
                </div>
              </div>

              {order.delivery_partner.latitude !== null &&
              order.delivery_partner.latitude !== undefined &&
              order.delivery_partner.longitude !== null &&
              order.delivery_partner.longitude !== undefined ? (
                <div className="mt-5 rounded-2xl bg-green-50 p-5">
                  <p className="font-semibold text-green-800">
                    Delivery partner location available
                  </p>

                  <p className="mt-2 text-sm text-green-700">
                    Latitude: {order.delivery_partner.latitude}
                  </p>

                  <p className="text-sm text-green-700">
                    Longitude: {order.delivery_partner.longitude}
                  </p>

                  <a
                    href={`https://www.google.com/maps?q=${order.delivery_partner.latitude},${order.delivery_partner.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                  >
                    Open Live Location
                  </a>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-orange-50 p-5">
                  <p className="font-semibold text-orange-800">
                    Waiting for delivery partner location...
                  </p>

                  <p className="mt-1 text-sm text-orange-700">
                    This page automatically refreshes every 5 seconds.
                  </p>
                </div>
              )}
            </section>
          )}

        {/* ========================================================= */}
        {/* OTP */}
        {/* ========================================================= */}

        {order.status === "Out for Delivery" && (
          <section className="mt-8 rounded-3xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-2xl">
                🔐
              </div>

              <div>
                <h2 className="text-xl font-bold text-orange-900">
                  Delivery OTP
                </h2>

                <p className="mt-1 text-sm text-orange-800">
                  Give the delivery partner your OTP when your food arrives.
                </p>

                {order.otp_verified ? (
                  <p className="mt-4 font-semibold text-green-700">
                    ✓ OTP Verified
                  </p>
                ) : (
                  <p className="mt-4 font-semibold text-orange-700">
                    OTP verification pending
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* ORDERED ITEMS */}
        {/* ========================================================= */}

        <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Ordered Items
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {order.items.length}{" "}
                {order.items.length === 1 ? "item" : "items"}
              </p>
            </div>
          </div>

          <div className="mt-6 divide-y divide-gray-100">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 py-5 first:pt-0 last:pb-0"
              >
                {/* Food Image */}
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={72}
                    height={72}
                    className="h-[72px] w-[72px] shrink-0 rounded-2xl object-cover"
                    unoptimized={item.image.startsWith("http")}
                  />
                ) : (
                  <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-3xl">
                    🍽️
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900">
                    {item.name}
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-500">
                    {item.quantity} × ₹{item.price}
                  </p>
                </div>

                <p className="text-lg font-extrabold text-gray-900">
                  ₹{item.price * item.quantity}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================= */}
        {/* DELIVERY ADDRESS + PAYMENT */}
        {/* ========================================================= */}

        <section className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Delivery Address */}

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-xl">
                📍
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Delivery Address
                </h2>

                <p className="text-sm text-gray-500">
                  Where your order will be delivered.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-gray-50 p-5">
              <p className="font-bold text-gray-900">
                {order.customer_name}
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                {order.address}
              </p>

              <p className="mt-3 text-sm font-medium text-gray-700">
                📞 {order.phone}
              </p>
            </div>
          </div>

          {/* Payment */}

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-xl">
                {order.payment_method
                  ?.toLowerCase()
                  .includes("cash")
                  ? "💵"
                  : "💳"}
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Payment
                </h2>

                <p className="text-sm text-gray-500">
                  Payment information for this order.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
                <div>
                  <p className="text-xs text-gray-500">
                    Payment Method
                  </p>

                  <p className="mt-1 font-bold text-gray-900">
                    {formatPaymentMethod(order.payment_method)}
                  </p>
                </div>

                <span className="text-2xl">
                  {order.payment_method
                    ?.toLowerCase()
                    .includes("cash")
                    ? "💵"
                    : "💳"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Payment Status
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${paymentStatusClass}`}
                >
                  {paymentStatus}
                </span>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">
                    Total
                  </span>

                  <span className="text-2xl font-extrabold text-orange-600">
                    ₹{order.total}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* BOTTOM ACTIONS */}
        {/* ========================================================= */}

        <section className="mt-10 flex flex-col gap-3 pb-10 sm:flex-row sm:justify-center">
          {!isDelivered && !isCancelled && (
            <Link
              href={`/orders/${order._id}`}
              className="rounded-full bg-blue-600 px-7 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Track Order
            </Link>
          )}

          {isDelivered && (
            <Link
              href="/restaurants"
              className="rounded-full bg-orange-500 px-7 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:bg-orange-600"
            >
              Order Again
            </Link>
          )}

          <Link
            href="/"
            className="rounded-full border border-gray-200 bg-white px-7 py-3 text-center text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-100"
          >
            Back Home
          </Link>
        </section>
      </div>
    </main>
  );
}