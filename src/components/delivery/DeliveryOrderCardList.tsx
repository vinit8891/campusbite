import {
  OrderStatusBadge,
} from "@/components/common";
import { shortId } from "@/lib/formatters";
import {
  formatPaymentMethod,
  formatPaymentStatus,
} from "@/lib/paymentLabels";
import { formatAssignedTime } from "@/hooks/delivery/useDeliveryOrders";
import { DeliveryOrderActions } from "./DeliveryOrderActions";
import type { DeliveryOrder } from "@/types";

type DeliveryOrderCardListProps = {
  orders: DeliveryOrder[];
  onUpdateStatus: (id: string, status: string) => void;
  onOpenOtp: (orderId: string) => void;
};

export function DeliveryOrderCardList({
  orders,
  onUpdateStatus,
  onOpenOtp,
}: DeliveryOrderCardListProps) {
  return (
    <div className="space-y-4 lg:hidden">
      {orders.map((order) => (
        <div
          key={order._id}
          className="rounded-2xl border bg-white p-6 shadow"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-gray-500">
                {shortId(order._id)}
              </p>
              <h2 className="mt-1 text-xl font-bold">
                {order.customer_name || "Customer"}
              </h2>
              <p className="text-sm text-gray-500">
                {order.customer_email || order.phone || "—"}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {order.address || "Address not available"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-orange-600">
                ₹{order.total ?? 0}
              </p>
              <div className="mt-2">
                <OrderStatusBadge status={order.status} size="sm" />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-gray-600">
            <p>
              <span className="font-medium text-gray-800">
                Payment:
              </span>{" "}
              {formatPaymentMethod(order.payment_method)}
            </p>
            <p>
              <span className="font-medium text-gray-800">
                Payment status:
              </span>{" "}
              {formatPaymentStatus(
                order.payment_status,
                order.payment_method
              )}
            </p>
            <p>
              <span className="font-medium text-gray-800">
                Assigned:
              </span>{" "}
              {formatAssignedTime(order)}
            </p>
          </div>

          {Array.isArray(order.items) && order.items.length > 0 ? (
            <>
              <hr className="my-4" />
              <div className="space-y-2 text-sm">
                {order.items.map((item, index) => (
                  <div
                    key={item.id || `${item.name}-${index}`}
                    className="flex justify-between gap-3"
                  >
                    <span>
                      {item.name || "Item"} × {item.quantity || 1}
                    </span>
                    <span>
                      ₹{(item.price || 0) * (item.quantity || 1)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className="mt-5">
            <DeliveryOrderActions
              order={order}
              onUpdateStatus={onUpdateStatus}
              onOpenOtp={onOpenOtp}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
