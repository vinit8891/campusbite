"use client";

import { useEffect, useState, useCallback } from "react";
import { DeliverySidebar } from "@/components/delivery/DeliverySidebar";
import { DeliveryNavbar } from "@/components/delivery/DeliveryNavbar";
import { DeliveryBottomNav } from "@/components/delivery/DeliveryBottomNav";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import { getDeliveryStats } from "@/services/deliveryPartnerService";
import { getAvailableOrders } from "@/services/deliveryService";
import { usePolling } from "@/hooks/usePolling";

export default function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeRunsCount, setActiveRunsCount] = useState(0);
  const [availablePoolCount, setAvailablePoolCount] = useState(0);

  const fetchLiveBadgeCounts = useCallback(async () => {
    try {
      const current = getDeliveryPartnerSession();
      if (current?.phone) {
        const stats = await getDeliveryStats(current.phone);
        const assigned = stats.assigned_orders ?? 0;
        const pickedUp = stats.picked_up_orders ?? 0;
        setActiveRunsCount(assigned + pickedUp);
      }
    } catch {
      // Non-blocking
    }

    try {
      const pool = await getAvailableOrders({ limit: 50 });
      setAvailablePoolCount(pool.items?.length ?? pool.total ?? 0);
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    void fetchLiveBadgeCounts();
  }, [fetchLiveBadgeCounts]);

  usePolling(fetchLiveBadgeCounts, 10000, {
    enabled: true,
    runImmediately: true,
  });

  return (
    <div className="flex min-h-screen bg-stone-50/70 text-stone-900 font-sans">
      {/* Desktop Left Sidebar */}
      <DeliverySidebar
        activeRunsCount={activeRunsCount}
        availablePoolCount={availablePoolCount}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header Bar with Duty Status Switch */}
        <DeliveryNavbar activeRunsCount={activeRunsCount} />

        {/* Page Content */}
        <main className="w-full min-w-0 flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile / Tablet Fixed Bottom Navigation Bar */}
      <DeliveryBottomNav
        activeRunsCount={activeRunsCount}
        availablePoolCount={availablePoolCount}
      />
    </div>
  );
}