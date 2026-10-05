import { Trash2, Eye, Bike, ShoppingBag } from "lucide-react";
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
  onViewOrder?: (order: AdminOrder) => void;
};

export function AdminOrdersTable({
  orders,
  onDeleteOrder,
  onViewOrder,
}: AdminOrdersTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-white shadow-xs">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-stone-50 text-stone-600">
          <tr>
            <th className="px-4 py-3 font-semibold">Order ID</th>
            <th className="px-4 py-3 font-semibold">Fulfillment</th>
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
          {orders.map((order) => {
            const rawType = (
              order.order_type ||
              order.delivery_type ||
              order.delivery_for ||
              ""
            ).toUpperCase();
            const isTakeaway =
              rawType.includes("TAKEAWAY") ||
              rawType.includes("PICKUP") ||
              rawType.includes("COUNTER");
            const fulfillmentType = isTakeaway ? "TAKEAWAY" : "DELIVERY";
            const smallOrderFee = Number(
              order.small_order_fee ??
                order.pricing_breakdown?.small_order_fee ??
                0
            );

            return (
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
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    data-testid={`fulfillment-badge-${order._id}`}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                      isTakeaway
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-blue-50 text-blue-800 border-blue-200"
                    }`}
                  >
                    {isTakeaway ? (
                      <ShoppingBag className="h-3 w-3" />
                    ) : (
                      <Bike className="h-3 w-3" />
                    )}
                    {fulfillmentType}
                  </span>
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
                <td className="px-4 py-3 font-semibold text-stone-900 whitespace-nowrap">
                  <div className="flex flex-col items-start gap-1">
                    <span>₹{Number(order.total ?? 0).toFixed(2)}</span>
                    {smallOrderFee > 0 && (
                      <span
                        data-testid="small-order-tag"
                        className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200"
                      >
                        ⚡ +₹5 Small Cart
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-stone-600 text-xs">
                  {formatAdminDate(order.created_at)}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    {onViewOrder && (
                      <button
                        type="button"
                        onClick={() => onViewOrder(order)}
                        aria-label={`View details for order ${order._id}`}
                        className="inline-flex items-center justify-center p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                        title="View Order Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
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

export default AdminOrdersTable;
