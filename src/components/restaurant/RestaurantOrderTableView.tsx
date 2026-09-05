import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/common";
import { formatDateTime, shortId } from "@/lib/formatters";
import { formatPaymentMethod } from "@/lib/paymentLabels";
import { RestaurantOrderActions } from "./RestaurantOrderActions";
import { OrderPrepTimer } from "./OrderPrepTimer";
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
    <div className="w-full overflow-x-auto rounded-2xl border border-stone-200/90 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-gray-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 font-semibold">Order ID</th>
            <th className="px-4 py-3 font-semibold">Prep Timer</th>
            <th className="px-4 py-3 font-semibold">Customer</th>
            <th className="px-4 py-3 font-semibold">Items</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Payment</th>
            <th className="px-4 py-3 font-semibold">Total</th>
            <th className="px-4 py-3 font-semibold">Created At</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id} className="border-t align-top hover:bg-stone-50/50 transition-colors">
              <td
                className="px-4 py-3 font-mono text-xs font-bold text-stone-600"
                title={order._id}
              >
                #{shortId(order._id)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <OrderPrepTimer
                  createdAt={order.created_at}
                  status={order.status}
                />
              </td>
              <td className="px-4 py-3">
                <div className="font-bold text-stone-900">
                  {order.customer_name || "—"}
                </div>
                <div className="text-xs text-gray-500">{order.phone}</div>
                {order.customer_email && (
                  <div className="text-xs text-gray-500">
                    {order.customer_email}
                  </div>
                )}
                {order.hostel_block && (
                  <div className="text-[11px] font-medium text-orange-700 mt-0.5">
                    📍 {order.hostel_block}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  {order.items.map((item) => (
                    <div key={`${order._id}-${item.id}`} className="text-xs font-medium">
                      <span className="font-bold text-orange-600 mr-1">{item.quantity}×</span>
                      {item.name}
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <OrderStatusBadge status={order.status} />
              </td>
              <td className="px-4 py-3">
                <div className="text-xs font-medium text-stone-700">
                  {formatPaymentMethod(order.payment_method)}
                </div>
                <PaymentStatusBadge
                  status={order.payment_status}
                  method={order.payment_method}
                  orderStatus={order.status}
                  className="mt-1"
                />
              </td>
              <td className="px-4 py-3 font-bold text-orange-600">
                ₹{Number(order.total ?? 0).toFixed(2)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
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
