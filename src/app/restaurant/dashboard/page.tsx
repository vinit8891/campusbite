"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import {
  formatPaymentMethod,
  formatPaymentStatus,
} from "@/lib/paymentLabels";
import { AuthHttpError, authJson } from "@/services/authFetch";
import {
  getRestaurantSubscriptionRevenueSummary,
  type RestaurantSubscriptionRevenueSummary,
} from "@/services/subscriptionService";

type DashboardData = {
  orders: number;
  revenue: number;
  menu_items: number;
  rating: number;
  pending_orders?: number;
  active_orders?: number;
  delivered_orders?: number;
  cancelled_orders?: number;
  today_orders?: number;
  today_revenue?: number;
  today_subscription_meals?: number;
  review_count?: number;
};

type CountRow = {
  key: string;
  count: number;
};

type TrendPoint = {
  date: string;
  revenue: number;
  orders: number;
};

type TopItem = {
  name: string;
  orders: number;
};

type ReviewItem = {
  id: string;
  customer_name: string;
  rating: number;
  review: string;
};

type AnalyticsOverview = {
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

type StatCard = {
  label: string;
  value: string;
  valueClass: string;
  hint?: string;
};

function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-36 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    </div>
  );
}

function ProgressList({
  rows,
  labelFor,
  emptyText,
}: {
  rows: CountRow[];
  labelFor: (key: string) => string;
  emptyText: string;
}) {
  if (!rows.length) {
    return <p className="text-sm text-gray-500">{emptyText}</p>;
  }

  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={`${row.key}-${index}`}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="font-medium">{labelFor(row.key)}</span>
            <span className="font-semibold">{row.count}</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100">
            <div
              className="h-2.5 rounded-full bg-orange-500"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const email = getRestaurantOwnerEmail();

        if (!email) {
          setError("Restaurant owner email not found. Please log in again.");
          router.replace("/restaurant/login");
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

        if (cancelled) return;

        setDashboard(dashboardData);
        setAnalytics(analyticsData);
        setSubscriptionRevenue(subscriptionRevenueData);
        setError("");
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        if (err instanceof AuthHttpError && err.status === 401) {
          return;
        }
        setError(
          err instanceof Error ? err.message : "Unable to load dashboard"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    const interval = setInterval(() => {
      void load();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);

  if (loading) {
    return <DashboardSkeleton />;
  }

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

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold">Restaurant Dashboard</h1>
        <p className="mt-2 text-gray-500">
          Live snapshot of orders, revenue, and menu performance
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="bg-white shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle className="text-gray-700">{card.label}</CardTitle>
              {card.hint && (
                <CardDescription>{card.hint}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <p className={`text-4xl font-bold ${card.valueClass}`}>
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}

        <Link href="/restaurant/dashboard/orders" className="block">
          <Card className="h-full bg-white shadow-sm transition hover:border-orange-300 hover:shadow-md">
            <CardHeader className="pb-0">
              <CardTitle className="text-gray-700">
                Today&apos;s Subscription Meals
              </CardTitle>
              <CardDescription>
                Auto-generated mess orders for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-orange-600">
                {dashboard.today_subscription_meals ?? 0}
              </p>
              <p className="mt-2 text-sm text-orange-700">
                View in Restaurant Orders →
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/restaurant/dashboard/subscriptions" className="block">
          <Card className="h-full bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-md">
            <CardHeader className="pb-0">
              <CardTitle className="text-gray-700">
                Subscription Revenue
              </CardTitle>
              <CardDescription>
                Active plans and subscription billing (read-only)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Active subscriptions</span>
                <span className="font-semibold">
                  {subscriptionRevenue?.active_subscriptions ?? 0}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Monthly revenue</span>
                <span className="font-semibold text-emerald-700">
                  ₹
                  {Number(
                    subscriptionRevenue?.monthly_subscription_revenue ?? 0
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Pending payments</span>
                <span className="font-semibold text-amber-700">
                  {subscriptionRevenue?.pending_subscription_payments ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Trend (7 days)</CardTitle>
            <CardDescription>
              Delivered-order revenue by day
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trend.every((point) => point.revenue === 0) ? (
              <p className="text-sm text-gray-500">
                No delivered revenue in the last 7 days yet.
              </p>
            ) : (
              <div className="flex h-48 items-end gap-2">
                {trend.map((point) => (
                  <div
                    key={point.date}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div
                      className="w-full rounded-t-md bg-orange-500"
                      style={{
                        height: `${Math.max(
                          (point.revenue / maxTrendRevenue) * 100,
                          point.revenue > 0 ? 8 : 2
                        )}%`,
                      }}
                      title={`₹${point.revenue.toFixed(2)} · ${point.orders} orders`}
                    />
                    <span className="text-[10px] text-gray-500">
                      {point.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Current order mix</CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressList
              rows={analytics?.orders_by_status || []}
              labelFor={(key) => key}
              emptyText="No orders yet."
            />
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Payment Breakdown</CardTitle>
            <CardDescription>Method and payment status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-600">
                By method
              </h3>
              <ProgressList
                rows={analytics?.orders_by_payment_method || []}
                labelFor={(key) => formatPaymentMethod(key)}
                emptyText="No payment data yet."
              />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-600">
                By status
              </h3>
              <ProgressList
                rows={analytics?.orders_by_payment_status || []}
                labelFor={(key) =>
                  formatPaymentStatus(key, "online")
                }
                emptyText="No payment status data yet."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
            <CardDescription>Top 5 from delivered orders</CardDescription>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <p className="text-sm text-gray-500">
                No delivered orders yet.
              </p>
            ) : (
              <div className="space-y-5">
                {topItems.map((item, index) => (
                  <div key={item.name}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="font-semibold">
                        #{index + 1} {item.name}
                      </span>
                      <span className="font-bold">{item.orders} sold</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100">
                      <div
                        className="h-2.5 rounded-full bg-orange-500"
                        style={{
                          width: `${(item.orders / maxTop) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Recent Reviews</CardTitle>
          <CardDescription>
            Average{" "}
            {analytics?.reviews_summary.average_rating ?? 0} ★ across{" "}
            {analytics?.reviews_summary.count ?? 0} reviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(analytics?.recent_reviews || []).length === 0 ? (
            <p className="text-sm text-gray-500">
              No reviews yet. Feedback will appear here after customers rate
              delivered orders.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(analytics?.recent_reviews || []).map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border bg-gray-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{review.customer_name}</p>
                    <p className="text-sm font-bold text-yellow-600">
                      ⭐ {review.rating}
                    </p>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                    {review.review || "No written feedback."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
