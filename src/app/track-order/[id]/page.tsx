"use client";

import Link from "next/link";
import LiveDeliveryNotification from "@/components/notifications/LiveDeliveryNotification";
import OrderTimeline from "@/components/orders/OrderTimeline";
import {
  OrderStatusBadge,
  CustomerOtpCard,
} from "@/components/common";
import { ROUTES, orderDetailsPath } from "@/lib/routes";
import { useTrackOrder } from "@/hooks/orders/useTrackOrder";
import { TrackOrderHeader } from "@/components/orders/TrackOrderHeader";
import { TrackOrderLocationsGrid } from "@/components/orders/TrackOrderLocationsGrid";
import { TrackOrderMapSection } from "@/components/orders/TrackOrderMapSection";
import { TrackOrderSkeleton } from "@/components/orders/TrackOrderSkeleton";
import { TrackOrderErrorState } from "@/components/orders/TrackOrderErrorState";

export default function TrackOrderPage() {
  const {
    orderId,
    location,
    loading,
    error,
    orderOtp,
    lastUpdated,
    statusConfig,
    partnerHasLocation,
    showOtp,
    restaurantName,
    restaurantCuisine,
    partnerName,
    customerName,
    loadLocation,
    setError,
    setLoading,
  } = useTrackOrder();

  if (loading) {
    return <TrackOrderSkeleton />;
  }

  if (error && !location) {
    return (
      <TrackOrderErrorState
        error={error}
        onRetry={() => {
          setError("");
          setLoading(true);
          void loadLocation();
        }}
      />
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

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <TrackOrderHeader
          lastUpdated={lastUpdated}
          statusConfig={statusConfig}
        />

        <div className="mt-4">
          <LiveDeliveryNotification status={location.status} />
        </div>

        <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Current Status
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <OrderStatusBadge
                  status={location.status}
                  variant="dot"
                  size="lg"
                />
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

        <TrackOrderLocationsGrid
          location={location}
          restaurantName={restaurantName}
          restaurantCuisine={restaurantCuisine}
          partnerName={partnerName}
          customerName={customerName}
          partnerHasLocation={partnerHasLocation}
        />

        {showOtp && (
          <CustomerOtpCard
            otp={orderOtp?.otp}
            variant="compact"
            className="mt-4"
          />
        )}

        <TrackOrderMapSection
          location={location}
          partnerHasLocation={partnerHasLocation}
          lastUpdated={lastUpdated}
        />

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

        <div className="mt-5 flex flex-col gap-3 pb-8 sm:flex-row sm:justify-end">
          <Link
            href={orderDetailsPath(orderId ?? "")}
            className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-center text-sm font-semibold text-gray-700 transition hover:border-orange-300 hover:text-orange-600"
          >
            View Order Details
          </Link>

          <Link
            href={ROUTES.MY_ORDERS}
            className="rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    </main>
  );
}