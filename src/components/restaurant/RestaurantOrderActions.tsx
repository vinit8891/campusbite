import { isOnlinePayment } from "@/lib/paymentLabels";
import type { Order } from "@/types";

type RestaurantOrderActionsProps = {
  order: Order;
  onUpdateStatus: (id: string, status: string) => void;
};

export function RestaurantOrderActions({
  order,
  onUpdateStatus,
}: RestaurantOrderActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {isOnlinePayment(order.payment_method) &&
      order.payment_status !== "paid" ? (
        <p className="w-full text-sm font-medium text-amber-700">
          Waiting for online payment before kitchen processing.
        </p>
      ) : null}

      <button
        disabled={
          order.status !== "Pending" ||
          (isOnlinePayment(order.payment_method) &&
            order.payment_status !== "paid")
        }
        onClick={() => onUpdateStatus(order._id, "Accepted")}
        className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-40"
      >
        ✅ Accept
      </button>

      <button
        disabled={
          order.status !== "Accepted" ||
          (isOnlinePayment(order.payment_method) &&
            order.payment_status !== "paid")
        }
        onClick={() => onUpdateStatus(order._id, "Preparing")}
        className="rounded-lg bg-yellow-500 px-4 py-2 text-white disabled:opacity-40"
      >
        🍳 Preparing
      </button>

      <button
        disabled={
          order.status !== "Preparing" ||
          (isOnlinePayment(order.payment_method) &&
            order.payment_status !== "paid")
        }
        onClick={() => onUpdateStatus(order._id, "Ready for Pickup")}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-40"
      >
        📦 Ready for Pickup
      </button>

      <button
        disabled={
          order.status === "Delivered" || order.status === "Cancelled"
        }
        onClick={() => onUpdateStatus(order._id, "Cancelled")}
        className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-40"
      >
        ❌ Reject
      </button>
    </div>
  );
}
