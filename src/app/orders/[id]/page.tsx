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

  // Instant mount cache check for zero-latency initial render
  useEffect(() => {
    if (order || !orderId || typeof window === "undefined") return;
    try {
      const cachedRaw = localStorage.getItem("cb_last_order");
      if (cachedRaw) {
        const cached: Order = JSON.parse(cachedRaw);
        if (
          cached &&
          (cached._id === orderId ||
            (cached as unknown as { id?: string }).id === orderId ||
            cached._id?.slice(-8) === orderId ||
            orderId === "latest" ||
            orderId === "last")
        ) {
          setOrder(cached);
          setLoading(false);
        }
      }
    } catch {
      // ignore JSON parse error
    }
  }, [orderId, order]);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    // 1. Check if already loaded in state
    if (
      order &&
      (order._id === orderId ||
        (order as unknown as { id?: string }).id === orderId)
    ) {
      setLoading(false);
      return;
    }

    try {
      // 2. Fetch from backend / GET /api/orders/[id]
      const data = await getOrderById(orderId);
      if (data) {
        setOrder(data);
        setError("");
        return;
      }
    } catch (err) {
      console.warn("Primary order fetch failed, attempting local fallback:", err);

      // 3. Fallback: If the API returns 404, fails, or is in mock mode, read localStorage.getItem('cb_last_order')
      if (typeof window !== "undefined") {
        try {
          const cachedRaw = localStorage.getItem("cb_last_order");
          if (cachedRaw) {
            const cached: Order = JSON.parse(cachedRaw);
            if (
              cached &&
              (cached._id === orderId ||
                (cached as unknown as { id?: string }).id === orderId ||
                cached._id?.slice(-8) === orderId ||
                orderId === "latest" ||
                orderId === "last")
            ) {
              setOrder(cached);
              setError("");
              return;
            }
          }
        } catch {
          // ignore
        }
      }

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
  }, [orderId, order]);

  // Poll only while the order is active (5s interval, in-flight guard, auto-cleanup on unmount).
  usePolling(loadOrder, 5000, {
    enabled: Boolean(orderId) && isOrderActive,
    runImmediately: true,
  });


  // Guarded IntersectionObserver and auto-scroll for active order status
  useEffect(() => {
    if (!order) return;

    const currentIdx = ORDER_STATUSES.indexOf(order.status);

    if (currentIdx === -1 || order.status === "Cancelled" || isDelivered) {
      return;
    }

    const timeout = setTimeout(() => {
      currentStatusRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);

    let observer: IntersectionObserver | null = null;
    if (typeof window !== "undefined" && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Status element is visible in viewport
            }
          });
        },
        { threshold: 0.1 }
      );

      if (currentStatusRef.current && currentStatusRef.current instanceof Element) {
        observer.observe(currentStatusRef.current);
      }
    }

    return () => {
      clearTimeout(timeout);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [order, isDelivered]);

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

        {/* Dedicated Celebratory Delivered Banner */}
        {isDelivered && (
          <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white shadow-xl sm:p-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-inner backdrop-blur-md">
                  🎉
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-wide uppercase text-white backdrop-blur-xs">
                    ✓ Delivered
                  </span>
                  <h1 className="mt-1.5 text-2xl font-extrabold sm:text-3xl tracking-tight">
                    Order Delivered! Enjoy your meal
                  </h1>
                  <p className="mt-1 text-sm text-emerald-100">
                    Delivered to {order.address || "your campus drop location"} • Receipt #{order._id.slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start sm:items-end rounded-2xl bg-white/10 p-3.5 backdrop-blur-sm">
                <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Delivered Time</span>
                <span className="text-base font-bold text-white">
                  {order.delivered_at
                    ? new Date(order.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : "Completed"}
                </span>
              </div>
            </div>
          </section>
        )}

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

        {/* Delivery Partner, Live Location, & OTP (Only shown when not delivered) */}
        {!isDelivered && (
          <DeliverySection
            order={order}
            hasDeliveryLocation={hasDeliveryLocation}
          />
        )}

        {/* Ordered Items with Calibrated Prices */}
        <OrderItems items={order.items} />

        {/* Delivery Destination & Full Itemized Payment Breakdown */}
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