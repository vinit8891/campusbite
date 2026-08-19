"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePolling } from "@/hooks/usePolling";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import { ROUTES } from "@/lib/routes";
import { AuthHttpError, authJson } from "@/services/authFetch";
import type { Order } from "@/types";

export type OrdersQuery = {
  status?: string;
  payment_status?: string;
  payment_method?: string;
  q?: string;
  limit?: number;
};

export const RESTAURANT_ORDER_STATUSES = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready for Pickup",
  "Assigned",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
] as const;

export const RESTAURANT_PAYMENT_STATUSES = [
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
] as const;

export const RESTAURANT_PAYMENT_METHODS = [
  { value: "cod", label: "COD" },
  { value: "online", label: "Online" },
] as const;

export function useRestaurantOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const filtersRef = useRef({
    q,
    status,
    paymentStatus,
    paymentMethod,
  });

  useEffect(() => {
    filtersRef.current = { q, status, paymentStatus, paymentMethod };
  }, [q, status, paymentStatus, paymentMethod]);

  function buildPath(filters: OrdersQuery) {
    const email = getRestaurantOwnerEmail();
    if (!email) return null;

    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.payment_status) {
      params.set("payment_status", filters.payment_status);
    }
    if (filters.payment_method) {
      params.set("payment_method", filters.payment_method);
    }
    if (filters.q?.trim()) params.set("q", filters.q.trim());
    params.set("limit", String(filters.limit ?? 50));

    const query = params.toString();
    return `/orders/restaurant/${encodeURIComponent(email)}?${query}`;
  }

  function currentFilters(overrides: Partial<OrdersQuery> = {}): OrdersQuery {
    const latest = filtersRef.current;
    return {
      q: (overrides.q ?? latest.q).trim() || undefined,
      status: (overrides.status ?? latest.status) || undefined,
      payment_status:
        (overrides.payment_status ?? latest.paymentStatus) || undefined,
      payment_method:
        (overrides.payment_method ?? latest.paymentMethod) || undefined,
      limit: 50,
    };
  }

  async function fetchOrders(
    filters: OrdersQuery = currentFilters(),
    options: { showLoading?: boolean } = {}
  ) {
    if (options.showLoading) {
      setLoading(true);
    }

    try {
      const path = buildPath(filters);

      if (!path) {
        setError("Restaurant owner email not found. Please log in again.");
        router.replace(ROUTES.RESTAURANT_LOGIN);
        return;
      }

      const data = await authJson<Order[]>(path, {
        role: "restaurant_owner",
        cache: "no-store",
      });

      setOrders(data);
      setError("");
    } catch (err) {
      console.error("Restaurant Orders Error:", err);
      if (err instanceof AuthHttpError && err.status === 401) {
        return;
      }
      setError(
        err instanceof Error ? err.message : "Unable to load orders"
      );
    } finally {
      setLoading(false);
    }
  }

  const pollOrders = useCallback(async () => {
    await fetchOrders(currentFilters());
  }, []);

  usePolling(pollOrders, 5000, {
    enabled: true,
    runImmediately: true,
  });

  async function updateStatus(id: string, nextStatus: string) {
    try {
      await authJson(`/orders/${id}/${encodeURIComponent(nextStatus)}`, {
        role: "restaurant_owner",
        method: "PUT",
      });

      toast.success(`Order updated to ${nextStatus}`, {
        description: "The customer will be notified.",
      });

      await fetchOrders(currentFilters());
    } catch (error) {
      console.error("Update Status Error:", error);
      if (error instanceof AuthHttpError && error.status === 401) {
        return;
      }
      alert(
        error instanceof Error ? error.message : "Failed to update status"
      );
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void fetchOrders(currentFilters(), { showLoading: true });
  }

  return {
    orders,
    loading,
    error,
    q,
    setQ,
    status,
    setStatus,
    paymentStatus,
    setPaymentStatus,
    paymentMethod,
    setPaymentMethod,
    fetchOrders,
    updateStatus,
    handleSearchSubmit,
    currentFilters,
  };
}
