"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, BellRing, ChefHat, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import type {
  DashboardData,
  StatCard,
  AnalyticsOverview,
} from "@/hooks/restaurant/useRestaurantDashboard";
import type { RestaurantSubscriptionRevenueSummary } from "@/types";

type DashboardMetricCardsProps = {
  cards?: StatCard[];
  dashboard: DashboardData;
  subscriptionRevenue: RestaurantSubscriptionRevenueSummary | null;
  analytics?: AnalyticsOverview | null;
};

export function DashboardMetricCards({
  dashboard,
  subscriptionRevenue,
  analytics,
}: DashboardMetricCardsProps) {
  const [showLifetime, setShowLifetime] = useState(false);

  const pendingCount = dashboard.pending_orders ?? 0;
  const cookingCount = dashboard.cooking_orders ?? dashboard.active_orders ?? 0;
  const todayOrders = dashboard.today_orders ?? 0;
  const todayRevenue = Number(dashboard.today_revenue ?? 0);

  const isPendingAlert = pendingCount > 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* =========================================================
          1. TOP 4 OPERATIONAL TILES (TODAY'S OPERATIONS)
      ========================================================= */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {/* Tile 1: Today's Earnings */}
        <Card className="rounded-2xl sm:rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 to-emerald-100/40 p-1 shadow-xs transition-all hover:shadow-md">
          <CardHeader className="pb-1 pt-3 px-3.5 sm:pt-4 sm:px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-emerald-800 truncate">
              Today&apos;s Earnings
            </CardTitle>
            <span className="text-lg sm:text-xl leading-none shrink-0" role="img" aria-label="Earnings">
              💰
            </span>
          </CardHeader>
          <CardContent className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-1">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-900 tracking-tight truncate">
              ₹{todayRevenue.toFixed(2)}
            </p>
            <CardDescription className="text-[11px] sm:text-xs font-medium text-emerald-700 mt-1 truncate flex items-center gap-1">
              <span>⚡</span>
              <span>Delivered today</span>
            </CardDescription>
          </CardContent>
        </Card>

        {/* Tile 2: Today's Orders */}
        <Link href={ROUTES.RESTAURANT_ORDERS} className="block group">
          <Card className="h-full rounded-2xl sm:rounded-3xl border border-blue-200/90 bg-gradient-to-br from-blue-50/90 to-blue-100/40 p-1 shadow-xs transition-all group-hover:border-blue-300 group-hover:shadow-md">
            <CardHeader className="pb-1 pt-3 px-3.5 sm:pt-4 sm:px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-blue-800 truncate">
                Today&apos;s Orders
              </CardTitle>
              <span className="text-lg sm:text-xl leading-none shrink-0" role="img" aria-label="Orders">
                📦
              </span>
            </CardHeader>
            <CardContent className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-1">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-blue-900 tracking-tight truncate">
                {todayOrders}
              </p>
              <CardDescription className="text-[11px] sm:text-xs font-medium text-blue-700 mt-1 truncate group-hover:underline">
                View orders list →
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        {/* Tile 3: Pending Acceptance (Alert Pill with Pulse) */}
        <Link href={ROUTES.RESTAURANT_ORDERS} className="block group">
          <Card
            className={`h-full rounded-2xl sm:rounded-3xl border p-1 shadow-xs transition-all group-hover:shadow-md ${
              isPendingAlert
                ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-100/60 ring-2 ring-amber-400/80 animate-pulse"
                : "border-stone-200/90 bg-stone-50/70"
            }`}
          >
            <CardHeader className="pb-1 pt-3 px-3.5 sm:pt-4 sm:px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-amber-900 truncate">
                Pending
              </CardTitle>
              <div className="flex items-center gap-1">
                {isPendingAlert && (
                  <span className="flex h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                )}
                <span className="text-lg sm:text-xl leading-none shrink-0" role="img" aria-label="Pending">
                  🔔
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-1">
              <div className="flex items-baseline gap-2">
                <p
                  className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight truncate ${
                    isPendingAlert ? "text-amber-950" : "text-stone-700"
                  }`}
                >
                  {pendingCount}
                </p>
                {isPendingAlert && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs">
                    Needs Action
                  </span>
                )}
              </div>
              <CardDescription
                className={`text-[11px] sm:text-xs font-bold mt-1 truncate ${
                  isPendingAlert
                    ? "text-orange-900 group-hover:underline"
                    : "text-stone-500"
                }`}
              >
                {isPendingAlert ? "Accept new orders →" : "All caught up"}
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        {/* Tile 4: Currently Cooking */}
        <Link href={ROUTES.RESTAURANT_ORDERS} className="block group">
          <Card className="h-full rounded-2xl sm:rounded-3xl border border-orange-200/90 bg-gradient-to-br from-orange-50/90 to-amber-100/40 p-1 shadow-xs transition-all group-hover:border-orange-300 group-hover:shadow-md">
            <CardHeader className="pb-1 pt-3 px-3.5 sm:pt-4 sm:px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-orange-900 truncate">
                In Progress
              </CardTitle>
              <span className="text-lg sm:text-xl leading-none shrink-0" role="img" aria-label="Cooking">
                🍳
              </span>
            </CardHeader>
            <CardContent className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-1">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-orange-950 tracking-tight truncate">
                {cookingCount}
              </p>
              <CardDescription className="text-[11px] sm:text-xs font-medium text-orange-800 mt-1 truncate group-hover:underline">
                Active in kitchen →
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* =========================================================
          2. SECONDARY / SUBSCRIPTION QUICK CARDS & COLLAPSIBLE STATS
      ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Subscription Quick Card: Today's Mess Meals */}
        <Link href={ROUTES.RESTAURANT_ORDERS} className="block group">
          <Card className="h-full rounded-2xl sm:rounded-3xl bg-amber-50/70 border-amber-200/80 text-amber-950 shadow-xs transition-all group-hover:border-amber-300 group-hover:shadow-md">
            <CardHeader className="pb-1 pt-3.5 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-amber-900 truncate pr-1">
                Today&apos;s Mess Meals
              </CardTitle>
              <span className="text-xl leading-none shrink-0">🍱</span>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1 flex items-center justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight truncate">
                  {dashboard.today_subscription_meals ?? 0}
                </p>
                <p className="mt-0.5 text-xs font-bold text-amber-800 group-hover:underline truncate">
                  View in Kitchen Orders →
                </p>
              </div>
              <span className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-amber-200/80 text-amber-950 border border-amber-300">
                Active Meal Passes
              </span>
            </CardContent>
          </Card>
        </Link>

        {/* Subscription Quick Card: Subscription Revenue */}
        <Link href={ROUTES.RESTAURANT_SUBSCRIPTIONS} className="block group">
          <Card className="h-full rounded-2xl sm:rounded-3xl bg-emerald-50/70 border-emerald-200/80 text-emerald-950 shadow-xs transition-all group-hover:border-emerald-300 group-hover:shadow-md">
            <CardHeader className="pb-1 pt-3.5 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 truncate pr-1">
                Subscription Revenue
              </CardTitle>
              <span className="text-xl leading-none shrink-0">💳</span>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1 space-y-1 text-xs">
              <div className="flex justify-between gap-2 text-stone-600">
                <span className="truncate">Active subs</span>
                <span className="font-bold text-stone-900 shrink-0">
                  {subscriptionRevenue?.active_subscriptions ?? 0}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-stone-600 truncate">Monthly rev</span>
                <span className="font-extrabold text-emerald-700 shrink-0">
                  ₹{Number(subscriptionRevenue?.monthly_subscription_revenue ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-stone-600 truncate">Pending dues</span>
                <span className="font-bold text-amber-700 shrink-0">
                  {subscriptionRevenue?.pending_subscription_payments ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* =========================================================
          3. COLLAPSIBLE ALL-TIME STORE PERFORMANCE
      ========================================================= */}
      <div className="rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white shadow-xs overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setShowLifetime((prev) => !prev)}
          className="w-full px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between hover:bg-stone-50/80 transition-colors cursor-pointer text-left"
          aria-expanded={showLifetime}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg sm:text-xl">📊</span>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-stone-900">
                All-Time Store Performance
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-500 font-medium truncate">
                Lifetime orders, aggregate delivered revenue, ratings, and menu stats
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="hidden sm:inline-flex text-xs font-bold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
              {showLifetime ? "Hide metrics" : "View lifetime metrics"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-700">
              {showLifetime ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </div>
        </button>

        {showLifetime && (
          <div className="px-4 sm:px-6 pb-5 pt-2 border-t border-stone-100 bg-stone-50/40">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 pt-2">
              {/* Total Orders */}
              <div className="rounded-2xl bg-white border border-stone-200/80 p-3 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Total Orders
                </p>
                <p className="text-xl sm:text-2xl font-black text-stone-900 mt-0.5">
                  {dashboard.orders}
                </p>
              </div>

              {/* Delivered */}
              <div className="rounded-2xl bg-white border border-stone-200/80 p-3 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Delivered
                </p>
                <p className="text-xl sm:text-2xl font-black text-emerald-800 mt-0.5">
                  {dashboard.delivered_orders ?? 0}
                </p>
              </div>

              {/* Lifetime Revenue */}
              <div className="rounded-2xl bg-white border border-stone-200/80 p-3 shadow-2xs col-span-2 sm:col-span-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Revenue
                </p>
                <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">
                  ₹{Number(dashboard.revenue || 0).toFixed(2)}
                </p>
                <p className="text-[10px] text-stone-400 mt-0.5">Lifetime</p>
              </div>

              {/* Avg Order Value */}
              <div className="rounded-2xl bg-white border border-stone-200/80 p-3 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Avg Order Value
                </p>
                <p className="text-xl sm:text-2xl font-black text-teal-700 mt-0.5">
                  ₹{Number(analytics?.average_order_value ?? 0).toFixed(2)}
                </p>
              </div>

              {/* Menu Items */}
              <div className="rounded-2xl bg-white border border-stone-200/80 p-3 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Menu Items
                </p>
                <p className="text-xl sm:text-2xl font-black text-purple-800 mt-0.5">
                  {dashboard.menu_items}
                </p>
              </div>

              {/* Store Rating */}
              <div className="rounded-2xl bg-white border border-stone-200/80 p-3 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Rating
                </p>
                <p className="text-xl sm:text-2xl font-black text-orange-600 mt-0.5">
                  ⭐ {dashboard.rating || 0}
                </p>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  {dashboard.review_count ? `${dashboard.review_count} reviews` : "No reviews"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
