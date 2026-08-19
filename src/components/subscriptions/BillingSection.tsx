import React from "react";
import { CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDateTime, formatCurrencyINR } from "@/lib/formatters";
import { PaymentStatusBadge } from "@/components/common";
import {
  isSubscriptionActive,
  isSubscriptionPaused,
  isSubscriptionCancelled,
} from "@/lib/subscriptionDomain";

import {
  type Subscription,
  type SubscriptionPayment,
  todayIsoDate,
} from "@/services/subscriptionService";

export type BillingSectionProps = {
  subscriptions: Subscription[];
  payments: SubscriptionPayment[];
  paymentsLoading: boolean;
  billingBusy: string | null;
  onRenew: (subscription: Subscription) => void;
  onRetry: (subscription: Subscription) => void;
};

export function BillingSection({
  subscriptions,
  payments,
  paymentsLoading,
  billingBusy,
  onRenew,
  onRetry,
}: BillingSectionProps) {
  const today = todayIsoDate();
  const primary =
    subscriptions.find(
      (item) =>
        !isSubscriptionCancelled(item.status) &&
        item.end_date >= today &&
        (isSubscriptionActive(item.status) || isSubscriptionPaused(item.status))
    ) || subscriptions[0];


  if (!primary) return null;

  const lastPayment = payments[0];
  const renewalDue =
    lastPayment?.renewal_due || primary.end_date || null;
  const canRenew =
    primary.status !== "cancelled" &&
    primary.payment_status !== "failed" &&
    primary.payment_status !== "processing";
  const canRetry = primary.payment_status === "failed";

  return (
    <section className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Billing</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-sm text-muted-foreground">Current Plan</p>
          <p className="mt-1 font-medium">
            {primary.plan_name ||
              `${primary.meal_type} · ${primary.subscription_type}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {primary.restaurant_email}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Billing Status</p>
          <div className="mt-1">
            <PaymentStatusBadge status={primary.payment_status} size="sm" />
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Renewal Due</p>
          <p className="mt-1 font-medium">{formatDate(renewalDue)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Last Payment</p>
          {lastPayment ? (
            <p className="mt-1 font-medium">
              {formatCurrencyINR(lastPayment.amount)} ·{" "}
              {formatDateTime(lastPayment.paid_at)}
            </p>
          ) : (

            <p className="mt-1 text-sm text-muted-foreground">No payments yet</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {canRenew ? (
          <Button
            size="sm"
            disabled={billingBusy === primary.subscription_id}
            onClick={() => onRenew(primary)}
          >
            Renew Now
          </Button>
        ) : null}
        {canRetry ? (
          <Button
            size="sm"
            variant="outline"
            disabled={billingBusy === primary.subscription_id}
            onClick={() => onRetry(primary)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Payment
          </Button>
        ) : null}
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Payment History
        </h3>
        {paymentsLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No billing history yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Paid At</th>
                  <th className="px-3 py-2">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.payment_id} className="border-b last:border-0">
                    <td className="px-3 py-2">{payment.billing_period || "—"}</td>
                    <td className="px-3 py-2">
                      ₹{Number(payment.amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 capitalize">
                      {payment.payment_method}
                    </td>
                    <td className="px-3 py-2 capitalize">
                      {payment.payment_status}
                    </td>
                    <td className="px-3 py-2">
                      {formatDateTime(payment.paid_at)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {payment.transaction_reference || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
