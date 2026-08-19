"use client";

import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import PaginationControls from "@/components/ui/PaginationControls";
import { useAdminOrders } from "@/hooks/admin/useAdminOrders";
import { AdminOrdersFilterBar } from "@/components/admin/AdminOrdersFilterBar";
import { AdminOrdersTable } from "@/components/admin/AdminOrdersTable";

export default function AdminOrdersPage() {
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
    status,
    setStatus,
    paymentStatus,
    setPaymentStatus,
    paymentMethod,
    setPaymentMethod,
    fetchOrders,
    currentFilters,
    handleSearchSubmit,
  } = useAdminOrders();

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      <AdminPageHeader
        title="Orders"
        description="Read-only view of platform orders"
      />

      <AdminOrdersFilterBar
        q={q}
        setQ={setQ}
        status={status}
        onStatusChange={(next) => {
          setStatus(next);
          void fetchOrders(currentFilters({ status: next }));
        }}
        paymentStatus={paymentStatus}
        onPaymentStatusChange={(next) => {
          setPaymentStatus(next);
          void fetchOrders(currentFilters({ payment_status: next }));
        }}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={(next) => {
          setPaymentMethod(next);
          void fetchOrders(currentFilters({ payment_method: next }));
        }}
        loading={loading}
        onSubmit={handleSearchSubmit}
      />

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <AdminTableSkeleton rows={6} columns={8} />
      ) : orders.length === 0 ? (
        <AdminEmptyState
          title="No orders found"
          description="Try clearing filters or searching with a different term."
        />
      ) : (
        <AdminOrdersTable orders={orders} />
      )}

      <PaginationControls
        page={page}
        pages={pages}
        total={total}
        disabled={loading}
        onPageChange={(next) => {
          setPage(next);
          void fetchOrders(currentFilters({ page: next }));
        }}
      />
    </div>
  );
}
