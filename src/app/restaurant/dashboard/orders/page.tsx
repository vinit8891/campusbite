"use client";

import { useState } from "react";
import { LayoutGrid, ChefHat, TableProperties } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common";
import { shortId } from "@/lib/formatters";
import { useRestaurantOrders } from "@/hooks/restaurant/useRestaurantOrders";
import { useKitchenAudio } from "@/hooks/restaurant/useKitchenAudio";
import { KitchenAudioAlert } from "@/components/restaurant/KitchenAudioAlert";
import { RestaurantOrderFilterBar } from "@/components/restaurant/RestaurantOrderFilterBar";
import { RestaurantOrderTableView } from "@/components/restaurant/RestaurantOrderTableView";
import { RestaurantOrderCardList } from "@/components/restaurant/RestaurantOrderCardList";
import { KitchenDisplayBoard } from "@/components/restaurant/KitchenDisplayBoard";
import {
  isNewOrder,
  isCookingOrder,
  isReadyOrder,
  isOrderStale,
} from "@/lib/orderDomain";

type ViewMode = "kds" | "cards" | "table";
type MainTab = "active" | "history";

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

  const [mainTab, setMainTab] = useState<MainTab>("active");
  const [viewMode, setViewMode] = useState<ViewMode>("kds");

  const { soundEnabled, toggleSound, pendingCount, playChime } =
    useKitchenAudio(orders);

  const cookingCount = orders.filter(
    (o) => isCookingOrder(o.status) && !isOrderStale(o.created_at)
  ).length;
  const readyCount = orders.filter(
    (o) => isReadyOrder(o.status) && !isOrderStale(o.created_at)
  ).length;

  const activeOrdersCount = pendingCount + cookingCount + readyCount;
  const totalOrdersCount = orders.length;

  // Active non-stale orders for non-KDS views
  const activeOrders = orders.filter(
    (o) =>
      (isNewOrder(o.status) ||
        isCookingOrder(o.status) ||
        isReadyOrder(o.status)) &&
      !isOrderStale(o.created_at)
  );

  // Client-filtered orders in history mode matching search query
  const filteredHistoryOrders = orders.filter((order) => {
    if (!q.trim()) return true;
    const query = q.toLowerCase().trim();
    const idMatch =
      (order._id || "").toLowerCase().includes(query) ||
      shortId(order._id).toLowerCase().includes(query);
    const nameMatch = (order.customer_name || "")
      .toLowerCase()
      .includes(query);
    const phoneMatch = (order.phone || "").toLowerCase().includes(query);
    return idMatch || nameMatch || phoneMatch;
  });

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
              ({totalOrdersCount})
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
          3. PROMINENT 2-WAY SEGMENTED VIEW TOGGLE
      ========================================================= */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div
          className="flex items-center p-1 bg-stone-100/90 rounded-2xl border border-stone-200/90 w-full sm:w-auto"
          role="tablist"
          aria-label="Filter orders by queue"
        >
          {/* Tab 1: Active Prep */}
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === "active"}
            onClick={() => setMainTab("active")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
              mainTab === "active"
                ? "bg-orange-600 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <span>🍳 Active Prep</span>
            <span
              className={`flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full text-[11px] font-black ${
                mainTab === "active"
                  ? "bg-white text-orange-700"
                  : activeOrdersCount > 0
                  ? "bg-orange-600 text-white animate-pulse"
                  : "bg-stone-200 text-stone-600"
              }`}
            >
              {activeOrdersCount}
            </span>
          </button>

          {/* Tab 2: All Orders & History */}
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === "history"}
            onClick={() => setMainTab("history")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
              mainTab === "history"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <span>📋 All Orders & History</span>
            <span
              className={`flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full text-[11px] font-black ${
                mainTab === "history"
                  ? "bg-white text-stone-900"
                  : "bg-stone-200 text-stone-600"
              }`}
            >
              {totalOrdersCount}
            </span>
          </button>
        </div>

        {mainTab === "history" && (
          <p className="text-xs text-stone-500 font-medium">
            Showing {filteredHistoryOrders.length}{" "}
            {filteredHistoryOrders.length === 1 ? "order" : "orders"}{" "}
            chronologically
          </p>
        )}
      </div>

      {/* =========================================================
          4. FILTER & SEARCH BAR (Active in History Mode)
      ========================================================= */}
      {mainTab === "history" && (
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
      )}

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* =========================================================
          5. CONTENT RENDERING BY TAB & VIEW MODE
      ========================================================= */}
      {loading ? (
        <OrdersSkeleton />
      ) : mainTab === "active" ? (
        /* ACTIVE PREP QUEUE */
        viewMode === "kds" ? (
          <KitchenDisplayBoard
            orders={orders}
            onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
            soundEnabled={soundEnabled}
            onSwitchToHistory={() => setMainTab("history")}
          />
        ) : activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border-2 border-dashed border-stone-200 bg-white min-h-[45vh] shadow-2xs">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50 border border-orange-200/60 text-4xl mb-4 shadow-xs">
              <span role="img" aria-label="Chef">
                👨‍🍳
              </span>
            </div>
            <h2 className="text-xl font-black text-stone-900 tracking-tight">
              Kitchen is all caught up!
            </h2>
            <p className="text-sm text-stone-500 mt-1.5 max-w-md font-medium">
              New student orders will alert you here as soon as they are placed.
            </p>
            <button
              type="button"
              onClick={() => setMainTab("history")}
              className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-extrabold shadow-sm active:scale-98 transition-all cursor-pointer"
            >
              <span>📋 View All Past Orders ({orders.length})</span>
            </button>
          </div>
        ) : viewMode === "table" ? (
          <RestaurantOrderTableView
            orders={activeOrders}
            onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
          />
        ) : (
          <RestaurantOrderCardList
            orders={activeOrders}
            onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
          />
        )
      ) : (
        /* ALL ORDERS & HISTORY */
        filteredHistoryOrders.length === 0 ? (
          q.trim() ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border border-stone-200 bg-white shadow-2xs">
              <div className="text-4xl mb-3">🔍</div>
              <h2 className="text-xl font-bold text-stone-900">
                No orders found matching &ldquo;{q}&rdquo;
              </h2>
              <p className="text-sm text-stone-500 mt-1 max-w-sm">
                Check the order ID, customer name, or phone number and try again.
              </p>
              <button
                type="button"
                onClick={() => setQ("")}
                className="mt-5 px-5 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-extrabold text-xs transition-colors cursor-pointer border border-orange-200 shadow-xs"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <EmptyState
              icon="📦"
              title="No orders found"
              description="Try clearing search filters, or wait for incoming customer orders."
            />
          )
        ) : (
          <>
            {/* Mobile View: High-contrast order cards (< md) */}
            <div className="block md:hidden space-y-3">
              <RestaurantOrderCardList
                isHistoryView={true}
                orders={filteredHistoryOrders}
                onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
              />
            </div>

            {/* Desktop View: Full data table (>= md) */}
            <div className="hidden md:block">
              {viewMode === "cards" ? (
                <RestaurantOrderCardList
                  orders={filteredHistoryOrders}
                  onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
                />
              ) : (
                <RestaurantOrderTableView
                  orders={filteredHistoryOrders}
                  onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
                />
              )}
            </div>
          </>
        )
      )}
    </main>
  );
}
