"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { usePolling } from "@/hooks/usePolling";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import { AuthHttpError } from "@/services/authFetch";
import { getCoordsSafe } from "@/lib/geolocation";
import {
  getMyDeliveries,
  updateDeliveryOrderStatus,
  updateLiveLocation,
  verifyDeliveryOTP,
  type MyDeliveriesQuery,
} from "@/services/deliveryService";
import type { DeliveryOrder } from "@/types";

export const DELIVERY_STATUS_OPTIONS = [
  "Assigned",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
] as const;

export function formatAssignedTime(order: DeliveryOrder) {
  const value =
    order.delivery_partner?.accepted_at || order.created_at || "";
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function useDeliveryOrders() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const [otpOrderId, setOtpOrderId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");

  const watchIdRef = useRef<number | null>(null);
  const ordersRef = useRef<DeliveryOrder[]>([]);
  const filtersRef = useRef({ q, status });
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    filtersRef.current = { q, status };
  }, [q, status]);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void loadOrders(currentFilters({ q }), { showLoading: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  function currentFilters(
    overrides: Partial<MyDeliveriesQuery> = {}
  ): MyDeliveriesQuery {
    const latest = filtersRef.current;
    return {
      q: (overrides.q ?? latest.q).trim() || undefined,
      status: (overrides.status ?? latest.status) || undefined,
      limit: 50,
    };
  }

  async function loadOrders(
    filters: MyDeliveriesQuery = currentFilters(),
    options: { showLoading?: boolean } = {}
  ) {
    if (options.showLoading) {
      setLoading(true);
    }

    try {
      const partner = getDeliveryPartnerSession();

      if (!partner?.phone) {
        setOrders([]);
        setError("Delivery partner phone not found. Please log in again.");
        return;
      }

      const data = await getMyDeliveries(partner.phone, filters);
      setOrders(data);
      setError("");
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) return;
      setError(err instanceof Error ? err.message : "Unable to load orders");
    } finally {
      setLoading(false);
    }
  }

  const pollDeliveries = useCallback(async () => {
    await loadOrders(currentFilters());
  }, []);

  usePolling(pollDeliveries, 5000, {
    enabled: true,
    runImmediately: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) return;
    if (watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const activeOrders = ordersRef.current.filter((order) =>
          ["Assigned", "Picked Up", "Out for Delivery"].includes(
            order.status || ""
          )
        );

        for (const order of activeOrders) {
          try {
            await updateLiveLocation(
              order._id,
              position.coords.latitude,
              position.coords.longitude
            );
          } catch (err) {
            console.error(err);
          }
        }
      },
      (err) => {
        console.error("GPS Error:", err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  async function updateStatus(id: string, nextStatus: string) {
    try {
      if (nextStatus === "Picked Up" || nextStatus === "Out for Delivery") {
        const coords = await getCoordsSafe(2500);
        if (coords.lat != null && coords.lng != null) {
          try {
            await updateLiveLocation(id, coords.lat, coords.lng);
          } catch (locErr) {
            console.warn("Could not push initial pickup location:", locErr);
          }
        } else {
          toast.info("Picked up (GPS offline)");
        }
      }

      await updateDeliveryOrderStatus(id, nextStatus);
      await loadOrders(currentFilters());

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("delivery_state_changed"));
      }
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) return;
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function verifyOTP() {
    if (!otpOrderId) return;

    try {
      setVerifying(true);
      setOtpError("");

      await verifyDeliveryOTP(otpOrderId, Number(otp));

      setOtp("");
      setOtpOrderId(null);

      await loadOrders(currentFilters());

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("delivery_state_changed"));
      }

      toast.success("Delivery completed successfully");
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setVerifying(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void loadOrders(currentFilters(), { showLoading: true });
  }

  return {
    orders,
    loading,
    error,
    q,
    setQ,
    status,
    setStatus,
    otpOrderId,
    setOtpOrderId,
    otp,
    setOtp,
    verifying,
    otpError,
    setOtpError,
    loadOrders,
    currentFilters,
    updateStatus,
    verifyOTP,
    handleSearchSubmit,
  };
}
