"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, KeyRound, Bike, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getMyOrders } from "@/services/orderService";
import { isActiveOrderStatus } from "@/lib/orderDomain";
import { trackOrderPath, ROUTES } from "@/lib/routes";
import type { Order } from "@/types";

export function isRestrictedPath(pathname: string): boolean {
  if (!pathname) return false;

  const isPortalOrAuth = (prefix: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`);

  return (
    isPortalOrAuth("/admin") ||
    isPortalOrAuth("/restaurant") ||
    isPortalOrAuth("/delivery") ||
    isPortalOrAuth("/login") ||
    isPortalOrAuth("/register") ||
    isPortalOrAuth("/forgot-password") ||
    isPortalOrAuth("/reset-password") ||
    pathname.startsWith("/orders/") ||
    pathname.startsWith("/track-order/")
  );
}

export function isNonCustomerRole(): boolean {
  if (typeof document === "undefined") return false;
  const match = document.cookie.match(/(?:^|;\s*)cb_role=([^;]+)/);
  const cookieRole = match ? decodeURIComponent(match[1]) : null;
  if (
    cookieRole &&
    ["admin", "restaurant_owner", "delivery_partner"].includes(cookieRole)
  ) {
    return true;
  }
  return false;
}

export function LiveOrderTrackerBar() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAlreadyOnTrackingPage = useMemo(() => {
    return (
      Boolean(pathname) &&
      (pathname.startsWith("/orders/") || pathname.startsWith("/track-order/"))
    );
  }, [pathname]);

  const isRestricted = useMemo(() => {
    return (
      isRestrictedPath(pathname) ||
      isNonCustomerRole() ||
      isAlreadyOnTrackingPage
    );
  }, [pathname, isAlreadyOnTrackingPage]);

  const fetchActiveOrders = useCallback(async () => {
    if (!isLoggedIn || isRestricted) {
      setActiveOrder(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("cb_active_order_id");
        localStorage.removeItem("cb_active_order");
      }
      return;
    }

    try {
      setLoading(true);
      const orders = await getMyOrders();
      // Find the most recent active progressing order
      const active = (orders || []).find((order) =>
        isActiveOrderStatus(order.status)
      );

      if (active) {
        setActiveOrder(active);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "cb_active_order_id",
            active._id || (active as unknown as { id?: string }).id || ""
          );
        }
      } else {
        // Clear completed / cancelled orders from active cache and localStorage
        setActiveOrder(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("cb_active_order_id");
          localStorage.removeItem("cb_active_order");
        }
      }
    } catch {
      // Silently handle background polling error
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, isRestricted]);

  useEffect(() => {
    if (!isLoggedIn || isRestricted) {
      setActiveOrder(null);
      return;
    }

    void fetchActiveOrders();
    const interval = setInterval(() => {
      void fetchActiveOrders();
    }, 8000);

    return () => clearInterval(interval);
  }, [isLoggedIn, isRestricted, fetchActiveOrders]);

  const statusText = useMemo(() => {
    if (!activeOrder) return "";

    const partnerName = activeOrder.delivery_partner?.name;
    const status = activeOrder.status;

    if (status === "Out for Delivery" || status === "Picked Up") {
      return partnerName
        ? `Out for delivery with ${partnerName}`
        : "Out for delivery to your hostel";
    }

    if (status === "Preparing" || status === "Accepted") {
      return activeOrder.restaurant_name
        ? `Preparing at ${activeOrder.restaurant_name}`
        : "Your order is being prepared";
    }

    if (status === "Ready for Pickup") {
      return "Ready for rider pickup";
    }

    return `Order ${status}`;
  }, [activeOrder]);

  const estimatedTime = useMemo(() => {
    if (!activeOrder) return "15-20 min";
    return activeOrder.estimated_time || activeOrder.estimated_delivery || "15-20 min";
  }, [activeOrder]);

  const orderId = activeOrder?._id || activeOrder?.id || "";
  const trackingUrl = orderId ? trackOrderPath(orderId) : ROUTES.MY_ORDERS;
  const displayOtp =
    activeOrder?.delivery_otp != null
      ? String(activeOrder.delivery_otp)
      : (activeOrder as unknown as { otp?: string | number })?.otp != null
      ? String((activeOrder as unknown as { otp?: string | number }).otp)
      : null;

  // Immediate guard: Skip rendering and polling on non-customer, restricted, or dedicated order pages
  if (isRestricted || !isLoggedIn || !activeOrder || isAlreadyOnTrackingPage) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="live-order-tracker-bar"
      className="fixed bottom-6 inset-x-4 max-w-lg mx-auto z-40 bg-white/95 backdrop-blur-md text-gray-900 rounded-2xl p-3.5 shadow-xl shadow-orange-950/10 border border-orange-200/80 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      {/* Left side: Vehicle Icon Box + Pulse Indicator + Status + ETA */}
      <Link
        href={trackingUrl}
        className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-90 transition-opacity"
        aria-label={`Track order status: ${statusText}`}
      >
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/20">
          <Bike className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 text-sm truncate">
              {statusText}
            </h4>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center gap-1 font-medium text-orange-600">
              <Clock className="h-3 w-3" />
              {estimatedTime}
            </span>
            <span>•</span>
            <span className="truncate">{activeOrder.restaurant_name || "CampusBite"}</span>
          </div>
        </div>
      </Link>

      {/* Right side: Interactive "Show OTP" Chip & Tracking Navigation Chevron */}
      <div className="flex items-center gap-2 shrink-0">
        {displayOtp ? (
          <button
            type="button"
            onClick={() => setShowOtp((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
              showOtp
                ? "bg-orange-100 border-orange-300 text-orange-800 ring-2 ring-orange-400/20 shadow-xs"
                : "bg-orange-50 border-orange-200/80 text-orange-700 hover:bg-orange-100"
            }`}
            aria-label={showOtp ? `Handover OTP is ${displayOtp}` : "Show Handover OTP"}
          >
            <KeyRound className="h-3.5 w-3.5 text-orange-600" />
            <span>{showOtp ? `OTP: ${displayOtp}` : "Show OTP"}</span>
          </button>
        ) : null}

        <Link
          href={trackingUrl}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors"
          aria-label="View live tracking details"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default LiveOrderTrackerBar;
