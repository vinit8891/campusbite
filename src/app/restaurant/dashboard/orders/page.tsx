"use client";

import { useState } from "react";
import { LayoutGrid, ChefHat, TableProperties } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common";
import { useRestaurantOrders } from "@/hooks/restaurant/useRestaurantOrders";
import { useKitchenAudio } from "@/hooks/restaurant/useKitchenAudio";
import { KitchenAudioAlert } from "@/components/restaurant/KitchenAudioAlert";
import { RestaurantOrderFilterBar } from "@/components/restaurant/RestaurantOrderFilterBar";
import { RestaurantOrderTableView } from "@/components/restaurant/RestaurantOrderTableView";
import { RestaurantOrderCardList } from "@/components/restaurant/RestaurantOrderCardList";
import { KitchenDisplayBoard, MobileKdsTab } from "@/components/restaurant/KitchenDisplayBoard";
import {
  isNewOrder,
  isCookingOrder,
  isReadyOrder,
  isOrderStale,
} from "@/lib/orderDomain";

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
  const [mobileTab, setMobileTab] = useState<MobileKdsTab>("new");

  const { soundEnabled, toggleSound, pendingCount, playChime } =
    useKitchenAudio(orders);

  const cookingCount = orders.filter(
    (o) => isCookingOrder(o.status) && !isOrderStale(o.created_at)
  ).length;
  const readyCount = orders.filter(
    (o) => isReadyOrder(o.status) && !isOrderStale(o.created_at)
  ).length;

  // For non-KDS views on mobile, filter by mobileTab when not "all"
  const displayedOrders =
    mobileTab === "new"
      ? orders.filter((o) => isNewOrder(o.status) && !isOrderStale(o.created_at))
      : mobileTab === "cooking"
      ? orders.filter(
          (o) => isCookingOrder(o.status) && !isOrderStale(o.created_at)
        )
      : mobileTab === "ready"
      ? orders.filter(
          (o) => isReadyOrder(o.status) && !isOrderStale(o.created_at)
        )
      : orders;

  return (
    <main className="space-y-4 sm:space-y-6">
      {/* =========================================================
          1. COMPACT STICKY MOBILE HEADER (< md)
      ========================================================= */}
      <div className="sticky top-0 z-30 -mx-4 -mt-2 px-4 py-2.5 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-2xs md:hidden flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black text-stone-900 tracking-tight">
            Orders
          </h1>
          {pendingCount > 0 ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[11px] animate-pulse shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              <span>{pendingCount} New</span>
            </span>
          ) : (
            <span className="text-xs font-bold text-stone-400">
              ({orders.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <KitchenAudioAlert
            soundEnabled={soundEnabled}
            onToggleSound={toggleSound}
            pendingCount={pendingCount}
            compact={true}
          />
        </div>
      </div>

      {/* =========================================================
          2. DESKTOP HEADER & CONTROLS (md+)
      ========================================================= */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Restaurant Orders & KDS
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Live kitchen display system, prep SLA countdowns, and order actions
          </p>
        </div>

        {/* Desktop Controls: Sound Toggle & View Switcher */}
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

      {/* =========================================================
          3. 1-TAP MOBILE STATUS TABS (SEGMENTED CONTROL) (< md)
      ========================================================= */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar md:hidden"
        role="tablist"
        aria-label="Filter orders by stage"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "new"}
          onClick={() => setMobileTab("new")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
            mobileTab === "new"
              ? "bg-orange-600 text-white shadow-xs"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          <span>🔔 New Orders</span>
          <span
            className={`flex h-4.5 min-w-4.5 px-1.5 items-center justify-center rounded-full text-[10px] font-black ${
              mobileTab === "new"
                ? "bg-white text-orange-700"
                : pendingCount > 0
                ? "bg-orange-600 text-white animate-pulse"
                : "bg-stone-200 text-stone-600"
            }`}
          >
            {pendingCount}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "cooking"}
          onClick={() => setMobileTab("cooking")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
            mobileTab === "cooking"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          <span>🍳 Cooking</span>
          <span
            className={`flex h-4.5 min-w-4.5 px-1.5 items-center justify-center rounded-full text-[10px] font-black ${
              mobileTab === "cooking"
                ? "bg-white text-blue-700"
                : "bg-stone-200 text-stone-600"
            }`}
          >
            {cookingCount}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "ready"}
          onClick={() => setMobileTab("ready")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
            mobileTab === "ready"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          <span>📦 Ready</span>
          <span
            className={`flex h-4.5 min-w-4.5 px-1.5 items-center justify-center rounded-full text-[10px] font-black ${
              mobileTab === "ready"
                ? "bg-white text-emerald-700"
                : "bg-stone-200 text-stone-600"
            }`}
          >
            {readyCount}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "all"}
          onClick={() => setMobileTab("all")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
            mobileTab === "all"
              ? "bg-stone-800 text-white shadow-xs"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          <span>📋 All / History</span>
          <span
            className={`flex h-4.5 min-w-4.5 px-1.5 items-center justify-center rounded-full text-[10px] font-black ${
              mobileTab === "all"
                ? "bg-white text-stone-800"
                : "bg-stone-200 text-stone-600"
            }`}
          >
            {orders.length}
          </span>
        </button>
      </div>

      {/* =========================================================
          4. FILTER BAR
      ========================================================= */}
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

      {/* =========================================================
          5. CONTENT RENDERING BY VIEW MODE
      ========================================================= */}
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
          activeMobileTab={mobileTab}
        />
      ) : viewMode === "table" ? (
        <RestaurantOrderTableView
          orders={displayedOrders}
          onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
        />
      ) : (
        <RestaurantOrderCardList
          orders={displayedOrders}
          onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
        />
      )}
    </main>
  );
}
