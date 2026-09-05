import { Trash2 } from "lucide-react";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/common";
import { formatAdminDate } from "@/lib/adminFormat";
import { formatPaymentMethod } from "@/lib/paymentLabels";
import { shortId } from "@/lib/formatters";
import type { AdminOrder } from "@/services/adminService";

export type AdminOrdersTableProps = {
  orders: AdminOrder[];
  onDeleteOrder?: (order: AdminOrder) => void;
};

export function AdminOrdersTable({
  orders,
  onDeleteOrder,
}: AdminOrdersTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-white shadow-xs">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-stone-50 text-stone-600">
          <tr>
            <th className="px-4 py-3 font-semibold">Order ID</th>
            <th className="px-4 py-3 font-semibold">Customer</th>
            <th className="px-4 py-3 font-semibold">Restaurant</th>
            <th className="px-4 py-3 font-semibold">Order Status</th>
            <th className="px-4 py-3 font-semibold">Payment Method</th>
            <th className="px-4 py-3 font-semibold">Payment Status</th>
            <th className="px-4 py-3 font-semibold">Total</th>
            <th className="px-4 py-3 font-semibold">Created At</th>
            <th className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order._id}
              className="border-t align-top hover:bg-stone-50/50 transition-colors"
            >
              <td
                className="px-4 py-3 font-mono text-xs text-stone-700"
                title={order._id}
              >
                {shortId(order._id)}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-stone-900">
                  {order.customer_name || "—"}
                </div>
                {order.customer_email && (
                  <div className="text-xs text-stone-500">
                    {order.customer_email}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-stone-800">
                {order.restaurant_name ||
                  order.restaurant_email ||
                  "—"}
              </td>
              <td className="px-4 py-3">
                <OrderStatusBadge status={order.status} size="sm" />
              </td>
              <td className="px-4 py-3 text-stone-700">
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
              <td className="px-4 py-3 font-semibold text-stone-900">
                ₹{Number(order.total ?? 0).toFixed(2)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                {formatAdminDate(order.created_at)}
              </td>
              <td className="px-4 py-3 text-right">
                {onDeleteOrder && (
                  <button
                    type="button"
                    onClick={() => onDeleteOrder(order)}
                    aria-label={`Delete order ${order._id}`}
                    className="inline-flex items-center justify-center p-2 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Order"
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

export default AdminOrdersTable;
