"use client";

import { useState } from "react";
import { toast } from "sonner";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import DeleteSubscriptionModal from "@/components/admin/DeleteSubscriptionModal";
import { useAdminSubscriptions } from "@/hooks/admin/useAdminSubscriptions";
import { AdminSubscriptionSummaryCards } from "@/components/admin/AdminSubscriptionSummaryCards";
import { AdminSubscriptionFilterBar } from "@/components/admin/AdminSubscriptionFilterBar";
import { AdminSubscriptionPaymentsTable } from "@/components/admin/AdminSubscriptionPaymentsTable";
import { AdminSubscriptionsTable } from "@/components/admin/AdminSubscriptionsTable";
import {
  deleteAdminSubscription,
  type Subscription,
} from "@/services/subscriptionService";

export default function AdminSubscriptionsPage() {
  const {
    items,
    setItems,
    loading,
    error,
    generationStatus,
    paymentSummary,
    paymentItems,
    paymentsLoading,
    q,
    setQ,
    status,
    setStatus,
    paymentStatus,
    setPaymentStatus,
    restaurantEmail,
    setRestaurantEmail,
    customerEmail,
    setCustomerEmail,
    fetchPayments,
    handleSearch,
    handleReset,
  } = useAdminSubscriptions();

  const [subscriptionToDelete, setSubscriptionToDelete] =
    useState<Subscription | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleConfirmDelete() {
    if (!subscriptionToDelete) return;

    setDeleteLoading(true);
    try {
      await deleteAdminSubscription(subscriptionToDelete.subscription_id);
      toast.success("Subscription deleted successfully");
      setItems((prev) =>
        prev.filter(
          (sub) =>
            sub.subscription_id !== subscriptionToDelete.subscription_id
        )
      );
      setSubscriptionToDelete(null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to delete subscription"
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminPageHeader
        title="Subscriptions"
        description="Global mess meal subscriptions & administration"
      />

      <AdminSubscriptionSummaryCards
        generationStatus={generationStatus}
        paymentSummary={paymentSummary}
      />

      <AdminSubscriptionFilterBar
        q={q}
        setQ={setQ}
        status={status}
        setStatus={setStatus}
        restaurantEmail={restaurantEmail}
        setRestaurantEmail={setRestaurantEmail}
        customerEmail={customerEmail}
        setCustomerEmail={setCustomerEmail}
        onSubmit={handleSearch}
        onReset={handleReset}
      />

      <AdminSubscriptionPaymentsTable
        paymentItems={paymentItems}
        paymentStatus={paymentStatus}
        onPaymentStatusChange={(val) => {
          setPaymentStatus(val);
          void fetchPayments({ payment_status: val });
        }}
        paymentsLoading={paymentsLoading}
      />

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <AdminTableSkeleton rows={8} columns={9} />
      ) : items.length === 0 ? (
        <AdminEmptyState
          title="No subscriptions found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <AdminSubscriptionsTable
          items={items}
          onDeleteSubscription={(sub) => setSubscriptionToDelete(sub)}
        />
      )}

      <DeleteSubscriptionModal
        isOpen={Boolean(subscriptionToDelete)}
        subscription={subscriptionToDelete}
        loading={deleteLoading}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setSubscriptionToDelete(null)}
      />
    </div>
  );
}
