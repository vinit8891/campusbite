import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/common";
import { formatAdminDate } from "@/lib/adminFormat";
import { formatPaymentMethod } from "@/lib/paymentLabels";
import { shortId } from "@/lib/formatters";
import type { AdminOrder } from "@/services/adminService";

type AdminOrdersTableProps = {
  orders: AdminOrder[];
};

export function AdminOrdersTable({ orders }: AdminOrdersTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-gray-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 font-semibold">Order ID</th>
            <th className="px-4 py-3 font-semibold">Customer</th>
            <th className="px-4 py-3 font-semibold">Restaurant</th>
            <th className="px-4 py-3 font-semibold">Order Status</th>
            <th className="px-4 py-3 font-semibold">Payment Method</th>
            <th className="px-4 py-3 font-semibold">Payment Status</th>
            <th className="px-4 py-3 font-semibold">Total</th>
            <th className="px-4 py-3 font-semibold">Created At</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id} className="border-t align-top">
              <td
                className="px-4 py-3 font-mono text-xs"
                title={order._id}
              >
                {shortId(order._id)}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium">
                  {order.customer_name || "—"}
                </div>
                {order.customer_email && (
                  <div className="text-xs text-gray-500">
                    {order.customer_email}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                {order.restaurant_name ||
                  order.restaurant_email ||
                  "—"}
              </td>
              <td className="px-4 py-3">
                <OrderStatusBadge status={order.status} size="sm" />
              </td>
              <td className="px-4 py-3">
                {formatPaymentMethod(order.payment_method)}
              </td>
              <td className="px-4 py-3">
                <PaymentStatusBadge
                  status={order.payment_status}
                  method={order.payment_method}
                  orderStatus={order.status}
                  size="sm"
                />
              </td>
              <td className="px-4 py-3 font-semibold">
                ₹{Number(order.total ?? 0).toFixed(2)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                {formatAdminDate(order.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
