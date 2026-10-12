import { Trash2 } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import type { Subscription } from "@/services/subscriptionService";

export type AdminSubscriptionsTableProps = {
  items: Subscription[];
  onDeleteSubscription?: (subscription: Subscription) => void;
  onMarkPaymentPaid?: (subscriptionId: string) => void;
  onUpdateStatus?: (subscriptionId: string, status: string) => void;
};

export function AdminSubscriptionsTable({
  items,
  onDeleteSubscription,
  onMarkPaymentPaid,
  onUpdateStatus,
}: AdminSubscriptionsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white shadow-xs">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-stone-50 text-xs uppercase text-stone-600 font-semibold">
          <tr>
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Restaurant</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const subId = item.subscription_id || (item as unknown as { id?: string }).id || "";
            return (
              <tr
                key={subId || item.customer_email}
                className="border-b last:border-0 hover:bg-stone-50/50 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-stone-700">
                  {subId ? `${subId.slice(0, 8)}…` : "—"}
                </td>
                <td className="px-4 py-3 font-medium text-stone-900">
                  {item.customer_email}
                </td>
                <td className="px-4 py-3 text-stone-700">
                  {item.restaurant_name || item.restaurant_email}
                </td>
                <td className="px-4 py-3 capitalize text-stone-800">
                  {item.meal_type} · {item.subscription_type}
                </td>
                <td className="px-4 py-3 text-stone-600 whitespace-nowrap">
                  {formatDate(item.start_date)} – {formatDate(item.end_date)}
                </td>
                <td className="px-4 py-3 capitalize">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      item.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : item.status === "paused"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : item.status === "cancelled"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-stone-100 text-stone-600 border border-stone-200"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 capitalize">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.payment_status?.toLowerCase() === "paid"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {item.payment_status}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-stone-900">
                  ₹{Number(item.price || 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    {/* Mark Cash as Paid */}
                    {item.payment_status?.toLowerCase() === "pending" && onMarkPaymentPaid && (
                      <button
                        type="button"
                        onClick={() => onMarkPaymentPaid(subId)}
                        title="Approve Cash Payment"
                        aria-label={`Mark paid subscription ${subId}`}
                        className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        ✓ Mark Paid
                      </button>
                    )}

                    {/* Status Toggle (Active / Cancelled) */}
                    {onUpdateStatus && (
                      item.status?.toLowerCase() === "active" ? (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(subId, "cancelled")}
                          title="Cancel Subscription"
                          aria-label={`Cancel subscription ${subId}`}
                          className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(subId, "active")}
                          title="Reactivate Subscription"
                          aria-label={`Activate subscription ${subId}`}
                          className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Activate
                        </button>
                      )
                    )}

                    {/* Delete */}
                    {onDeleteSubscription && (
                      <button
                        type="button"
                        onClick={() => onDeleteSubscription(item)}
                        aria-label={`Delete subscription ${item.subscription_id}`}
                        title="Delete Record"
                        className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default AdminSubscriptionsTable;
