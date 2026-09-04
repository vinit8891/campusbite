"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChefHat, ArrowRight, Bell, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRestaurantDashboard } from "@/hooks/restaurant/useRestaurantDashboard";
import { DashboardMetricCards } from "@/components/restaurant/DashboardMetricCards";
import { DashboardAnalyticsCharts } from "@/components/restaurant/DashboardAnalyticsCharts";
import { DashboardRecentReviews } from "@/components/restaurant/DashboardRecentReviews";
import { ROUTES } from "@/lib/routes";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-32 w-full rounded-3xl" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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

  const [eateryName, setEateryName] = useState("Chef Partner");

  useEffect(() => {
    const email = getRestaurantOwnerEmail();
    if (email) {
      const prefix = email.split("@")[0].replace(/[._-]/g, " ");
      const formatted = prefix
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      setEateryName(formatted || "Chef Partner");
    }
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const pendingCount = dashboard.pending_orders ?? 0;
  const isRushActive = pendingCount > 0;

  return (
    <div className="space-y-8">
      {/* Eatery Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-100/70 via-orange-50 to-white border border-amber-200/60 p-5 sm:p-7 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-100/80 px-3 py-1 text-xs font-bold text-orange-800 border border-orange-200/80">
              <Sparkles className="h-3.5 w-3.5 text-orange-600" />
              <span>Campus Live Kitchen Hub</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {getGreeting()}, {eateryName}! 🍲
            </h1>

            <p className="text-sm font-medium text-stone-600 max-w-2xl">
              {isRushActive ? (
                <span className="text-orange-900 font-semibold">
                  You have{" "}
                  <span className="underline decoration-orange-500 font-extrabold">
                    {pendingCount} pending order{pendingCount === 1 ? "" : "s"}
                  </span>{" "}
                  waiting for acceptance. Kitchen rush is active!
                </span>
              ) : (
                "Kitchen is running smoothly. Ready for incoming student meals and rush orders!"
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={ROUTES.RESTAURANT_ORDERS}
              className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-98 px-5 py-3.5 text-sm font-extrabold text-white shadow-md shadow-orange-600/25 transition-all cursor-pointer"
            >
              <ChefHat className="h-5 w-5" />
              <span>Open Kitchen KDS Board 🍳</span>
              {pendingCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-black text-orange-600">
                  {pendingCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {/* Metric Cards */}
      <DashboardMetricCards
        cards={cards}
        dashboard={dashboard}
        subscriptionRevenue={subscriptionRevenue}
      />

      {/* Analytics Charts */}
      <DashboardAnalyticsCharts
        analytics={analytics}
        trend={trend}
        maxTrendRevenue={maxTrendRevenue}
        topItems={topItems}
        maxTop={maxTop}
      />

      {/* Customer Reviews */}
      <DashboardRecentReviews analytics={analytics} />
    </div>
  );
}

