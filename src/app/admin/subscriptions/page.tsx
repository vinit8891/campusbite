"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Search,
  IndianRupee,
  UtensilsCrossed,
  ClockAlert,
  Users,
  RefreshCw,
} from "lucide-react";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import DeleteSubscriptionModal from "@/components/admin/DeleteSubscriptionModal";
import { AdminSubscriptionsTable } from "@/components/admin/AdminSubscriptionsTable";
import { useAdminSubscriptions } from "@/hooks/admin/useAdminSubscriptions";
import {
  deleteAdminSubscription,
  updateAdminSubscriptionPaymentStatus,
  updateAdminSubscriptionStatus,
  type Subscription,
} from "@/services/subscriptionService";

export default function AdminSubscriptionsPage() {
  const {
    items,
    setItems,
    stats,
    loading,
    error,
    q,
    setQ,
    status,
    setStatus,
    paymentStatus,
    setPaymentStatus,
    fetchItems,
  } = useAdminSubscriptions();

  const [subscriptionToDelete, setSubscriptionToDelete] =
    useState<Subscription | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "pending_payment" | "cancelled"
  >("all");

  const handleFilterClick = (
    filterType: "all" | "active" | "pending_payment" | "cancelled"
  ) => {
    setActiveFilter(filterType);
    if (filterType === "all") {
      setStatus("");
      setPaymentStatus("");
      void fetchItems({ status: "", payment_status: "" });
    } else if (filterType === "active") {
      setStatus("active");
      setPaymentStatus("");
      void fetchItems({ status: "active", payment_status: "" });
    } else if (filterType === "pending_payment") {
      setStatus("");
      setPaymentStatus("pending");
      void fetchItems({ status: "", payment_status: "pending" });
    } else if (filterType === "cancelled") {
      setStatus("cancelled");
      setPaymentStatus("");
      void fetchItems({ status: "cancelled", payment_status: "" });
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    void fetchItems();
  };

  const handleMarkPaymentPaid = async (subId: string) => {
    try {
      await updateAdminSubscriptionPaymentStatus(subId, "paid");
      toast.success("Payment marked as Paid and subscription activated");
      setItems((prev) =>
        prev.map((s) => {
          const id =
            s.subscription_id ||
            (s as unknown as { id?: string }).id ||
            "";
          if (id === subId) {
            return {
              ...s,
              payment_status: "paid",
              status: "active",
            };
          }
          return s;
        })
      );
      void fetchItems();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update payment status"
      );
    }
  };

  const handleUpdateStatus = async (subId: string, newStatus: string) => {
    try {
      await updateAdminSubscriptionStatus(subId, newStatus);
      toast.success(`Subscription marked as ${newStatus}`);
      setItems((prev) =>
        prev.map((s) => {
          const id =
            s.subscription_id ||
            (s as unknown as { id?: string }).id ||
            "";
          if (id === subId) {
            return {
              ...s,
              status: newStatus as Subscription["status"],
            };
          }
          return s;
        })
      );
      void fetchItems();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status"
      );
    }
  };

  async function handleConfirmDelete() {
    if (!subscriptionToDelete) return;

    setDeleteLoading(true);
    try {
      const subId =
        subscriptionToDelete.subscription_id ||
        (subscriptionToDelete as unknown as { id?: string }).id ||
        "";
      await deleteAdminSubscription(subId);
      toast.success("Subscription deleted successfully");
      setItems((prev) =>
        prev.filter((sub) => {
          const id =
            sub.subscription_id ||
            (sub as unknown as { id?: string }).id ||
            "";
          return id !== subId;
        })
      );
      setSubscriptionToDelete(null);
      void fetchItems();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete subscription"
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

      {/* Authoritative KPI Metric Grid (4 Clean Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Revenue Collected */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Total Revenue Collected
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-700 font-mono">
              ₹{Number(stats?.total_revenue ?? 0).toFixed(2)}
            </span>
            <p className="mt-1 text-xs text-zinc-500">
              Total paid meal subscriptions
            </p>
          </div>
        </div>

        {/* Card 2: Active Meal Plans */}
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Active Meal Plans
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-blue-700 font-mono">
              {stats?.active_count ?? 0}
            </span>
            <p className="mt-1 text-xs text-zinc-500">
              Ongoing dining subscriptions
            </p>
          </div>
        </div>

        {/* Card 3: Pending Cash Payments */}
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Pending Cash Payments
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ClockAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-700 font-mono">
              {stats?.pending_count ?? 0}
            </span>
            <p className="mt-1 text-xs text-zinc-500">
              Awaiting counter cash settlement
            </p>
          </div>
        </div>

        {/* Card 4: Total Subscribers */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Total Subscribers
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-zinc-900 font-mono">
              {stats?.total_count ?? 0}
            </span>
            <p className="mt-1 text-xs text-zinc-500">
              All enrolled student accounts
            </p>
          </div>
        </div>
      </div>

      {/* Unified Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-xs">
        {/* Universal Search Input */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex-1"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student email, mess name, or plan..."
            aria-label="Search student email, mess name, or plan"
            className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-50 hover:bg-zinc-100/80 focus:bg-white border border-zinc-200 rounded-xl outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-zinc-800"
          />
        </form>

        {/* Status Filter Pill Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { label: "All", value: "all" },
              { label: "Active", value: "active" },
              { label: "Pending Payment", value: "pending_payment" },
              { label: "Cancelled", value: "cancelled" },
            ] as const
          ).map((tab) => {
            const isSelected = activeFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleFilterClick(tab.value)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => void fetchItems()}
            title="Refresh data"
            aria-label="Refresh data"
            className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer border border-zinc-200"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {error}
        </div>
      ) : null}

      {/* Main Subscriptions Control Table */}
      {loading ? (
        <AdminTableSkeleton rows={8} columns={9} />
      ) : items.length === 0 ? (
        <AdminEmptyState
          title="No subscriptions found"
          description="Try adjusting your search or status filters."
        />
      ) : (
        <AdminSubscriptionsTable
          items={items}
          onMarkPaymentPaid={handleMarkPaymentPaid}
          onUpdateStatus={handleUpdateStatus}
          onDeleteSubscription={(sub) => setSubscriptionToDelete(sub)}
        />
      )}

      {/* Confirm Deletion Modal */}
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
