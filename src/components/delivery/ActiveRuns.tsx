"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DeliveryOrder } from "@/types";
import { DeliveryOrderTableView } from "@/components/delivery/DeliveryOrderTableView";
import { DeliveryOrderCardList } from "@/components/delivery/DeliveryOrderCardList";
import { syncCourierActiveRuns } from "@/services/deliveryPartnerService";

export interface ActiveRunsProps {
  orders?: DeliveryOrder[];
  onUpdateStatus?: (id: string, status: string) => void | Promise<void>;
  onOpenOtp?: (id: string) => void;
}

export function ActiveRuns({
  orders = [],
  onUpdateStatus,
  onOpenOtp,
}: ActiveRunsProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("cb_courier_orders");
        sessionStorage.removeItem("cb_courier_orders");
      } catch {}
    }
  }, []);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await syncCourierActiveRuns();
    } finally {
      setIsSyncing(false);
    }
  };

  const activeRuns = useMemo(() => {
    return orders.filter((o) => {
      const s = (o.status || "").toLowerCase().trim();
      return s === "assigned" || s === "out_for_delivery" || s === "out for delivery";
    });
  }, [orders]);

  if (activeRuns.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-8 text-center bg-white/50 my-4 flex flex-col items-center">
        <div className="h-16 w-16 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl mb-3">
          🛵
        </div>
        <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 mb-2">
          Active Runs 0
        </div>
        <h3 className="text-base font-bold text-zinc-900">No active runs right now!</h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm font-medium">
          No active runs assigned. Head to Available Orders to claim delivery batches.
        </p>
        <p className="text-[11px] text-zinc-400 mt-0.5 max-w-xs">
          You don&apos;t have any ongoing deliveries in progress. Check available orders to claim fresh runs.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Link
            className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-orange-600 transition-colors"
            href="/delivery/available"
          >
            Browse Available Orders
          </Link>
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Force flush local cache and query server"
          >
            <span>Sync Runs</span>
            <span className={isSyncing ? "animate-spin" : ""}>🔄</span>
          </button>
        </div>
      </div>
    );
  }

  const handleUpdateStatus = (id: string, status: string) => {
    if (onUpdateStatus) {
      void onUpdateStatus(id, status);
    }
  };

  const handleOpenOtp = (orderId: string) => {
    if (onOpenOtp) {
      onOpenOtp(orderId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-700">
          Active Runs ({activeRuns.length})
        </span>
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
          title="Force flush local cache and query server"
        >
          <span>Sync Runs</span>
          <span className={isSyncing ? "animate-spin" : ""}>🔄</span>
        </button>
      </div>
      <DeliveryOrderTableView
        orders={activeRuns}
        onUpdateStatus={handleUpdateStatus}
        onOpenOtp={handleOpenOtp}
      />
      <DeliveryOrderCardList
        orders={activeRuns}
        onUpdateStatus={handleUpdateStatus}
        onOpenOtp={handleOpenOtp}
      />
    </div>
  );

}

export default ActiveRuns;
