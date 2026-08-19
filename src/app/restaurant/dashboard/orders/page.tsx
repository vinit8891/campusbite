"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common";
import { useRestaurantOrders } from "@/hooks/restaurant/useRestaurantOrders";
import { RestaurantOrderFilterBar } from "@/components/restaurant/RestaurantOrderFilterBar";
import { RestaurantOrderTableView } from "@/components/restaurant/RestaurantOrderTableView";
import { RestaurantOrderCardList } from "@/components/restaurant/RestaurantOrderCardList";

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

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Restaurant Orders</h1>
        <p className="mt-2 text-gray-500">
          Search, filter, and manage incoming orders
        </p>
      </div>

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

      {loading ? (
        <OrdersSkeleton />
      ) : orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No orders found"
          description="Try clearing filters, or wait for new customer orders."
        />
      ) : (
        <>
          <RestaurantOrderTableView
            orders={orders}
            onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
          />

          <RestaurantOrderCardList
            orders={orders}
            onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
          />
        </>
      )}
    </main>
  );
}
