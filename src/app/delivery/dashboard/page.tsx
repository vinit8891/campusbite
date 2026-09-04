"use client";

import Link from "next/link";
import { Package, Bike, ArrowRight, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/routes";
import { useDeliveryDashboard } from "@/hooks/delivery/useDeliveryDashboard";
import { DeliveryDashboardHeader } from "@/components/delivery/DeliveryDashboardHeader";
import { DeliveryDashboardStatCards } from "@/components/delivery/DeliveryDashboardStatCards";
import { RecentAssignedOrdersSection } from "@/components/delivery/RecentAssignedOrdersSection";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-3xl" />
    </div>
  );
}

export default function DeliveryDashboard() {
  const {
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
  } = useDeliveryDashboard();

  if (loading) {
    return <DashboardSkeleton />;
  }

  const activeRunsCount = assigned + pickedUp;
  const primaryActiveOrder = recent.find(
    (o) => o.status === "Assigned" || o.status === "Out for Delivery"
  ) || recent[0];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ⚡ Active Delivery Alert Banner */}
      {activeRunsCount > 0 ? (
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-orange-700 text-white p-5 sm:p-6 shadow-md border border-orange-400/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
              <span className="text-xs sm:text-sm font-black tracking-wider uppercase bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                ⚡ ACTIVE DELIVERY IN PROGRESS
              </span>
            </div>

            <span className="text-xs font-bold bg-amber-950/40 px-2.5 py-1 rounded-lg border border-white/20">
              {activeRunsCount} Active Run{activeRunsCount > 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-3.5 space-y-1">
            <h2 className="text-lg sm:text-xl font-black">
              Dropoff: {primaryActiveOrder?.address || "Campus Hostel Dropoff"}
            </h2>
            <p className="text-xs sm:text-sm text-orange-100 font-medium">
              Customer: {primaryActiveOrder?.customer_name || "Student"} • {primaryActiveOrder?.phone || "Contact available"}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/20 flex flex-col sm:flex-row gap-2.5 sm:items-center sm:justify-between">
            <p className="text-xs text-orange-100 hidden sm:block">
              Collect 4-digit OTP handover code from recipient upon delivery.
            </p>

            <Link
              href={ROUTES.DELIVERY_ORDERS}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-orange-700 shadow-sm transition hover:bg-orange-50 active:scale-98"
            >
              <ShieldCheck className="h-4 w-4" />
              Continue Delivery & Verify OTP 🔐
            </Link>
          </div>
        </div>
      ) : null}

      {/* Warm Greeting Header */}
      <DeliveryDashboardHeader partner={partner} error={error} />

      {/* Glanceable 2-Column Mobile Metrics Grid */}
      <DeliveryDashboardStatCards
        assigned={assigned}
        pickedUp={pickedUp}
        deliveredToday={deliveredToday}
        earningsToday={earningsToday}
        totalDeliveries={totalDeliveries}
        allTimeEarnings={stats.earnings}
        rating={stats.rating || 4.9}
      />

      {/* Quick Runner Action Tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href={ROUTES.DELIVERY_AVAILABLE}
          className="group flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs transition hover:border-orange-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900">
                Available Orders & Batch Drops
              </h3>
              <p className="text-xs text-stone-500">
                Claim single or bundled hostel deliveries (+₹20/drop)
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-stone-400 group-hover:text-orange-600 transition-colors" />
        </Link>

        <Link
          href={ROUTES.DELIVERY_ORDERS}
          className="group flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs transition hover:border-orange-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Bike className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900">
                My Active Runs & Manifest
              </h3>
              <p className="text-xs text-stone-500">
                Canteen checklist, GPS navigation, and OTP handover
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-stone-400 group-hover:text-amber-600 transition-colors" />
        </Link>
      </div>

      {/* Recent Assigned Orders Section */}
      <RecentAssignedOrdersSection recent={recent} />

      {/* History & Payouts Link Card */}
      <Link
        href={ROUTES.DELIVERY_HISTORY}
        className="block rounded-2xl sm:rounded-3xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs transition hover:border-orange-300 hover:shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900">
              📜 Delivery & Payout History
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-stone-500">
              View all completed campus runs, tip breakdowns, and weekly courier earnings.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-stone-400" />
        </div>
      </Link>
    </div>
  );
}
