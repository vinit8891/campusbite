"use client";

import { Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DeliveryPagination } from "@/components/delivery/DeliveryPagination";
import { EmptyState } from "@/components/common";
import { useDeliveryHistory } from "@/hooks/delivery/useDeliveryHistory";
import { DeliveryHistoryStatCards } from "@/components/delivery/DeliveryHistoryStatCards";
import { DeliveryHistoryFilterBar } from "@/components/delivery/DeliveryHistoryFilterBar";
import { DeliveryHistoryTableView } from "@/components/delivery/DeliveryHistoryTableView";
import { DeliveryHistoryCardList } from "@/components/delivery/DeliveryHistoryCardList";

function HistorySkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 sm:h-24 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-14 w-full rounded-2xl" />
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-36 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function DeliveryHistoryPage() {
  const {
    orders,
    loading,
    error,
    page,
    setPage,
    pages,
    total,
    q,
    setQ,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    loadPage,
    currentFilters,
    handleSearchSubmit,
    totalDeliveries,
    weekDeliveries,
    monthDeliveries,
    showEarningsColumn,
  } = useDeliveryHistory();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Delivery History</h1>
        <p className="mt-2 text-gray-500">
          Review your completed deliveries.
        </p>
      </div>

      {loading ? (
        <HistorySkeleton />
      ) : (
        <>
          <DeliveryHistoryStatCards
            totalDeliveries={totalDeliveries}
            weekDeliveries={weekDeliveries}
            monthDeliveries={monthDeliveries}
          />

          <DeliveryHistoryFilterBar
            q={q}
            setQ={setQ}
            fromDate={fromDate}
            setFromDate={setFromDate}
            toDate={toDate}
            setToDate={setToDate}
            onRefresh={() =>
              void loadPage(currentFilters(), { showLoading: true })
            }
            onSubmit={handleSearchSubmit}
          />

          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {orders.length === 0 ? (
            <EmptyState
              icon={<Package className="mx-auto h-12 w-12 text-orange-500" />}
              title="No deliveries found"
              description="Try adjusting search or date filters."
            />
          ) : (
            <>
              <DeliveryHistoryTableView
                orders={orders}
                showEarningsColumn={showEarningsColumn}
              />

              <DeliveryHistoryCardList orders={orders} />
            </>
          )}

          <DeliveryPagination
            page={page}
            pages={pages}
            total={total}
            pageSize={20}
            itemName="deliveries"
            disabled={loading}
            onPageChange={(next) => {
              setPage(next);
              void loadPage(currentFilters({ page: next }), {
                showLoading: true,
              });
            }}
          />
        </>
      )}
    </div>
  );
}
