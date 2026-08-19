import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/common";
import { formatDateTime, shortId } from "@/lib/formatters";
import { formatPaymentMethod } from "@/lib/paymentLabels";
import { RestaurantOrderActions } from "./RestaurantOrderActions";
import type { Order } from "@/types";

type RestaurantOrderCardListProps = {
  orders: Order[];
  onUpdateStatus: (id: string, status: string) => void;
};

export function RestaurantOrderCardList({
  orders,
  onUpdateStatus,
}: RestaurantOrderCardListProps) {
  return (
    <div className="space-y-6 lg:hidden">
      {orders.map((order) => (
        <div
          key={order._id}
          className="rounded-2xl border bg-white p-6 shadow"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p
                className="font-mono text-xs text-gray-500"
                title={order._id}
              >
                {shortId(order._id)}
              </p>
              <h2 className="text-xl font-bold">{order.customer_name}</h2>
              <p>{order.phone}</p>
              {order.customer_email && (
                <p className="text-sm text-gray-500">
                  {order.customer_email}
                </p>
              )}
              <p className="text-gray-500">{order.address}</p>
              <p className="mt-1 text-xs text-gray-500">
                {formatDateTime(order.created_at)}
              </p>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold text-orange-600">
                ₹{Number(order.total ?? 0).toFixed(2)}
              </p>
              <p className="font-semibold">
                {formatPaymentMethod(order.payment_method)}
              </p>
              <PaymentStatusBadge
                status={order.payment_status}
                method={order.payment_method}
                className="mt-1"
              />
              <div className="mt-2">
                <OrderStatusBadge status={order.status} size="lg" />
              </div>
            </div>
          </div>

          <hr className="my-6" />

          <h3 className="mb-3 text-lg font-bold">Ordered Items</h3>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={`${order._id}-${item.id}`}
                className="flex justify-between border-b pb-2"
              >
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <RestaurantOrderActions
              order={order}
              onUpdateStatus={onUpdateStatus}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
