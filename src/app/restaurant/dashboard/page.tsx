"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useRestaurantDashboard } from "@/hooks/restaurant/useRestaurantDashboard";
import { DashboardMetricCards } from "@/components/restaurant/DashboardMetricCards";
import { DashboardAnalyticsCharts } from "@/components/restaurant/DashboardAnalyticsCharts";
import { DashboardRecentReviews } from "@/components/restaurant/DashboardRecentReviews";

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

export default function DashboardPage() {
  const {
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
  } = useRestaurantDashboard();

  if (loading) {
    return <DashboardSkeleton />;
  }

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

      <DashboardMetricCards
        cards={cards}
        dashboard={dashboard}
        subscriptionRevenue={subscriptionRevenue}
      />

      <DashboardAnalyticsCharts
        analytics={analytics}
        trend={trend}
        maxTrendRevenue={maxTrendRevenue}
        topItems={topItems}
        maxTop={maxTop}
      />

      <DashboardRecentReviews analytics={analytics} />
    </div>
  );
}
