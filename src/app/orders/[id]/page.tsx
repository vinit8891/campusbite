"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { getOrderById, findOrderInStorage } from "@/services/orderService";
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
  const orderId = (params?.id as string) || "";

  const [order, setOrder] = useState<Order | null>(() => {
    if (typeof window !== "undefined") {
      return findOrderInStorage(orderId);
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined" && findOrderInStorage(orderId)) {
      return false;
    }
    return true;
  });
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
    if (typeof window === "undefined") return;

    // Check storage synchronously
    const cached = findOrderInStorage(orderId);
    if (cached) {
      setOrder(cached);
      setLoading(false);
      return;
    }

    // Fallback: If orderId is empty, hydrating, or 'last', load cb_last_order
    if (!orderId || orderId === "undefined" || orderId === "null" || orderId === "last" || orderId === "latest") {
      try {
        const lastRaw = localStorage.getItem("cb_last_order");
        if (lastRaw && lastRaw !== "undefined" && lastRaw !== "null") {
          const last = JSON.parse(lastRaw);
          if (last) {
            setOrder(last);
            setLoading(false);
          }
        }
      } catch (_) {}
    }
  }, [orderId]);

  const loadOrder = useCallback(async () => {
    const isInvalidId = !orderId || orderId === "undefined" || orderId === "null" || orderId === "last" || orderId === "latest";

    // 1. If already loaded and matching in state
    if (order && !isInvalidId && (order._id === orderId || (order as unknown as { id?: string }).id === orderId)) {
      setLoading(false);
      return;
    }

    // 2. Synchronous storage check first
    const cached = findOrderInStorage(orderId);
    if (cached) {
      setOrder(cached);
      setError("");
      setLoading(false);
      if (isInvalidId) return;
    }

    if (isInvalidId) {
      if (cached) {
        setOrder(cached);
        setError("");
        setLoading(false);
        return;
      }
      setLoading(false);
      setError("Order not found.");
      return;
    }

    try {
      // 3. Fetch from backend with strict 2-second timeout
      const data = await getOrderById(orderId);
      if (data) {
        setOrder(data);
        setError("");
        return;
      }
    } catch (err) {
      console.warn("Primary order fetch failed, attempting storage fallback:", err);

      const fallback = findOrderInStorage(orderId);
      if (fallback) {
        setOrder(fallback);
        setError("");
        setLoading(false);
        return;
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
    enabled: Boolean(orderId) && orderId !== "undefined" && orderId !== "last" && isOrderActive,
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

  // Split Loading from Missing Order (Prevents Render Trap)
  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-12 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-stone-200/80 max-w-md w-full text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-orange-600" />
          <p className="mt-2 text-sm text-gray-500">Loading order...</p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-12 flex items-center justify-center">
        <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-stone-200/80 max-w-md w-full">
          <div className="text-4xl mb-3">😕</div>
          <h3 className="text-lg font-bold text-gray-900">Order Not Found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {error || "We couldn't retrieve this order's details."}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm transition cursor-pointer"
            >
              Return to Home
            </button>
            <Link
              href={ROUTES.MY_ORDERS}
              className="mt-4 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-medium text-sm transition text-center"
            >
              My Orders
            </Link>
          </div>
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