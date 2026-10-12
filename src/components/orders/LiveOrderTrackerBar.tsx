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
  const trackingUrl = orderId ? `/orders/${orderId}/track` : ROUTES.MY_ORDERS;

  // Immediate guard: Skip rendering and polling on non-customer, restricted, or dedicated order pages
  if (isRestricted || !isLoggedIn || !activeOrder || isAlreadyOnTrackingPage) {
    return null;
  }

  // -------------------------------------------------------------
  // ULTRA-COMPACT LIVE ACTIVITY DOCK (1-Row / 2-Line Pill)
  // -------------------------------------------------------------
  if (isWithin200m) {
    return (
      <aside
        role="alert"
        aria-live="assertive"
        data-testid="live-order-tracker-bar"
        data-proximity-alert="true"
        className="fixed bottom-4 inset-x-0 mx-auto w-[calc(100%-1.5rem)] max-w-md z-40 animate-in fade-in slide-in-from-bottom-5 duration-300"
      >
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-950/95 px-3.5 py-2.5 text-white shadow-2xl border border-amber-500/40 backdrop-blur-md ring-1 ring-amber-500/20">
          {/* Left: Compact Animated Icon */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-500/30 text-lg">
            🛵
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            </span>
          </div>

          {/* Center: Concise Live Status */}
          <Link
            href={trackingUrl}
            className="flex-1 min-w-0 pr-1 hover:opacity-95 transition-opacity"
            aria-label={`Courier Arriving! Rider is within 200m of ${hostelBlock}.`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 animate-pulse">
                Nearby • {distanceMeters ? `${distanceMeters}m` : "200m"}
              </span>
              <span className="text-xs font-bold text-zinc-100 truncate">
                Courier Arriving! Rider is within 200m
              </span>
            </div>
            <p className="text-[11px] text-amber-200/90 truncate mt-0.5">
              Head downstairs to the lobby now with your 4-digit OTP
            </p>
          </Link>

          {/* Right: Inline Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {displayOtp ? (
              <div className="flex items-center gap-1 rounded-xl bg-amber-400 text-stone-950 px-2.5 py-1.5 font-mono text-xs font-black shadow-xs">
                <KeyRound className="h-3 w-3 text-stone-950" />
                <span>OTP: {displayOtp}</span>
              </div>
            ) : null}

            <Link
              href={trackingUrl}
              className="shrink-0 flex items-center gap-1 rounded-xl bg-orange-500 hover:bg-orange-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 active:scale-95 transition-all"
              aria-label="Track live courier on map"
            >
              <span>Track</span>
              <span className="text-[10px]">→</span>
            </Link>
          </div>
        </div>
      </aside>
    );
  }

  // -------------------------------------------------------------
  // STANDARD ACTIVE ORDER PROGRESSION DOCK (1-Row / 2-Line Pill)
  // -------------------------------------------------------------
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="live-order-tracker-bar"
      className="fixed bottom-4 inset-x-0 mx-auto w-[calc(100%-1.5rem)] max-w-md z-40 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-950/95 px-3.5 py-2.5 text-white shadow-2xl border border-zinc-800/90 backdrop-blur-md">
        {/* Left: Compact Animated Icon */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-500/30 text-lg">
          🛵
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
        </div>

        {/* Center: Concise Live Status */}
        <Link
          href={trackingUrl}
          className="flex-1 min-w-0 pr-1 hover:opacity-95 transition-opacity"
          aria-label={`Track order status: ${statusText}`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
              {estimatedTime}
            </span>
            <span className="text-xs font-bold text-zinc-100 truncate">
              {statusText}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
            <span>{hostelBlock}</span>
            <span className="mx-1">•</span>
            <span className="truncate">{activeOrder.restaurant_name || "CampusBite"}</span>
            {displayOtp ? (
              <>
                <span className="mx-1">•</span>
                <span>Keep OTP ready</span>
              </>
            ) : null}
          </p>
        </Link>

        {/* Right: Inline Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {displayOtp ? (
            <button
              type="button"
              onClick={() => setShowOtp((prev) => !prev)}
              className={`shrink-0 flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                showOtp
                  ? "bg-amber-400/20 border border-amber-400/50 text-amber-300 shadow-xs"
                  : "bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300"
              }`}
              aria-label={showOtp ? `Handover OTP is ${displayOtp}` : "Show Handover OTP"}
            >
              <KeyRound className="h-3 w-3 text-amber-400" />
              <span className="font-mono">{showOtp ? `OTP: ${displayOtp}` : "Show OTP"}</span>
            </button>
          ) : null}

          <Link
            href={trackingUrl}
            className="shrink-0 flex items-center gap-1 rounded-xl bg-orange-500 hover:bg-orange-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 active:scale-95 transition-all"
            aria-label="Track live courier on map"
          >
            <span>Track</span>
            <span className="text-[10px]">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export const FloatingOrderBanner = LiveOrderTrackerBar;
export const ActiveOrderFloat = LiveOrderTrackerBar;
export default LiveOrderTrackerBar;
