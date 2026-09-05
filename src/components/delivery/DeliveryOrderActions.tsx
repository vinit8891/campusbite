import type { DeliveryOrder } from "@/types";

type DeliveryOrderActionsProps = {
  order: DeliveryOrder;
  onUpdateStatus: (id: string, status: string) => void;
  onOpenOtp: (orderId: string) => void;
};

export function DeliveryOrderActions({
  order,
  onUpdateStatus,
  onOpenOtp,
}: DeliveryOrderActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        disabled={order.status !== "Assigned"}
        onClick={(e) => {
          e.stopPropagation();
          console.log("Pickup button tapped for order:", order._id);
          onUpdateStatus(order._id, "Picked Up");
        }}
        className="relative z-10 rounded-lg bg-orange-600 hover:bg-orange-700 active:bg-orange-800 px-4 py-2 text-white font-bold text-xs select-none cursor-pointer active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-40"
      >
        📦 Picked Up
      </button>

      <button
        type="button"
        disabled={order.status !== "Picked Up"}
        onClick={(e) => {
          e.stopPropagation();
          onUpdateStatus(order._id, "Out for Delivery");
        }}
        className="relative z-10 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 py-2 text-white font-bold text-xs select-none cursor-pointer active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-40"
      >
        🛵 Out for Delivery
      </button>

      <button
        type="button"
        disabled={order.status !== "Out for Delivery"}
        onClick={(e) => {
          e.stopPropagation();
          onOpenOtp(order._id);
        }}
        className="relative z-10 rounded-lg bg-green-600 hover:bg-green-700 active:bg-green-800 px-4 py-2 text-white font-bold text-xs select-none cursor-pointer active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-40"
      >
        ✅ Delivered
      </button>

      {order.status === "Out for Delivery" && (
        <button
          onClick={() =>
            window.open(`/track-order/${order._id}`, "_blank")
          }
          className="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-700"
        >
          📍 Live Tracking
        </button>
      )}

      <button
        onClick={() => {
          if (order.latitude != null && order.longitude != null) {
            window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`,
              "_blank"
            );
          } else {
            window.open(
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                order.address || ""
              )}`,
              "_blank"
            );
          }
        }}
        className="rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-800"
      >
        🗺 Navigate
      </button>
    </div>
  );
}
