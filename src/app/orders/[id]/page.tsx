"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { getOrderById } from "@/services/orderService";
import { AuthHttpError } from "@/services/authFetch";
import { usePolling } from "@/hooks/usePolling";
import { useOrderStatus, ORDER_STATUSES } from "@/hooks/order-details";
import type { Order } from "@/types/orders";
import { ROUTES } from "@/lib/routes";


import {
  OrderHeader,
  OrderItems,
  OrderSummary,
  DeliverySection,
  OrderTimelineSection,
  OrderActions,
} from "@/components/order-details";

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentStatusRef = useRef<HTMLDivElement | null>(null);

  const {
    isOrderActive,
    currentIndex,
    isPending,
    isDelivered,
    isCancelled,
    showRestaurantMap,
    estimatedDelivery,
    hasDeliveryLocation,
    hasRestaurantLocation,
  } = useOrderStatus(order);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;

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
  }, [orderId]);

  // Poll only while the order is active (5s interval, in-flight guard, auto-cleanup on unmount).
  usePolling(loadOrder, 5000, {
    enabled: Boolean(orderId) && isOrderActive,
    runImmediately: true,
  });

  useEffect(() => {
    if (!order) return;

    const currentIdx = ORDER_STATUSES.indexOf(order.status);

    if (currentIdx === -1 || order.status === "Cancelled") {
      return;
    }

    const timeout = setTimeout(() => {
      currentStatusRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);

    return () => clearTimeout(timeout);
  }, [order?.status]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-5xl rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
          <p className="mt-4 font-medium text-gray-600">Loading order...</p>
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
            href={ROUTES.MY_ORDERS}
            className="mt-6 inline-block rounded-full bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600"
          >
            Back to My Orders
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back */}
        <Link
          href={ROUTES.MY_ORDERS}
          className="inline-flex items-center text-sm font-medium text-gray-500 transition hover:text-orange-600"
        >
          ← Back to My Orders
        </Link>


        {/* Order Header & Restaurant Card */}
        <OrderHeader
          order={order}
          isCancelled={isCancelled}
          isDelivered={isDelivered}
          estimatedDelivery={estimatedDelivery}
          showRestaurantMap={showRestaurantMap}
          hasRestaurantLocation={hasRestaurantLocation}
        />

        {/* Status Timeline */}
        <OrderTimelineSection
          currentIndex={currentIndex}
          currentStatusRef={currentStatusRef}
          isCancelled={isCancelled}
        />

        {/* Delivery Partner, Live Location, & OTP */}
        <DeliverySection
          order={order}
          hasDeliveryLocation={hasDeliveryLocation}
        />

        {/* Ordered Items */}
        <OrderItems items={order.items} />

        {/* Delivery Address & Payment */}
        <OrderSummary order={order} />

        {/* Bottom Actions */}
        <OrderActions
          order={order}
          isPending={isPending}
          isDelivered={isDelivered}
          isCancelled={isCancelled}
          onRefreshOrder={loadOrder}
        />
      </div>
    </main>
  );
}