"use client";

import { useEffect, useRef, useState } from "react";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import { AuthHttpError } from "@/services/authFetch";
import {
  getDeliveryHistory,
  type DeliveryHistoryQuery,
} from "@/services/deliveryService";
import {
  getDeliveryStats,
  type DeliveryDashboardStats,
} from "@/services/deliveryPartnerService";

export type HistoryOrder = {
  _id: string;
  customer_name?: string;
  customer_email?: string;
  phone?: string;
  address?: string;
  restaurant_email?: string;
  total?: number;
  status?: string;
  payment_method?: string;
  delivered_at?: string;
  created_at?: string;
  delivery_earnings?: number | null;
  delivery_earning?: number | null;
  partner_earnings?: number | null;
};

export function formatDeliveredTime(order: HistoryOrder) {
  const value = order.delivered_at || order.created_at || "";
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function storedEarnings(order: HistoryOrder): number | null {
  const value =
    order.delivery_earnings ??
    order.delivery_earning ??
    order.partner_earnings;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function useDeliveryHistory() {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [stats, setStats] = useState<DeliveryDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtersRef = useRef({ q, fromDate, toDate, page });
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    filtersRef.current = { q, fromDate, toDate, page };
  }, [q, fromDate, toDate, page]);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setPage(1);
      void loadPage(currentFilters({ q, fromDate, toDate, page: 1 }), {
        showLoading: false,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [q, fromDate, toDate]);

  function currentFilters(
    overrides: Partial<DeliveryHistoryQuery & { fromDate?: string; toDate?: string; page?: number }> = {}
  ): DeliveryHistoryQuery {
    const latest = filtersRef.current;
    return {
      q: (overrides.q ?? latest.q).trim() || undefined,
      from_date: (overrides.from_date ?? overrides.fromDate ?? latest.fromDate) || undefined,
      to_date: (overrides.to_date ?? overrides.toDate ?? latest.toDate) || undefined,
      page: overrides.page ?? latest.page,
      limit: 20,
    };
  }

  async function loadPage(
    filters: DeliveryHistoryQuery = currentFilters(),
    options: { showLoading?: boolean } = {}
  ) {
    if (options.showLoading) {
      setLoading(true);
    }

    try {
      const partner = getDeliveryPartnerSession();
      const phone = partner?.phone;

      const historyPromise = getDeliveryHistory(filters);
      const statsPromise = phone
        ? getDeliveryStats(phone)
        : Promise.resolve(null);

      const [history, nextStats] = await Promise.all([
        historyPromise,
        statsPromise,
      ]);

      setOrders(history.items);
      setPage(history.page);
      setPages(history.pages);
      setTotal(history.total);
      if (nextStats) {
        setStats(nextStats);
      }
      setError("");
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) return;
      setError(
        err instanceof Error ? err.message : "Unable to load delivery history"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage(currentFilters({ page: 1 }), { showLoading: true });
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    void loadPage(currentFilters({ page: 1 }), { showLoading: true });
  }

  const totalDeliveries = stats?.total_deliveries ?? stats?.completed ?? 0;
  const weekDeliveries = stats?.deliveries_this_week ?? 0;
  const monthDeliveries = stats?.deliveries_this_month ?? 0;
  const showEarningsColumn = orders.some(
    (order) => storedEarnings(order) !== null
  );

  return {
    orders,
    stats,
    loading,
    error,
    page,
    setPage,
    pages,
    total,
    q,
    setQ,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    loadPage,
    currentFilters,
    handleSearchSubmit,
    totalDeliveries,
    weekDeliveries,
    monthDeliveries,
    showEarningsColumn,
  };
}
