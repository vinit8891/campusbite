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
    <div className="space-y-5 sm:space-y-8">
      {/* Eatery Welcome Card */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-100/70 via-orange-50 to-white border border-amber-200/60 p-4 sm:p-5 md:p-7 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 sm:gap-5">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-100/80 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-bold text-orange-800 border border-orange-200/80">
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-600" />
                <span>Kitchen Hub</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Live</span>
              </span>
            </div>

            <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-stone-900 tracking-tight">
              {getGreeting()}, {eateryName}! 🍲
            </h1>

            <div className="text-xs sm:text-sm font-medium text-stone-600 max-w-2xl">
              {isRushActive ? (
                <div className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-800">
                  <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                  <span>
                    🔴 {pendingCount} order{pendingCount === 1 ? "" : "s"} need cooking
                  </span>
                </div>
              ) : (
                <span className="text-stone-500">
                  ✨ Kitchen is running smoothly. Ready for incoming campus orders!
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 shrink-0">
            <Link
              href={ROUTES.RESTAURANT_ORDERS}
              className="inline-flex h-11 sm:h-12 w-full md:w-auto items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-98 px-4 sm:px-5 text-xs sm:text-sm font-extrabold text-white shadow-md shadow-orange-600/25 transition-all cursor-pointer"
            >
              <ChefHat className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Open Kitchen KDS Board 🍳</span>
              {pendingCount > 0 && (
                <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-white text-[11px] font-black text-orange-600">
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

