import { shortId } from "@/lib/formatters";
import { formatPaymentMethod } from "@/lib/paymentLabels";
import {
  formatDeliveredTime,
  storedEarnings,
  type HistoryOrder,
} from "@/hooks/delivery/useDeliveryHistory";

type DeliveryHistoryCardListProps = {
  orders: HistoryOrder[];
};

export function DeliveryHistoryCardList({
  orders,
}: DeliveryHistoryCardListProps) {
  return (
    <div className="space-y-4 lg:hidden">
      {orders.map((order) => {
        const earnings = storedEarnings(order);
        return (
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
                  {order.restaurant_email || "Restaurant"}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  {order.address || "Address not available"}
                </p>
              </div>
              <p className="text-xl font-bold text-orange-600">
                ₹{order.total ?? 0}
              </p>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-gray-600">
              <p suppressHydrationWarning>
                <span className="font-medium text-gray-800">
                  Delivered:
                </span>{" "}
                {formatDeliveredTime(order)}
              </p>
              <p>
                <span className="font-medium text-gray-800">
                  Payment:
                </span>{" "}
                {formatPaymentMethod(order.payment_method)}
              </p>
              {earnings !== null ? (
                <p>
                  <span className="font-medium text-gray-800">
                    Delivery earnings:
                  </span>{" "}
                  ₹{earnings}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
