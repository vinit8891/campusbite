"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";

import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthHttpError } from "@/services/authFetch";
import {
  type Subscription,
  type SubscriptionGenerationStatus,
  type SubscriptionPayment,
  type SubscriptionStatus,
  type AdminSubscriptionPaymentSummary,
  getAdminGenerationStatus,
  getAdminSubscriptionPaymentSummary,
  getAdminSubscriptionPayments,
  getAdminSubscriptions,
} from "@/services/subscriptionService";

const STATUSES: SubscriptionStatus[] = [
  "active",
  "paused",
  "expired",
  "cancelled",
];

const PAYMENT_STATUSES = ["paid", "pending", "processing", "failed"];

const selectClassName =
  "h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AdminSubscriptionsPage() {
  const [items, setItems] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generationStatus, setGenerationStatus] =
    useState<SubscriptionGenerationStatus | null>(null);
  const [paymentSummary, setPaymentSummary] =
    useState<AdminSubscriptionPaymentSummary | null>(null);
  const [paymentItems, setPaymentItems] = useState<SubscriptionPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | "">("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [restaurantEmail, setRestaurantEmail] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  async function fetchPayments(filters?: { payment_status?: string }) {
    setPaymentsLoading(true);
    try {
      const [summary, payments] = await Promise.all([
        getAdminSubscriptionPaymentSummary(),
        getAdminSubscriptionPayments({
          payment_status: (filters?.payment_status ?? paymentStatus) || undefined,
          limit: 20,
        }),
      ]);
      setPaymentSummary(summary);
      setPaymentItems(payments.items ?? []);
    } catch {
      setPaymentSummary(null);
      setPaymentItems([]);
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function fetchItems(filters?: {
    q?: string;
    status?: SubscriptionStatus | "";
    restaurant_email?: string;
    customer_email?: string;
  }) {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminSubscriptions({
        q: (filters?.q ?? q).trim() || undefined,
        status: (filters?.status ?? status) || undefined,
        restaurant_email:
          (filters?.restaurant_email ?? restaurantEmail).trim() || undefined,
        customer_email:
          (filters?.customer_email ?? customerEmail).trim() || undefined,
      });
      setItems(data);
    } catch (err) {
      if (err instanceof AuthHttpError && err.status === 401) return;
      setError(
        err instanceof Error ? err.message : "Unable to load subscriptions"
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchItems();
    void fetchPayments();
    void (async () => {
      try {
        const status = await getAdminGenerationStatus();
        setGenerationStatus(status);
      } catch {
        setGenerationStatus(null);
      }
    })();
  }, []);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    void fetchItems();
  }

  return (
    <div>
      <AdminPageHeader
        title="Subscriptions"
        description="Read-only overview of all mess subscriptions."
      />

      <div className="mb-6 grid gap-4 rounded-xl border bg-white p-4 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            Last Generation Time
          </p>
          <p className="mt-1 font-medium">
            {formatDateTime(generationStatus?.last_generation_time)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            Last Generated Count
          </p>
          <p className="mt-1 font-medium">
            {generationStatus?.last_generated_count ?? 0}
            {generationStatus?.last_target_date
              ? ` · ${formatDate(generationStatus.last_target_date)}`
              : ""}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            Scheduler Status
          </p>
          <p className="mt-1 font-medium capitalize">
            {generationStatus?.scheduler.status ?? "—"}
            {generationStatus?.scheduler.daily_time
              ? ` · ${generationStatus.scheduler.daily_time}`
              : ""}
          </p>
          {generationStatus?.scheduler.next_execution ? (
            <p className="text-xs text-muted-foreground">
              Next: {formatDateTime(generationStatus.scheduler.next_execution)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mb-6 grid gap-4 rounded-xl border bg-white p-4 md:grid-cols-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            Total Subscription Revenue
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">
            ₹{Number(paymentSummary?.total_subscription_revenue ?? 0).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Paid</p>
          <p className="mt-1 text-2xl font-semibold">
            {paymentSummary?.paid_payments ?? 0}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">
            {paymentSummary?.pending_payments ?? 0}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Failed</p>
          <p className="mt-1 text-2xl font-semibold text-red-700">
            {paymentSummary?.failed_payments ?? 0}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSearch}
        className="mb-6 grid gap-3 rounded-xl border bg-white p-4 lg:grid-cols-5"
      >
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search customer or restaurant email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select
          className={selectClassName}
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as SubscriptionStatus | "")
          }
        >
          <option value="">All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <Input
          placeholder="Restaurant email"
          value={restaurantEmail}
          onChange={(e) => setRestaurantEmail(e.target.value)}
        />

        <Input
          placeholder="Customer email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
        />

        <div className="flex gap-2 lg:col-span-5">
          <Button type="submit">Apply filters</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setQ("");
              setStatus("");
              setRestaurantEmail("");
              setCustomerEmail("");
              void fetchItems({
                q: "",
                status: "",
                restaurant_email: "",
                customer_email: "",
              });
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </form>

      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Subscription Payments</h2>
          <select
            className={`${selectClassName} max-w-xs`}
            value={paymentStatus}
            onChange={(e) => {
              const value = e.target.value;
              setPaymentStatus(value);
              void fetchPayments({ payment_status: value });
            }}
          >
            <option value="">All payment statuses</option>
            {PAYMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        {paymentsLoading ? (
          <AdminTableSkeleton rows={4} />
        ) : paymentItems.length === 0 ? (
          <AdminEmptyState
            title="No subscription payments"
            description="Payments will appear here after customers renew subscriptions."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Subscription</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Paid At</th>
                  <th className="px-4 py-3">Reference</th>
                </tr>
              </thead>
              <tbody>
                {paymentItems.map((payment) => (
                  <tr key={payment.payment_id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">
                      {payment.subscription_id?.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3">{payment.billing_period || "—"}</td>
                    <td className="px-4 py-3">
                      ₹{Number(payment.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {payment.payment_status}
                    </td>
                    <td className="px-4 py-3">
                      {formatDateTime(payment.paid_at)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {payment.transaction_reference || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.subscription_id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.subscription_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3">{item.customer_email}</td>
                  <td className="px-4 py-3">{item.restaurant_email}</td>
                  <td className="px-4 py-3 capitalize">
                    {item.meal_type} · {item.subscription_type}
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(item.start_date)} – {formatDate(item.end_date)}
                  </td>
                  <td className="px-4 py-3 capitalize">{item.status}</td>
                  <td className="px-4 py-3 capitalize">{item.payment_status}</td>
                  <td className="px-4 py-3">₹{item.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
