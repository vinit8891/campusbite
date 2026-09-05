import { isOnlinePayment } from "@/lib/paymentLabels";
import {
  normalizeOrderStatus,
  isNewOrder,
  isCookingOrder,
  isReadyOrder,
  isCompletedOrInactiveOrder,
  isOrderStale,
} from "@/lib/orderDomain";
import type { Order } from "@/types";

type RestaurantOrderActionsProps = {
  order: Order;
  onUpdateStatus: (id: string, status: string) => void;
};

export function RestaurantOrderActions({
  order,
  onUpdateStatus,
}: RestaurantOrderActionsProps) {
  const normStatus = normalizeOrderStatus(order.status);
  const isStale = isOrderStale(order.created_at);
  const isCompleted = isCompletedOrInactiveOrder(order.status);

  if (isStale) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
          <span>🕒</span>
          <span>Archived / Stale (&gt;24h)</span>
        </span>
      </div>
    );
  }

  if (isCompleted) {
    let message = "Completed";
    let icon = "✅";
    if (normStatus === "delivered" || normStatus === "completed") {
      message = "Order Delivered";
      icon = "🎉";
    } else if (
      normStatus === "picked_up" ||
      normStatus === "out_for_delivery" ||
      normStatus === "picked up" ||
      normStatus === "out for delivery"
    ) {
      message = "Handed to Courier";
      icon = "🚴";
    } else if (normStatus === "cancelled" || normStatus === "rejected") {
      message = "Cancelled / Inactive";
      icon = "❌";
    }

    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
          <span>{icon}</span>
          <span>{message}</span>
        </span>
      </div>
    );
  }

  const isUnpaidOnline =
    isOnlinePayment(order.payment_method) && order.payment_status !== "paid";

  const isPending = isNewOrder(order.status);
  const isCooking = isCookingOrder(order.status);
  const isReady = isReadyOrder(order.status);

  return (
    <div className="flex flex-wrap gap-2.5">
      {isUnpaidOnline ? (
        <p className="w-full text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
          ⚠️ Waiting for online payment confirmation before kitchen processing.
        </p>
      ) : null}

      {isPending && (
        <>
          <button
            type="button"
            disabled={isUnpaidOnline}
            onClick={() => onUpdateStatus(order._id, "Preparing")}
            className="h-12 flex-1 min-w-[170px] rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white font-extrabold text-sm shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🍳 Accept &amp; Start Cooking</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdateStatus(order._id, "Cancelled")}
            className="h-12 px-4 rounded-xl bg-stone-100 hover:bg-rose-50 hover:text-rose-700 active:scale-98 text-stone-600 font-bold text-xs border border-stone-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            ❌ Reject
          </button>
        </>
      )}

      {isCooking && (
        <button
          type="button"
          disabled={isUnpaidOnline}
          onClick={() => onUpdateStatus(order._id, "Ready for Pickup")}
          className="h-12 flex-1 min-w-[170px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-sm shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
        >
          <span>📦 Mark Ready for Pickup</span>
        </button>
      )}

      {isReady && (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span>✅ Ready at Counter • Awaiting Runner</span>
        </span>
      )}
    </div>
  );
}

