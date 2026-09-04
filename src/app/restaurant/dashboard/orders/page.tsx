"use client";

import { useState } from "react";
import { LayoutGrid, ListFilter, ChefHat, TableProperties } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common";
import { useRestaurantOrders } from "@/hooks/restaurant/useRestaurantOrders";
import { useKitchenAudio } from "@/hooks/restaurant/useKitchenAudio";
import { KitchenAudioAlert } from "@/components/restaurant/KitchenAudioAlert";
import { RestaurantOrderFilterBar } from "@/components/restaurant/RestaurantOrderFilterBar";
import { RestaurantOrderTableView } from "@/components/restaurant/RestaurantOrderTableView";
import { RestaurantOrderCardList } from "@/components/restaurant/RestaurantOrderCardList";
import { KitchenDisplayBoard } from "@/components/restaurant/KitchenDisplayBoard";

type ViewMode = "kds" | "cards" | "table";

function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-48 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const {
    orders,
    loading,
    error,
    q,
    setQ,
    status,
    setStatus,
    paymentStatus,
    setPaymentStatus,
    paymentMethod,
    setPaymentMethod,
    fetchOrders,
    updateStatus,
    handleSearchSubmit,
    currentFilters,
  } = useRestaurantOrders();

  const [viewMode, setViewMode] = useState<ViewMode>("kds");

  const { soundEnabled, toggleSound, pendingCount, playChime } =
    useKitchenAudio(orders);

  return (
    <main className="space-y-6">
      {/* Top Header & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Restaurant Orders & KDS
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Live kitchen display system, prep SLA countdowns, and order actions
          </p>
        </div>

        {/* Top Controls: Sound Toggle & View Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <KitchenAudioAlert
            soundEnabled={soundEnabled}
            onToggleSound={toggleSound}
            pendingCount={pendingCount}
            onTestSound={playChime}
          />

          {/* View Mode Switcher */}
          <div
            className="flex items-center rounded-xl bg-stone-100 p-1 border border-stone-200"
            role="tablist"
            aria-label="Order layout view mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "kds"}
              onClick={() => setViewMode("kds")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "kds"
                  ? "bg-white text-orange-700 shadow-xs border border-orange-200"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <ChefHat className="h-3.5 w-3.5 text-orange-600" />
              <span>Kitchen Display</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "cards"}
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white text-orange-700 shadow-xs border border-orange-200"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "table"}
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-orange-700 shadow-xs border border-orange-200"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <TableProperties className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <RestaurantOrderFilterBar
        q={q}
        setQ={setQ}
        status={status}
        onStatusChange={(next) => {
          setStatus(next);
          void fetchOrders(currentFilters({ status: next }), {
            showLoading: true,
          });
        }}
        paymentStatus={paymentStatus}
        onPaymentStatusChange={(next) => {
          setPaymentStatus(next);
          void fetchOrders(currentFilters({ payment_status: next }), {
            showLoading: true,
          });
        }}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={(next) => {
          setPaymentMethod(next);
          void fetchOrders(currentFilters({ payment_method: next }), {
            showLoading: true,
          });
        }}
        loading={loading}
        onSearchSubmit={handleSearchSubmit}
      />

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Content Rendering by View Mode */}
      {loading ? (
        <OrdersSkeleton />
      ) : orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No orders found"
          description="Try clearing filters, or wait for incoming customer orders."
        />
      ) : viewMode === "kds" ? (
        <KitchenDisplayBoard
          orders={orders}
          onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
          soundEnabled={soundEnabled}
        />
      ) : viewMode === "table" ? (
        <RestaurantOrderTableView
          orders={orders}
          onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
        />
      ) : (
        <RestaurantOrderCardList
          orders={orders}
          onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
        />
      )}
    </main>
  );
}
