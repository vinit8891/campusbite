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
    <div className="space-y-5 lg:hidden">
      {orders.map((order) => (
        <div
          key={order._id}
          className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs transition-all hover:shadow-md"
        >
          {/* Header Info */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-xs font-bold text-stone-400"
                  title={order._id}
                >
                  #{shortId(order._id)}
                </span>
                <OrderPrepTimer
                  createdAt={order.created_at}
                  status={order.status}
                />
              </div>
              <h2 className="text-xl font-extrabold text-stone-900 mt-1">
                {order.customer_name}
              </h2>
              {order.phone && (
                <p className="text-sm font-semibold text-stone-600 mt-0.5">
                  📞 {order.phone}
                </p>
              )}
              {order.customer_email && (
                <p className="text-xs text-stone-400">
                  {order.customer_email}
                </p>
              )}
              <p className="mt-1 text-[11px] text-stone-400">
                {formatDateTime(order.created_at)}
              </p>
            </div>

            <div className="text-right flex flex-col items-end">
              <p className="text-2xl font-black text-orange-600">
                ₹{Number(order.total ?? 0).toFixed(2)}
              </p>
              <p className="font-semibold text-xs text-stone-500 mt-0.5">
                {formatPaymentMethod(order.payment_method)}
              </p>
              <PaymentStatusBadge
                status={order.payment_status}
                method={order.payment_method}
                orderStatus={order.status}
                className="mt-1.5"
              />
              <div className="mt-2">
                <OrderStatusBadge status={order.status} size="lg" />
              </div>
            </div>
          </div>

          {/* Customer Address / Notes Bubble */}
          {order.address && (
            <div className="mt-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 p-3 text-xs text-amber-950 flex items-start gap-2">
              <span className="text-sm leading-none shrink-0">📝</span>
              <div className="min-w-0">
                <p className="font-bold text-[11px] text-amber-800 uppercase tracking-wide">
                  Delivery Location & Instructions
                </p>
                <p className="font-semibold text-xs text-amber-900 mt-0.5">
                  {order.hostel_block ? `${order.hostel_block} • ` : ""}
                  {order.address}
                </p>
              </div>
            </div>
          )}

          <hr className="my-4 border-stone-100" />

          {/* Ordered Dishes */}
          <h3 className="mb-2.5 text-xs font-black uppercase tracking-wider text-stone-500">
            Ordered Items ({order.items.length})
          </h3>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={`${order._id}-${item.id}`}
                className="flex items-center justify-between rounded-xl bg-stone-50 p-2.5 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center justify-center rounded-lg bg-orange-600 text-white font-black text-xs px-2 py-0.5 shrink-0">
                    {item.quantity}x
                  </span>
                  <span className="font-bold text-stone-900 truncate">
                    {item.name}
                  </span>
                </div>
                <span className="font-extrabold text-stone-700 shrink-0 ml-2">
                  ₹{item.price * item.quantity}
                </span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-5">
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

