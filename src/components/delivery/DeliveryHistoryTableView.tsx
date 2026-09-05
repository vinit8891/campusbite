import { shortId } from "@/lib/formatters";
import { formatPaymentMethod } from "@/lib/paymentLabels";
import {
  formatDeliveredTime,
  storedEarnings,
  type HistoryOrder,
} from "@/hooks/delivery/useDeliveryHistory";

type DeliveryHistoryTableViewProps = {
  orders: HistoryOrder[];
  showEarningsColumn: boolean;
};

export function DeliveryHistoryTableView({
  orders,
  showEarningsColumn,
}: DeliveryHistoryTableViewProps) {
  return (
    <div className="hidden overflow-x-auto rounded-2xl border bg-white shadow lg:block">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-orange-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 font-medium">Order ID</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Restaurant</th>
            <th className="px-4 py-3 font-medium">Delivery Address</th>
            <th className="px-4 py-3 font-medium">Delivered Time</th>
            <th className="px-4 py-3 font-medium">Payment Method</th>
            <th className="px-4 py-3 font-medium">Total</th>
            {showEarningsColumn ? (
              <th className="px-4 py-3 font-medium">Delivery Earnings</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const earnings = storedEarnings(order);
            return (
              <tr key={order._id} className="border-b align-top">
                <td className="px-4 py-4 font-mono text-xs">
                  {shortId(order._id)}
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium">
                    {order.customer_name || "—"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {order.customer_email || order.phone || "—"}
                  </div>
                </td>
                <td className="px-4 py-4">
                  {order.restaurant_email || "—"}
                </td>
                <td className="max-w-[14rem] px-4 py-4 text-gray-600">
                  {order.address || "—"}
                </td>
                <td suppressHydrationWarning className="px-4 py-4 text-gray-600">
                  {formatDeliveredTime(order)}
                </td>
                <td className="px-4 py-4">
                  {formatPaymentMethod(order.payment_method)}
                </td>
                <td className="px-4 py-4 font-semibold text-orange-600">
                  ₹{order.total ?? 0}
                </td>
                {showEarningsColumn ? (
                  <td className="px-4 py-4 text-emerald-700">
                    {earnings !== null ? `₹${earnings}` : "—"}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
