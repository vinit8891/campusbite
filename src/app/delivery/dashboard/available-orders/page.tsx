"use client";

import { useState, useMemo } from "react";
import { Bike, Layers, ListFilter } from "lucide-react";
import { toast } from "sonner";
import PaginationControls from "@/components/ui/PaginationControls";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common";
import { useAvailableOrders } from "@/hooks/delivery/useAvailableOrders";
import { AvailableOrdersFilterBar } from "@/components/delivery/AvailableOrdersFilterBar";
import { AvailableOrderCard } from "@/components/delivery/AvailableOrderCard";
import { BatchOrderGroupCard, type BatchGroup } from "@/components/delivery/BatchOrderGroupCard";

function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-2xl" />
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-56 w-full rounded-3xl" />
      ))}
    </div>
  );
}

function extractBuilding(address?: string): string {
  if (!address || !address.trim()) return "Campus Central Quad";
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length > 1) {
    if (
      parts[0].toLowerCase().startsWith("room") ||
      parts[0].toLowerCase().startsWith("flat")
    ) {
      return parts[1] || parts[0];
    }
    return parts[0];
  }
  return address;
}

export default function AvailableOrdersPage() {
  const {
    orders,
    restaurantOptions,
    loading,
    error,
    acceptingId,
    page,
    setPage,
    pages,
    total,
    q,
    setQ,
    restaurant,
    setRestaurant,
    paymentMethod,
    setPaymentMethod,
    loadOrders,
    currentFilters,
    handleAccept,
    openNavigation,
    handleSearchSubmit,
  } = useAvailableOrders();

  const [viewMode, setViewMode] = useState<"batch" | "single">("batch");
  const [claimingBatchIds, setClaimingBatchIds] = useState<string[]>([]);

  // Cluster orders by destination complex/building
  const batchGroups: BatchGroup[] = useMemo(() => {
    const map = new Map<string, typeof orders>();
    for (const order of orders) {
      const b = extractBuilding(order.address);
      const existing = map.get(b) || [];
      existing.push(order);
      map.set(b, existing);
    }

    return Array.from(map.entries()).map(([building, batchOrders]) => {
      const restSet = new Set<string>();
      batchOrders.forEach((bo) => {
        if (bo.restaurant_email) restSet.add(bo.restaurant_email);
      });
      return {
        building,
        orders: batchOrders,
        estimatedPayout: batchOrders.length * 20,
        restaurants:
          Array.from(restSet).length > 0
            ? Array.from(restSet)
            : ["Campus Canteen"],
      };
    });
  }, [orders]);

  async function handleClaimBatch(orderIds: string[]) {
    if (!orderIds.length) return;
    setClaimingBatchIds(orderIds);
    try {
      for (const id of orderIds) {
        await handleAccept(id);
      }
      toast.success(
        `⚡ Batch claimed! ${orderIds.length} orders added to your active manifest.`
      );
    } catch {
      toast.error("Failed to claim some orders in this batch.");
    } finally {
      setClaimingBatchIds([]);
    }
  }

  const allClaimingIds = useMemo(() => {
    const ids = [...claimingBatchIds];
    if (acceptingId) ids.push(acceptingId);
    return ids;
  }, [claimingBatchIds, acceptingId]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24 md:pb-8">
      {/* Page Title & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Available Pickup Pool
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Claim single runs or bundled hostel batch drops to maximize your earnings.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center rounded-2xl border border-stone-200 bg-stone-100/80 p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode("batch")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
              viewMode === "batch"
                ? "bg-white text-orange-600 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>⚡ Batch Drops ({batchGroups.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("single")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
              viewMode === "single"
                ? "bg-white text-orange-600 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>📋 All Orders ({orders.length})</span>
          </button>
        </div>
      </div>

      <AvailableOrdersFilterBar
        q={q}
        setQ={setQ}
        restaurant={restaurant}
        onRestaurantChange={(val) => {
          setRestaurant(val);
          setPage(1);
          void loadOrders(
            currentFilters({ restaurant: val, page: 1 }),
            { showLoading: true }
          );
        }}
        restaurantOptions={restaurantOptions}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={(val) => {
          setPaymentMethod(val);
          setPage(1);
          void loadOrders(
            currentFilters({ payment_method: val, page: 1 }),
            { showLoading: true }
          );
        }}
        onRefresh={() =>
          void loadOrders(currentFilters(), { showLoading: true })
        }
        onSubmit={handleSearchSubmit}
      />

      {error ? (
        <p className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs sm:text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <OrdersSkeleton />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Bike className="mx-auto mb-2 h-16 w-16 text-orange-500" />}
          title="No Available Deliveries Right Now"
          description="Kitchens are currently preparing fresh food. Keep this tab open — ready orders will appear automatically."
          className="rounded-3xl border-dashed p-12 shadow-xs bg-white"
        />
      ) : viewMode === "batch" ? (
        <div className="grid gap-6">
          {batchGroups.map((batch) => (
            <BatchOrderGroupCard
              key={batch.building}
              batch={batch}
              claimingIds={allClaimingIds}
              onClaimBatch={(ids) => void handleClaimBatch(ids)}
              onClaimSingle={(id) => void handleAccept(id)}
              onNavigate={(o) => openNavigation(o)}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-6">
          {orders.map((order) => (
            <AvailableOrderCard
              key={order._id}
              order={order}
              isAccepting={allClaimingIds.includes(order._id)}
              onAccept={(id) => void handleAccept(id)}
              onNavigate={(o) => openNavigation(o)}
            />
          ))}
        </div>
      )}

      <PaginationControls
        page={page}
        pages={pages}
        total={total}
        disabled={loading}
        onPageChange={(next) => {
          setPage(next);
          void loadOrders(currentFilters({ page: next }), {
            showLoading: true,
          });
        }}
      />
    </div>
  );
}
