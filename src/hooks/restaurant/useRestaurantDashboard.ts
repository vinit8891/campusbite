"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { usePolling } from "@/hooks/usePolling";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import { ROUTES } from "@/lib/routes";
import { AuthHttpError, authJson } from "@/services/authFetch";
import {
  getRestaurantSubscriptionRevenueSummary,
  type RestaurantSubscriptionRevenueSummary,
} from "@/services/subscriptionService";
import type { ReviewItem } from "@/types";

export type DashboardData = {
  orders: number;
  revenue: number;
  menu_items: number;
  rating: number;
  pending_orders?: number;
  active_orders?: number;
  cooking_orders?: number;
  delivered_orders?: number;
  cancelled_orders?: number;
  today_orders?: number;
  today_revenue?: number;
  today_subscription_meals?: number;
  review_count?: number;
};

export type CountRow = {
  key: string;
  count: number;
};

export type TrendPoint = {
  date: string;
  revenue: number;
  orders: number;
};

export type TopItem = {
  name: string;
  orders: number;
};

export type AnalyticsOverview = {
  orders_by_status: CountRow[];
  orders_by_payment_method: CountRow[];
  orders_by_payment_status: CountRow[];
  revenue_last_7_days: number;
  revenue_last_30_days: number;
  revenue_trend_7d: TrendPoint[];
  top_selling_items: TopItem[];
  recent_reviews: ReviewItem[];
  reviews_summary: {
    average_rating: number;
    count: number;
  };
  average_order_value: number;
};

export type StatCard = {
  label: string;
  value: string;
  valueClass: string;
  hint?: string;
};

export function useRestaurantDashboard() {
  const router = useRouter();

  const [dashboard, setDashboard] = useState<DashboardData>({
    orders: 0,
    revenue: 0,
    menu_items: 0,
    rating: 0,
  });
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [subscriptionRevenue, setSubscriptionRevenue] =
    useState<RestaurantSubscriptionRevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const email = getRestaurantOwnerEmail();

      if (!email) {
        setError("Restaurant owner email not found. Please log in again.");
        router.replace(ROUTES.RESTAURANT_LOGIN);
        return;
      }

      const [dashboardData, analyticsData, subscriptionRevenueData] =
        await Promise.all([
          authJson<DashboardData>(`/dashboard/${encodeURIComponent(email)}`, {
            role: "restaurant_owner",
            cache: "no-store",
          }),
          authJson<AnalyticsOverview>(
            `/analytics/overview/${encodeURIComponent(email)}`,
            { role: "restaurant_owner", cache: "no-store" }
          ),
          getRestaurantSubscriptionRevenueSummary(email).catch(() => null),
        ]);

      setDashboard(dashboardData);
      setAnalytics(analyticsData);
      setSubscriptionRevenue(subscriptionRevenueData);
      setError("");
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) {
        return;
      }
      setError(
        err instanceof Error ? err.message : "Unable to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  usePolling(loadDashboard, 5000, {
    enabled: true,
    runImmediately: true,
  });

  const cards: StatCard[] = [
    {
      label: "Total Orders",
      value: String(dashboard.orders),
      valueClass: "text-orange-600",
    },
    {
      label: "Today's Orders",
      value: String(dashboard.today_orders ?? 0),
      valueClass: "text-orange-500",
    },
    {
      label: "Pending",
      value: String(dashboard.pending_orders ?? 0),
      valueClass: "text-amber-600",
      hint: "Awaiting acceptance",
    },
    {
      label: "In Progress",
      value: String(dashboard.active_orders ?? 0),
      valueClass: "text-blue-600",
      hint: "Preparing / out for delivery",
    },
    {
      label: "Delivered",
      value: String(dashboard.delivered_orders ?? 0),
      valueClass: "text-emerald-600",
    },
    {
      label: "Revenue",
      value: `₹${Number(dashboard.revenue || 0).toFixed(2)}`,
      valueClass: "text-green-600",
      hint: "From delivered orders",
    },
    {
      label: "Avg Order Value",
      value: `₹${Number(analytics?.average_order_value ?? 0).toFixed(2)}`,
      valueClass: "text-teal-600",
      hint: "Delivered orders only",
    },
    {
      label: "7-Day Revenue",
      value: `₹${Number(analytics?.revenue_last_7_days ?? 0).toFixed(2)}`,
      valueClass: "text-green-500",
    },
    {
      label: "30-Day Revenue",
      value: `₹${Number(analytics?.revenue_last_30_days ?? 0).toFixed(2)}`,
      valueClass: "text-green-700",
    },
    {
      label: "Menu Items",
      value: String(dashboard.menu_items),
      valueClass: "text-blue-600",
    },
    {
      label: "Rating",
      value: `⭐ ${dashboard.rating || 0}`,
      valueClass: "text-yellow-500",
      hint:
        (dashboard.review_count ?? 0) > 0
          ? `${dashboard.review_count} reviews`
          : "No reviews yet",
    },
    {
      label: "Cancelled",
      value: String(dashboard.cancelled_orders ?? 0),
      valueClass: "text-red-500",
    },
  ];

  const trend = analytics?.revenue_trend_7d || [];
  const maxTrendRevenue = Math.max(...trend.map((point) => point.revenue), 1);
  const topItems = analytics?.top_selling_items || [];
  const maxTop = Math.max(...topItems.map((item) => item.orders), 1);

  return {
    dashboard,
    analytics,
    subscriptionRevenue,
    loading,
    error,
    cards,
    trend,
    maxTrendRevenue,
    topItems,
    maxTop,
  };
}
