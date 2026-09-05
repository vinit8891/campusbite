import { Trash2 } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import type { Subscription } from "@/services/subscriptionService";

export type AdminSubscriptionsTableProps = {
  items: Subscription[];
  onDeleteSubscription?: (subscription: Subscription) => void;
};

export function AdminSubscriptionsTable({
  items,
  onDeleteSubscription,
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
          {items.map((item) => (
            <tr
              key={item.subscription_id}
              className="border-b last:border-0 hover:bg-stone-50/50 transition-colors"
            >
              <td className="px-4 py-3 font-mono text-xs text-stone-700">
                {item.subscription_id.slice(0, 8)}…
              </td>
              <td className="px-4 py-3 font-medium text-stone-900">
                {item.customer_email}
              </td>
              <td className="px-4 py-3 text-stone-700">
                {item.restaurant_email}
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
                      : "bg-stone-100 text-stone-600 border border-stone-200"
                  }`}
                >
                  {item.status}
                </span>
              </td>
              <td className="px-4 py-3 capitalize text-stone-700">
                {item.payment_status}
              </td>
              <td className="px-4 py-3 font-semibold text-stone-900">
                ₹{item.price.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right">
                {onDeleteSubscription && (
                  <button
                    type="button"
                    onClick={() => onDeleteSubscription(item)}
                    aria-label={`Delete subscription ${item.subscription_id}`}
                    className="inline-flex items-center justify-center p-2 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Subscription"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminSubscriptionsTable;
