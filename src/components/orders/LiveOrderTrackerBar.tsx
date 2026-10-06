"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, KeyRound, Bike, Clock, BellRing, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getMyOrders, getCourierLiveLocation } from "@/services/orderService";
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
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/") ||
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
  const [isWithin200m, setIsWithin200m] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const vibrationTriggeredRef = useRef<boolean>(false);

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
        const orderId = active._id || (active as unknown as { id?: string }).id || "";
        if (typeof window !== "undefined" && orderId) {
          localStorage.setItem("cb_active_order_id", orderId);
        }

        // Check if order already has proximity flag
        const partner = active.delivery_partner as Record<string, unknown> | undefined;
        const within200 =
          Boolean(partner?.is_within_200m) ||
          (typeof partner?.distance_meters === "number" && partner.distance_meters <= 200);

        if (within200) {
          setIsWithin200m(true);
          setDistanceMeters((partner?.distance_meters as number) ?? 150);
          if (!vibrationTriggeredRef.current && typeof navigator !== "undefined" && navigator.vibrate) {
            vibrationTriggeredRef.current = true;
            try {
              navigator.vibrate([200, 100, 200]);
            } catch {}
          }
        } else if (
          orderId &&
          (active.status === "Out for Delivery" || active.status === "Picked Up" || active.status === "In Transit")
        ) {
          // Poll courier live location to check 200m proximity
          try {
            const loc = await getCourierLiveLocation(orderId);
            if (loc?.is_within_200m) {
              setIsWithin200m(true);
              setDistanceMeters(loc.distance_meters ?? null);
              if (!vibrationTriggeredRef.current && typeof navigator !== "undefined" && navigator.vibrate) {
                vibrationTriggeredRef.current = true;
                try {
                  navigator.vibrate([200, 100, 200]);
                } catch {}
              }
            } else {
              setIsWithin200m(false);
              setDistanceMeters(loc?.distance_meters ?? null);
            }
          } catch {}
        } else {
          setIsWithin200m(false);
        }
      } else {
        // Clear completed / cancelled orders from active cache and localStorage
        setActiveOrder(null);
        setIsWithin200m(false);
        vibrationTriggeredRef.current = false;
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
      setIsWithin200m(false);
      return;
    }

    void fetchActiveOrders();
    const interval = setInterval(() => {
      void fetchActiveOrders();
    }, 8000);

    return () => clearInterval(interval);
  }, [isLoggedIn, isRestricted, fetchActiveOrders]);

  const hostelBlock = useMemo(() => {
    if (!activeOrder) return "Hostel Lobby";
    return (
      (activeOrder as unknown as { hostel_block?: string }).hostel_block ||
      activeOrder.address?.split(",")[0]?.trim() ||
      "Hostel Lobby"
    );
  }, [activeOrder]);

  const displayOtp = useMemo(() => {
    if (!activeOrder) return null;
    return (
      (activeOrder as unknown as { handover_otp?: string | number })?.handover_otp != null
        ? String((activeOrder as unknown as { handover_otp?: string | number }).handover_otp)
        : activeOrder.delivery_otp != null
        ? String(activeOrder.delivery_otp)
        : (activeOrder as unknown as { otp?: string | number })?.otp != null
        ? String((activeOrder as unknown as { otp?: string | number }).otp)
        : null
    );
  }, [activeOrder]);

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

  // Immediate guard: Skip rendering and polling on non-customer, restricted, or dedicated order pages
  if (isRestricted || !isLoggedIn || !activeOrder || isAlreadyOnTrackingPage) {
    return null;
  }

  // -------------------------------------------------------------
  // HIGH-CONTRAST 200M PROXIMITY ALERT BANNER
  // -------------------------------------------------------------
  if (isWithin200m) {
    return (
      <aside
        role="alert"
        aria-live="assertive"
        data-testid="live-order-tracker-bar"
        data-proximity-alert="true"
        className="fixed bottom-5 inset-x-3 max-w-xl mx-auto z-50 rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 p-1 shadow-2xl shadow-orange-950/30 animate-in fade-in slide-in-from-bottom-5 duration-300"
      >
        <div className="rounded-[22px] bg-stone-950/95 backdrop-blur-xl p-3.5 sm:p-4 text-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border border-amber-400/40">
          <Link
            href={trackingUrl}
            className="flex items-start gap-3 min-w-0 flex-1 hover:opacity-95 transition-opacity"
            aria-label={`Courier Arriving! Rider is within 200m of ${hostelBlock}.`}
          >
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-stone-950 shadow-lg shadow-orange-500/30 animate-bounce">
              <Bike className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-90" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 ring-2 ring-stone-900 items-center justify-center text-[9px] font-black text-white">
                  !
                </span>
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 border border-amber-400/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 animate-pulse">
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  Within 200m Dropoff
                </span>
              </div>
              <h4 className="font-extrabold text-white text-sm sm:text-base leading-snug mt-1">
                🛵 Courier Arriving! Rider is within 200m of {hostelBlock}.
              </h4>
              <p className="text-xs text-amber-200/90 font-medium mt-0.5">
                Head downstairs to the lobby now with your 4-digit OTP {displayOtp ? `(${displayOtp})` : ""}.
              </p>
            </div>
          </Link>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/10">
            {displayOtp ? (
              <div className="flex items-center gap-1.5 rounded-xl bg-amber-400 text-stone-950 px-3 py-1.5 font-mono text-xs font-black shadow-md">
                <KeyRound className="h-3.5 w-3.5 text-stone-950" />
                <span>OTP: {displayOtp}</span>
              </div>
            ) : null}

            <Link
              href={trackingUrl}
              className="flex h-9 items-center gap-1 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors"
              aria-label="Track live courier on map"
            >
              <span>Track</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </aside>
    );
  }

  // -------------------------------------------------------------
  // STANDARD ACTIVE ORDER PROGRESSION BAR
  // -------------------------------------------------------------
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
