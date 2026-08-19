"use client";

import { useCallback, useEffect, useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import { AuthHttpError } from "@/services/authFetch";
import {
  getDeliveryStats,
  type DeliveryDashboardStats,
} from "@/services/deliveryPartnerService";
import type { DeliveryPartner } from "@/types";

export const EMPTY_STATS: DeliveryDashboardStats = {
  pending: 0,
  completed: 0,
  earnings: 0,
  rating: 0,
  assigned_orders: 0,
  picked_up_orders: 0,
  delivered_today: 0,
  earnings_today: 0,
  total_deliveries: 0,
  recent_assigned_orders: [],
};

export const REFRESH_MS = 8000;

export function useDeliveryDashboard() {
  const [partner, setPartner] = useState<DeliveryPartner | null>(null);
  const [stats, setStats] = useState<DeliveryDashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const current = getDeliveryPartnerSession();
      if (current) {
        setPartner(current);
      }
    } catch (err) {
      console.error("Failed to load delivery partner:", err);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const currentPartner = getDeliveryPartnerSession();
      const phone = currentPartner?.phone;

      if (!phone) {
        setError("Delivery partner phone not found. Please log in again.");
        return;
      }

      const data = await getDeliveryStats(phone);

      setStats({
        ...EMPTY_STATS,
        ...data,
        recent_assigned_orders: data.recent_assigned_orders || [],
      });
      setError("");
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      if (err instanceof AuthHttpError && err.status === 401) {
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load delivery dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(loadDashboard, REFRESH_MS, {
    enabled: true,
    runImmediately: true,
  });

  const assigned = stats.assigned_orders ?? 0;
  const pickedUp = stats.picked_up_orders ?? 0;
  const deliveredToday = stats.delivered_today ?? 0;
  const earningsToday = stats.earnings_today ?? 0;
  const totalDeliveries = stats.total_deliveries ?? stats.completed ?? 0;
  const recent = stats.recent_assigned_orders || [];

  return {
    partner,
    stats,
    loading,
    error,
    assigned,
    pickedUp,
    deliveredToday,
    earningsToday,
    totalDeliveries,
    recent,
  };
}
