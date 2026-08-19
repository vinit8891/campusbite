import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import { formatDateTime, selectClassName } from "@/lib/formatters";
import {
  ADMIN_SUBSCRIPTION_PAYMENT_STATUSES,
} from "@/hooks/admin/useAdminSubscriptions";
import type { SubscriptionPayment } from "@/services/subscriptionService";

type AdminSubscriptionPaymentsTableProps = {
  paymentItems: SubscriptionPayment[];
  paymentStatus: string;
  onPaymentStatusChange: (val: string) => void;
  paymentsLoading: boolean;
};

export function AdminSubscriptionPaymentsTable({
  paymentItems,
  paymentStatus,
  onPaymentStatusChange,
  paymentsLoading,
}: AdminSubscriptionPaymentsTableProps) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Subscription Payments</h2>
        <select
          className={`${selectClassName} max-w-xs`}
          value={paymentStatus}
          onChange={(e) => onPaymentStatusChange(e.target.value)}
        >
          <option value="">All payment statuses</option>
          {ADMIN_SUBSCRIPTION_PAYMENT_STATUSES.map((value) => (
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
  );
}
