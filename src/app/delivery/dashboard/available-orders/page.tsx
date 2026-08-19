"use client";

import { Bike } from "lucide-react";
import PaginationControls from "@/components/ui/PaginationControls";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common";
import { useAvailableOrders } from "@/hooks/delivery/useAvailableOrders";
import { AvailableOrdersFilterBar } from "@/components/delivery/AvailableOrdersFilterBar";
import { AvailableOrderCard } from "@/components/delivery/AvailableOrderCard";

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

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Available Orders</h1>
        <p className="mt-2 text-gray-500">
          Accept a delivery and start earning.
        </p>
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
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <OrdersSkeleton />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Bike className="mx-auto mb-2 h-16 w-16 text-orange-500" />}
          title="No Orders Available"
          description="Try clearing filters, or wait for new delivery requests."
          className="rounded-3xl border-dashed p-16 shadow"
        />
      ) : (
        <div className="grid gap-8">
          {orders.map((order) => (
            <AvailableOrderCard
              key={order._id}
              order={order}
              isAccepting={acceptingId === order._id}
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
