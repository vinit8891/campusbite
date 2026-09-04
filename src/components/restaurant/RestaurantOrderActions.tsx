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
  const isUnpaidOnline =
    isOnlinePayment(order.payment_method) && order.payment_status !== "paid";

  return (
    <div className="flex flex-wrap gap-2.5">
      {isUnpaidOnline ? (
        <p className="w-full text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
          ⚠️ Waiting for online payment confirmation before kitchen processing.
        </p>
      ) : null}

      <button
        disabled={order.status !== "Pending" || isUnpaidOnline}
        onClick={() => onUpdateStatus(order._id, "Accepted")}
        className="h-12 flex-1 min-w-[140px] rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white font-extrabold text-sm shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
      >
        ✅ Accept Order (15m)
      </button>

      <button
        disabled={order.status !== "Accepted" || isUnpaidOnline}
        onClick={() => onUpdateStatus(order._id, "Preparing")}
        className="h-12 flex-1 min-w-[120px] rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-sm shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
      >
        🍳 Cooking
      </button>

      <button
        disabled={order.status !== "Preparing" || isUnpaidOnline}
        onClick={() => onUpdateStatus(order._id, "Ready for Pickup")}
        className="h-12 flex-1 min-w-[160px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-sm shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
      >
        📦 Mark Ready for Pickup
      </button>

      <button
        disabled={order.status === "Delivered" || order.status === "Cancelled"}
        onClick={() => onUpdateStatus(order._id, "Cancelled")}
        className="h-12 px-4 rounded-xl bg-stone-100 hover:bg-rose-50 hover:text-rose-700 active:scale-98 text-stone-600 font-bold text-xs border border-stone-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        ❌ Reject
      </button>
    </div>
  );
}

