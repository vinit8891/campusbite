import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/common";
import { formatDateTime, shortId } from "@/lib/formatters";
import { formatPaymentMethod } from "@/lib/paymentLabels";
import { RestaurantOrderActions } from "./RestaurantOrderActions";
import type { Order } from "@/types";

type RestaurantOrderTableViewProps = {
  orders: Order[];
  onUpdateStatus: (id: string, status: string) => void;
};

export function RestaurantOrderTableView({
  orders,
  onUpdateStatus,
}: RestaurantOrderTableViewProps) {
  return (
    <div className="hidden overflow-x-auto rounded-2xl border bg-white lg:block">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-gray-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 font-semibold">Order ID</th>
            <th className="px-4 py-3 font-semibold">Customer</th>
            <th className="px-4 py-3 font-semibold">Items</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Payment Method</th>
            <th className="px-4 py-3 font-semibold">Payment Status</th>
            <th className="px-4 py-3 font-semibold">Total</th>
            <th className="px-4 py-3 font-semibold">Created At</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
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
                <div className="text-xs text-gray-500">{order.phone}</div>
                {order.customer_email && (
                  <div className="text-xs text-gray-500">
                    {order.customer_email}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  {order.items.map((item) => (
                    <div key={`${order._id}-${item.id}`}>
                      {item.name} × {item.quantity}
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <OrderStatusBadge status={order.status} />
              </td>
              <td className="px-4 py-3">
                {formatPaymentMethod(order.payment_method)}
              </td>
              <td className="px-4 py-3">
                <PaymentStatusBadge
                  status={order.payment_status}
                  method={order.payment_method}
                  orderStatus={order.status}
                />
              </td>
              <td className="px-4 py-3 font-semibold text-orange-600">
                ₹{Number(order.total ?? 0).toFixed(2)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                {formatDateTime(order.created_at)}
              </td>
              <td className="min-w-[220px] px-4 py-3">
                <RestaurantOrderActions
                  order={order}
                  onUpdateStatus={onUpdateStatus}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
