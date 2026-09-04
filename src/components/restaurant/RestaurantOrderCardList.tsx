import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/common";
import { formatDateTime, shortId } from "@/lib/formatters";
import { formatPaymentMethod } from "@/lib/paymentLabels";
import { RestaurantOrderActions } from "./RestaurantOrderActions";
import { OrderPrepTimer } from "./OrderPrepTimer";
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
          className="rounded-2xl border bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p
                  className="font-mono text-xs font-bold text-gray-500"
                  title={order._id}
                >
                  #{shortId(order._id)}
                </p>
                <OrderPrepTimer
                  createdAt={order.created_at}
                  status={order.status}
                />
              </div>
              <h2 className="text-xl font-bold mt-1">{order.customer_name}</h2>
              <p className="text-sm font-medium text-stone-700">{order.phone}</p>
              {order.customer_email && (
                <p className="text-sm text-gray-500">
                  {order.customer_email}
                </p>
              )}
              <p className="text-gray-500 text-xs mt-1">{order.address}</p>
              <p className="mt-1 text-xs text-gray-400">
                {formatDateTime(order.created_at)}
              </p>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold text-orange-600">
                ₹{Number(order.total ?? 0).toFixed(2)}
              </p>
              <p className="font-semibold text-xs text-stone-600">
                {formatPaymentMethod(order.payment_method)}
              </p>
              <PaymentStatusBadge
                status={order.payment_status}
                method={order.payment_method}
                orderStatus={order.status}
                className="mt-1"
              />
              <div className="mt-2">
                <OrderStatusBadge status={order.status} size="lg" />
              </div>
            </div>
          </div>

          <hr className="my-5" />

          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-stone-500">
            Ordered Items
          </h3>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={`${order._id}-${item.id}`}
                className="flex justify-between border-b border-stone-100 pb-2 text-sm"
              >
                <span className="font-semibold text-stone-800">
                  {item.quantity}× {item.name}
                </span>
                <span className="font-medium text-stone-600">
                  ₹{item.price * item.quantity}
                </span>
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
