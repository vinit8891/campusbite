"use client";

import { useState } from "react";
import { toast } from "sonner";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import DeleteOrderModal from "@/components/admin/DeleteOrderModal";
import AdminOrderDetailsModal from "@/components/admin/AdminOrderDetailsModal";
import PaginationControls from "@/components/ui/PaginationControls";
import { useAdminOrders } from "@/hooks/admin/useAdminOrders";
import { AdminOrdersFilterBar } from "@/components/admin/AdminOrdersFilterBar";
import { AdminOrdersTable } from "@/components/admin/AdminOrdersTable";
import { deleteAdminOrder, type AdminOrder } from "@/services/adminService";

type AdminFilterTab = "all" | "pending" | "processing" | "cancelled" | "delivered";

const ADMIN_ORDER_TABS: { id: AdminFilterTab; label: string }[] = [
  { id: "all", label: "All Orders" },
  { id: "pending", label: "Pending" },
  { id: "processing", label: "Processing" },
  { id: "cancelled", label: "Cancelled" },
  { id: "delivered", label: "Delivered" },
];

export default function AdminOrdersPage() {
  const {
    orders,
    setOrders,
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

  const [orderToDelete, setOrderToDelete] = useState<AdminOrder | null>(null);
  const [orderToView, setOrderToView] = useState<AdminOrder | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const activeTab: AdminFilterTab =
    paymentStatus.toLowerCase() === "processing"
      ? "processing"
      : status.toLowerCase() === "pending"
      ? "pending"
      : status.toLowerCase() === "cancelled"
      ? "cancelled"
      : status.toLowerCase() === "delivered"
      ? "delivered"
      : "all";

  function handleTabClick(tabId: AdminFilterTab) {
    let nextStatus = "";
    let nextPaymentStatus = "";

    if (tabId === "pending") {
      nextStatus = "Pending";
    } else if (tabId === "processing") {
      nextPaymentStatus = "processing";
    } else if (tabId === "cancelled") {
      nextStatus = "Cancelled";
    } else if (tabId === "delivered") {
      nextStatus = "Delivered";
    }

    setStatus(nextStatus);
    setPaymentStatus(nextPaymentStatus);
    setPage(1);
    void fetchOrders(
      currentFilters({
        status: nextStatus || undefined,
        payment_status: nextPaymentStatus || undefined,
        page: 1,
      })
    );
  }

  async function handleConfirmDelete() {
    if (!orderToDelete) return;

    setDeleteLoading(true);
    try {
      await deleteAdminOrder(orderToDelete._id);
      toast.success("Order deleted successfully");
      setOrders((prev) => prev.filter((o) => o._id !== orderToDelete._id));
      setOrderToDelete(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete order"
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      <AdminPageHeader
        title="Orders"
        description="Global platform orders dispatch & administration"
      />

      {/* Audit & Support Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Order Audit Filter Tabs">
          {ADMIN_ORDER_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleTabClick(tab.id)}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

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
        <AdminTableSkeleton rows={6} columns={9} />
      ) : orders.length === 0 ? (
        <AdminEmptyState
          title="No orders found"
          description="Try clearing filters or searching with a different term."
        />
      ) : (
        <AdminOrdersTable
          orders={orders}
          onViewOrder={(order) => setOrderToView(order)}
          onDeleteOrder={(order) => setOrderToDelete(order)}
        />
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

      <AdminOrderDetailsModal
        isOpen={Boolean(orderToView)}
        order={orderToView}
        onClose={() => setOrderToView(null)}
      />

      <DeleteOrderModal
        isOpen={Boolean(orderToDelete)}
        order={orderToDelete}
        loading={deleteLoading}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setOrderToDelete(null)}
      />
    </div>
  );
}
