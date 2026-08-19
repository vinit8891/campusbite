"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/routes";
import { useDeliveryDashboard } from "@/hooks/delivery/useDeliveryDashboard";
import { DeliveryDashboardHeader } from "@/components/delivery/DeliveryDashboardHeader";
import { DeliveryDashboardStatCards } from "@/components/delivery/DeliveryDashboardStatCards";
import { RecentAssignedOrdersSection } from "@/components/delivery/RecentAssignedOrdersSection";

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-28 w-full rounded-3xl" />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-36 w-full rounded-2xl" />
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

  return (
    <div className="space-y-8">
      <DeliveryDashboardHeader partner={partner} error={error} />

      <DeliveryDashboardStatCards
        assigned={assigned}
        pickedUp={pickedUp}
        deliveredToday={deliveredToday}
        earningsToday={earningsToday}
        totalDeliveries={totalDeliveries}
        allTimeEarnings={stats.earnings}
      />

      <RecentAssignedOrdersSection recent={recent} />

      <Link
        href={ROUTES.DELIVERY_HISTORY}
        className="block rounded-2xl border bg-white p-6 shadow transition hover:shadow-lg"
      >
        <h2 className="text-xl font-bold">Delivery History</h2>
        <p className="mt-2 text-gray-500">
          View all completed deliveries.
        </p>
      </Link>
    </div>
  );
}
