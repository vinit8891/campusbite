import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/common";
import { formatDateTime, shortId } from "@/lib/formatters";
import { formatPaymentMethod } from "@/lib/paymentLabels";
import { RestaurantOrderActions } from "./RestaurantOrderActions";
import { OrderPrepTimer } from "./OrderPrepTimer";
import {
  normalizeOrderStatus,
  isCompletedOrInactiveOrder,
  isOrderStale,
} from "@/lib/orderDomain";
import type { Order } from "@/types";

type RestaurantOrderCardListProps = {
  orders: Order[];
  onUpdateStatus?: (id: string, status: string) => void;
  isHistoryView?: boolean;
  className?: string;
};

function getHistoryStatusPill(status?: string, createdAt?: string) {
  const s = normalizeOrderStatus(status);
  const stale = createdAt ? isOrderStale(createdAt) : false;

  if (s === "delivered" || s === "completed") {
    return {
      label: "Delivered",
      className: "bg-emerald-50 text-emerald-800 border-emerald-200",
    };
  }
  if (s === "cancelled" || s === "rejected") {
    return {
      label: "Cancelled",
      className: "bg-rose-50 text-rose-800 border-rose-200",
    };
  }
  if (
    s === "picked_up" ||
    s === "picked up" ||
    s === "out_for_delivery" ||
    s === "out for delivery"
  ) {
    return {
      label: s.includes("out") ? "Out for Delivery" : "Picked Up",
      className: "bg-cyan-50 text-cyan-800 border-cyan-200",
    };
  }
  if (stale) {
    return {
      label: "Archived",
      className: "bg-stone-100 text-stone-700 border-stone-200",
    };
  }
  return {
    label: status || "Completed",
    className: "bg-stone-100 text-stone-700 border-stone-200",
  };
}

export function RestaurantOrderCardList({
  orders,
  onUpdateStatus,
  isHistoryView = false,
  className = "",
}: RestaurantOrderCardListProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {orders.map((order) => {
        const isStale = isOrderStale(order.created_at);
        const isCompleted = isCompletedOrInactiveOrder(order.status) || isStale;
        const statusPill = getHistoryStatusPill(order.status, order.created_at);

        if (isHistoryView) {
          return (
            <div
              key={order._id}
              className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs transition-all hover:shadow-sm"
            >
              {/* Top Row: #ID, Date/Time, and Prominent Status Pill */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="font-mono text-xs font-black text-stone-600"
                    title={order._id}
                  >
                    #{shortId(order._id)}
                  </span>
                  <span className="text-[11px] font-medium text-stone-400 truncate">
                    {formatDateTime(order.created_at)}
                  </span>
                </div>

                <span
                  className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusPill.className}`}
                >
                  {statusPill.label}
                </span>
              </div>

              {/* Middle Row: Customer name, tap-to-call phone link, delivery location */}
              <div className="mt-2.5 pt-2.5 border-t border-stone-100">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-base font-extrabold text-stone-900 truncate">
                    {order.customer_name || "Customer"}
                  </h3>
                  {order.phone && (
                    <a
                      href={`tel:${order.phone}`}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 active:text-orange-800 flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      📞 {order.phone}
                    </a>
                  )}
                </div>

                {order.address && (
                  <p className="text-xs text-stone-500 mt-1 flex items-start gap-1">
                    <span className="shrink-0 text-stone-400">📍</span>
                    <span className="line-clamp-2">
                      {order.hostel_block ? (
                        <strong className="text-stone-700 font-semibold">
                          {order.hostel_block} •{" "}
                        </strong>
                      ) : null}
                      {order.address}
                    </span>
                  </p>
                )}
              </div>

              {/* Items Breakdown */}
              <div className="mt-3 rounded-xl bg-stone-50/80 p-2.5 border border-stone-100/80 space-y-1.5">
                {order.items.map((item) => (
                  <div
                    key={`${order._id}-${item.id}`}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-extrabold text-orange-600">
                        {item.quantity}×
                      </span>
                      <span className="font-semibold text-stone-800 truncate">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-bold text-stone-600 shrink-0 ml-2">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bottom Row: Payment method & Bold Total */}
              <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-stone-600">
                    {formatPaymentMethod(order.payment_method)}
                  </span>
                  <PaymentStatusBadge
                    status={order.payment_status}
                    method={order.payment_method}
                    orderStatus={order.status}
                    size="sm"
                  />
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-stone-900">
                    ₹{Number(order.total ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* No active kitchen prep buttons on completed/inactive orders; only if active */}
              {!isCompleted && onUpdateStatus && (
                <div className="mt-3 pt-2.5 border-t border-stone-100">
                  <RestaurantOrderActions
                    order={order}
                    onUpdateStatus={onUpdateStatus}
                  />
                </div>
              )}
            </div>
          );
        }

        return (
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
                  <a
                    href={`tel:${order.phone}`}
                    className="text-sm font-semibold text-stone-600 hover:text-orange-600 active:text-orange-700 flex items-center gap-1 mt-0.5 transition-colors cursor-pointer"
                  >
                    📞 {order.phone}
                  </a>
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
                    Special Instructions / Location
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
                    <span className="inline-flex items-center justify-center rounded-lg bg-orange-600 text-white font-black text-xs px-2.5 py-0.5 shrink-0">
                      {item.quantity}×
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
            {onUpdateStatus && (
              <div className="mt-5">
                <RestaurantOrderActions
                  order={order}
                  onUpdateStatus={onUpdateStatus}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

