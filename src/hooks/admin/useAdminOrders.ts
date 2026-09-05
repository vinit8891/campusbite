"use client";

import { useEffect, useState } from "react";
import {
  AuthHttpError,
  getAdminOrders,
  type AdminOrder,
  type AdminOrdersQuery,
} from "@/services/adminService";

export const ADMIN_ORDER_STATUSES = [
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

export const ADMIN_PAYMENT_STATUSES = [
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
] as const;

export const ADMIN_PAYMENT_METHODS = [
  { value: "cod", label: "COD" },
  { value: "online", label: "Online" },
] as const;

export function useAdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  async function fetchOrders(filters: AdminOrdersQuery) {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminOrders({
        ...filters,
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
      });
      setOrders(data.items);
      setPage(data.page);
      setPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      if (err instanceof AuthHttpError && err.status === 401) {
        return;
      }
      setError(
        err instanceof Error ? err.message : "Unable to load orders"
      );
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  function currentFilters(overrides: Partial<AdminOrdersQuery> = {}) {
    return {
      q: (overrides.q ?? q).trim() || undefined,
      status: (overrides.status ?? status) || undefined,
      payment_status:
        (overrides.payment_status ?? paymentStatus) || undefined,
      payment_method:
        (overrides.payment_method ?? paymentMethod) || undefined,
      page: overrides.page ?? page,
      limit: 20,
    };
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await getAdminOrders({ page: 1, limit: 20 });
        if (cancelled) return;
        setOrders(data.items);
        setPage(data.page);
        setPages(data.pages);
        setTotal(data.total);
        setError("");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AuthHttpError && err.status === 401) {
          return;
        }
        setError(
          err instanceof Error ? err.message : "Unable to load orders"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    void fetchOrders(currentFilters({ page: 1 }));
  }

  return {
    orders,
    setOrders,
    loading,
    error,
    page,
    setPage,
    pages,
    total,
    q,
    setQ,
    status,
    setStatus,
    paymentStatus,
    setPaymentStatus,
    paymentMethod,
    setPaymentMethod,
    fetchOrders,
    currentFilters,
    handleSearchSubmit,
  };
}

