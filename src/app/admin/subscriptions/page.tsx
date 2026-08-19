"use client";

import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import { useAdminSubscriptions } from "@/hooks/admin/useAdminSubscriptions";
import { AdminSubscriptionSummaryCards } from "@/components/admin/AdminSubscriptionSummaryCards";
import { AdminSubscriptionFilterBar } from "@/components/admin/AdminSubscriptionFilterBar";
import { AdminSubscriptionPaymentsTable } from "@/components/admin/AdminSubscriptionPaymentsTable";
import { AdminSubscriptionsTable } from "@/components/admin/AdminSubscriptionsTable";

export default function AdminSubscriptionsPage() {
  const {
    items,
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

  return (
    <div>
      <AdminPageHeader
        title="Subscriptions"
        description="Read-only overview of all mess subscriptions."
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
        <AdminTableSkeleton rows={8} />
      ) : items.length === 0 ? (
        <AdminEmptyState
          title="No subscriptions found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <AdminSubscriptionsTable items={items} />
      )}
    </div>
  );
}
