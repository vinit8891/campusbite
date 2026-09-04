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
    isPortalOrAuth("/reset-password")
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

  const isRestricted = useMemo(() => {
    return isRestrictedPath(pathname) || isNonCustomerRole();
  }, [pathname]);

  const fetchActiveOrders = useCallback(async () => {
    if (!isLoggedIn || isRestricted) {
      setActiveOrder(null);
      return;
    }

    try {
      setLoading(true);
      const orders = await getMyOrders();
      // Find the most recent active progressing order
      const active = (orders || []).find((order) =>
        isActiveOrderStatus(order.status)
      );
      setActiveOrder(active || null);
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
  const otpCode = activeOrder?.delivery_otp ? String(activeOrder.delivery_otp) : "4821";

  // Immediate guard: Skip rendering and polling on non-customer / restricted pages
  if (isRestricted || !isLoggedIn || !activeOrder) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="live-order-tracker-bar"
      className="fixed bottom-6 inset-x-4 max-w-lg mx-auto z-40 bg-gray-900/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-white/10 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      {/* Left side: Animated Pulse + Status + Estimated Time */}
      <Link
        href={trackingUrl}
        className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-95 transition-opacity"
        aria-label={`Track order status: ${statusText}`}
      >
        <div className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 border border-emerald-500/30">
          <Bike className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-gray-900" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-white truncate">
              {statusText}
            </h4>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <Clock className="h-3 w-3" />
              {estimatedTime}
            </span>
            <span>•</span>
            <span className="truncate">{activeOrder.restaurant_name || "CampusBite"}</span>
          </div>
        </div>
      </Link>

      {/* Right side: Interactive OTP Chip & Track Navigation */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setShowOtp((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
            showOtp
              ? "bg-amber-400/20 text-amber-300 border-amber-400/40 ring-2 ring-amber-400/20"
              : "bg-white/10 hover:bg-white/15 text-gray-200 border-white/10"
          }`}
          aria-label={showOtp ? `Handover OTP is ${otpCode}` : "Show Handover OTP"}
        >
          <KeyRound className="h-3.5 w-3.5 text-amber-400" />
          <span>{showOtp ? `OTP: ${otpCode}` : "Show OTP"}</span>
        </button>

        <Link
          href={trackingUrl}
          className="flex items-center justify-center h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
          aria-label="View live tracking details"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default LiveOrderTrackerBar;
