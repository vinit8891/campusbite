import { formatDate } from "@/lib/formatters";
import type { Subscription } from "@/services/subscriptionService";

type AdminSubscriptionsTableProps = {
  items: Subscription[];
};

export function AdminSubscriptionsTable({
  items,
}: AdminSubscriptionsTableProps) {
  return (
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
  );
}
