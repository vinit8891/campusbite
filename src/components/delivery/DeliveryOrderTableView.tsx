import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/common";
import { shortId } from "@/lib/formatters";
import { formatPaymentMethod } from "@/lib/paymentLabels";
import { formatAssignedTime } from "@/hooks/delivery/useDeliveryOrders";
import { DeliveryOrderActions } from "./DeliveryOrderActions";
import type { DeliveryOrder } from "@/types";

type DeliveryOrderTableViewProps = {
  orders: DeliveryOrder[];
  onUpdateStatus: (id: string, status: string) => void;
  onOpenOtp: (orderId: string) => void;
};

export function DeliveryOrderTableView({
  orders,
  onUpdateStatus,
  onOpenOtp,
}: DeliveryOrderTableViewProps) {
  return (
    <div className="hidden overflow-x-auto rounded-2xl border bg-white shadow lg:block">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-orange-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 font-medium">Order ID</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Address</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Payment Method</th>
            <th className="px-4 py-3 font-medium">Payment Status</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Assigned Time</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
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
              <td className="max-w-[14rem] px-4 py-4 text-gray-600">
                {order.address || "—"}
              </td>
              <td className="px-4 py-4">
                <OrderStatusBadge status={order.status} size="sm" />
              </td>
              <td className="px-4 py-4">
                {formatPaymentMethod(order.payment_method)}
              </td>
              <td className="px-4 py-4">
                <PaymentStatusBadge
                  status={order.payment_status}
                  method={order.payment_method}
                  orderStatus={order.status}
                  size="sm"
                />
              </td>
              <td className="px-4 py-4 font-semibold text-orange-600">
                ₹{order.total ?? 0}
              </td>
              <td className="px-4 py-4 text-gray-600">
                {formatAssignedTime(order)}
              </td>
              <td className="px-4 py-4">
                <DeliveryOrderActions
                  order={order}
                  onUpdateStatus={onUpdateStatus}
                  onOpenOtp={onOpenOtp}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
