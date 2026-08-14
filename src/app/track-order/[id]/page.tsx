"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import LiveTrackingMap from "@/components/maps/LiveTrackingMap";
import LiveDeliveryNotification from "@/components/notifications/LiveDeliveryNotification";
import OrderTimeline from "@/components/orders/OrderTimeline";
import { getOrderOTP } from "@/services/deliveryService";
import { getDeliveryLocation } from "@/services/orderService";
import { AuthHttpError } from "@/services/authFetch";

type TrackingLocation = {
  customer_latitude: number;
  customer_longitude: number;

  partner_latitude?: number | null;
  partner_longitude?: number | null;

  restaurant_latitude: number;
  restaurant_longitude: number;

  status: string;

  restaurant_name?: string;
  restaurant_cuisine?: string;

  delivery_partner_name?: string;
  delivery_partner_phone?: string;
  delivery_partner_vehicle?: string;

  customer_name?: string;
  customer_address?: string;
};

type OrderOTP = {
  otp: number | null;
  verified: boolean;
  status: string;
};

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    className: string;
    dotClassName: string;
  }
> = {
  Pending: {
    label: "Pending",
    className: "bg-orange-100 text-orange-700",
    dotClassName: "bg-orange-500",
  },
  Accepted: {
    label: "Accepted",
    className: "bg-blue-100 text-blue-700",
    dotClassName: "bg-blue-500",
  },
  Preparing: {
    label: "Preparing",
    className: "bg-yellow-100 text-yellow-700",
    dotClassName: "bg-yellow-500",
  },
  "Ready for Pickup": {
    label: "Ready for Pickup",
    className: "bg-purple-100 text-purple-700",
    dotClassName: "bg-purple-500",
  },
  Assigned: {
    label: "Assigned",
    className: "bg-blue-100 text-blue-700",
    dotClassName: "bg-blue-500",
  },
  "Picked Up": {
    label: "Picked Up",
    className: "bg-blue-100 text-blue-700",
    dotClassName: "bg-blue-500",
  },
  "Out for Delivery": {
    label: "Out for Delivery",
    className: "bg-blue-100 text-blue-700",
    dotClassName: "bg-blue-500",
  },
  Delivered: {
    label: "Delivered",
    className: "bg-green-100 text-green-700",
    dotClassName: "bg-green-500",
  },
  Rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700",
    dotClassName: "bg-red-500",
  },
  Cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700",
    dotClassName: "bg-red-500",
  },
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      label: status,
      className: "bg-gray-100 text-gray-700",
      dotClassName: "bg-gray-500",
    }
  );
}

function isTerminalStatus(status: string) {
  return ["Delivered", "Cancelled", "Rejected"].includes(status);
}

function hasValidCoordinates(
  latitude?: number | null,
  longitude?: number | null
) {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
  );
}

function formatUpdatedTime(date: Date | null) {
  if (!date) return "Waiting for update";

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000)
  );

  if (seconds < 5) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds} sec ago`;

  const minutes = Math.floor(seconds / 60);

  if (minutes === 1) return "Updated 1 min ago";

  return `Updated ${minutes} min ago`;
}

export default function TrackOrderPage() {
  const params = useParams();

  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [location, setLocation] =
    useState<TrackingLocation | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [orderOtp, setOrderOtp] = useState<OrderOTP | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const isTerminalRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    isTerminalRef.current =
      !!location && isTerminalStatus(location.status);
  }, [location]);

  const loadLocation = useCallback(async () => {
    if (!orderId || fetchingRef.current) return;

    fetchingRef.current = true;

    try {
      const data = await getDeliveryLocation(orderId);

      if (!mountedRef.current) return;

      setLocation(data);
      setError("");
      setLastUpdated(new Date());

      if (
        data.status === "Picked Up" ||
        data.status === "Out for Delivery"
      ) {
        try {
          const otp = await getOrderOTP(orderId);

          if (!mountedRef.current) return;

          setOrderOtp(otp);
        } catch (otpError) {
          console.error("Unable to load delivery OTP:", otpError);
        }
      } else if (mountedRef.current) {
        setOrderOtp(null);
      }
    } catch (err) {
      console.error(err);

      if (!mountedRef.current) return;

      if (err instanceof AuthHttpError && err.status === 401) {
        setError("Please log in to view live tracking.");
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch tracking location."
      );
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }

      fetchingRef.current = false;
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError("Invalid order ID.");
      return;
    }

    void loadLocation();

    const interval = setInterval(() => {
      if (fetchingRef.current) return;
      if (isTerminalRef.current) return;

      void loadLocation();
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId, loadLocation]);

  const statusConfig = useMemo(
    () => getStatusConfig(location?.status ?? ""),
    [location?.status]
  );

  const partnerHasLocation = useMemo(
    () =>
      hasValidCoordinates(
        location?.partner_latitude,
        location?.partner_longitude
      ),
    [
      location?.partner_latitude,
      location?.partner_longitude,
    ]
  );

  const showOtp =
    !orderOtp?.verified &&
    (location?.status === "Picked Up" ||
      location?.status === "Out for Delivery") &&
    orderOtp?.otp;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 h-5 w-32 animate-pulse rounded bg-gray-200" />

          {/* Hero Skeleton */}
          <section className="animate-pulse rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 p-5 shadow-xl sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white/25" />

                <div>
                  <div className="h-4 w-32 rounded bg-white/25" />
                  <div className="mt-2 h-8 w-64 rounded bg-white/30" />
                  <div className="mt-2 h-4 w-48 rounded bg-white/20" />
                </div>
              </div>

              <div className="h-10 w-36 rounded-full bg-white/20" />
            </div>
          </section>

          {/* Status Skeleton */}
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="h-3 w-28 animate-pulse rounded bg-gray-200" />
                <div className="mt-3 h-9 w-36 animate-pulse rounded-full bg-gray-100" />
              </div>

              <div className="h-16 w-44 animate-pulse rounded-xl bg-orange-50" />
            </div>
          </div>

          {/* Timeline Skeleton */}
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />

            <div className="mt-5 space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="h-4 animate-pulse rounded bg-gray-100"
                />
              ))}
            </div>
          </div>

          {/* Partner Skeleton */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gray-200" />

                  <div className="flex-1">
                    <div className="h-3 w-24 rounded bg-gray-200" />
                    <div className="mt-3 h-5 w-36 rounded bg-gray-200" />
                    <div className="mt-2 h-4 w-28 rounded bg-gray-100" />
                    <div className="mt-2 h-4 w-32 rounded bg-gray-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Map Skeleton */}
          <div className="mt-4 h-[500px] animate-pulse rounded-3xl bg-gray-200" />
        </div>
      </main>
    );
  }

  if (error && !location) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
          <section className="w-full rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl">
              😕
            </div>

            <h1 className="mt-5 text-2xl font-extrabold text-gray-900">
              Unable to load tracking
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              {error ||
                "We couldn't retrieve the live tracking information for this order."}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setLoading(true);
                  void loadLocation();
                }}
                className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Retry
              </button>

              <Link
                href="/orders"
                className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-orange-300 hover:text-orange-600"
              >
                Back to Orders
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!location) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          <section className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="text-5xl">📍</div>

            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              Tracking unavailable
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Live tracking information is not available right now.
            </p>

            <button
              type="button"
              onClick={() => {
                setError("");
                setLoading(true);
                void loadLocation();
              }}
              className="mt-6 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Retry
            </button>
          </section>
        </div>
      </main>
    );
  }

  const restaurantName =
    location.restaurant_name ?? "Campus Restaurant";

  const restaurantCuisine =
    location.restaurant_cuisine ?? "Campus Dining";

  const partnerName =
    location.delivery_partner_name ?? "Delivery Partner";

  const customerName =
    location.customer_name ?? "Customer";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Back + Refresh Status */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/orders"
            className="inline-flex items-center text-sm font-semibold text-gray-500 transition hover:text-orange-600"
          >
            ← Back to Orders
          </Link>

          <span
            className="text-xs font-medium text-gray-400"
            aria-live="polite"
          >
            {formatUpdatedTime(lastUpdated)}
          </span>
        </div>

        {/* Hero */}
        <section className="rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 p-5 text-white shadow-xl sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl shadow-inner">
                📍
              </div>

              <div>
                <p className="text-sm font-medium text-orange-100">
                  Live delivery tracking
                </p>

                <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Track Your Order
                </h1>

                <p className="mt-1 text-sm text-orange-100">
                  Follow your order from the restaurant to your door.
                </p>
              </div>
            </div>

            <div
              className="flex items-center gap-2 self-start rounded-full bg-white/15 px-4 py-2 backdrop-blur-sm sm:self-auto"
              aria-live="polite"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${statusConfig.dotClassName}`}
              />

              <span className="text-sm font-bold">
                {statusConfig.label}
              </span>
            </div>
          </div>
        </section>

        {/* Live Delivery Notification */}
        <div className="mt-4">
          <LiveDeliveryNotification status={location.status} />
        </div>

        {/* Current Status */}
        <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Current Status
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${statusConfig.className}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${statusConfig.dotClassName}`}
                  />

                  {statusConfig.label}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-orange-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                Estimated Delivery
              </p>

              <p className="mt-1 font-bold text-orange-700">
                Preparing your delivery estimate...
              </p>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Order Progress
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Follow each step of your delivery.
            </p>
          </div>

          <OrderTimeline status={location.status} />
        </section>

        {/* Restaurant / Partner / Customer */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* Restaurant */}
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl">
                🍽️
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Restaurant
                </p>

                <h2 className="mt-1 truncate text-lg font-bold text-gray-900">
                  {restaurantName}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {restaurantCuisine}
                </p>

                <p className="mt-1 break-words text-xs text-gray-400">
                  Restaurant location
                </p>
              </div>
            </div>
          </section>

          {/* Delivery Partner */}
          <section className="rounded-2xl border border-green-100 bg-green-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl">
                🛵
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                  Delivery Partner
                </p>

                <h2 className="mt-1 break-words text-lg font-bold text-gray-900">
                  {partnerHasLocation
                    ? partnerName
                    : "Waiting for delivery partner..."}
                </h2>

                {location.delivery_partner_phone && (
                  <p className="mt-1 break-words text-sm text-gray-600">
                    📞 {location.delivery_partner_phone}
                  </p>
                )}

                {location.delivery_partner_vehicle && (
                  <p className="mt-1 break-words text-sm text-gray-600">
                    🏍 {location.delivery_partner_vehicle}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Customer */}
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl">
                📍
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Delivery Address
                </p>

                <h2 className="mt-1 break-words text-lg font-bold text-gray-900">
                  {customerName}
                </h2>

                {location.customer_address ? (
                  <p className="mt-1 line-clamp-2 break-words text-sm text-gray-500">
                    {location.customer_address}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">
                    Your saved delivery address
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* OTP */}
        {showOtp && (
          <section className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-5 text-center shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-orange-900">
              🔐 Delivery OTP
            </h2>

            <p className="mt-2 text-4xl font-extrabold tracking-[8px] text-orange-700">
              {orderOtp?.otp}
            </p>

            <p className="mt-2 text-xs text-gray-500">
              Share this OTP only after receiving your order.
            </p>
          </section>
        )}

        {/* Map */}
        <section className="mt-4 overflow-hidden rounded-3xl border border-gray-100 bg-white p-2 shadow-sm sm:p-3">
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Live Map
                </h2>

                <p className="text-sm text-gray-500">
                  {partnerHasLocation
                    ? "Your delivery partner's current location."
                    : "Waiting for the partner's live location."}
                </p>
              </div>

              <span
                className="text-xs font-medium text-gray-400"
                aria-live="polite"
              >
                {formatUpdatedTime(lastUpdated)}
              </span>
            </div>

            {partnerHasLocation ? (
              <div className="h-[500px] overflow-hidden rounded-2xl">
                <LiveTrackingMap
                  partnerLat={location.partner_latitude as number}
                  partnerLng={location.partner_longitude as number}
                  customerLat={location.customer_latitude}
                  customerLng={location.customer_longitude}
                  restaurantLat={location.restaurant_latitude}
                  restaurantLng={location.restaurant_longitude}
                />
              </div>
            ) : (
              <div className="flex h-[500px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 text-center">
                <div>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
                    🛵
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-gray-900">
                    Waiting for live location
                  </h3>

                  <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                    The map will update automatically when your
                    delivery partner starts sharing their location.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Background polling error */}
        {error && location && (
          <div
            className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"
            role="status"
            aria-live="polite"
          >
            Live tracking update temporarily unavailable. We’ll
            retry automatically.
          </div>
        )}

        {/* Bottom Actions */}
        <div className="mt-5 flex flex-col gap-3 pb-8 sm:flex-row sm:justify-end">
          <Link
            href={`/orders/${orderId}`}
            className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-center text-sm font-semibold text-gray-700 transition hover:border-orange-300 hover:text-orange-600"
          >
            View Order Details
          </Link>

          <Link
            href="/orders"
            className="rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    </main>
  );
}