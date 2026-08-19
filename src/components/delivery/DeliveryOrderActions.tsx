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
        disabled={order.status !== "Assigned"}
        onClick={() => onUpdateStatus(order._id, "Picked Up")}
        className="rounded-lg bg-orange-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        📦 Picked Up
      </button>

      <button
        disabled={order.status !== "Picked Up"}
        onClick={() => onUpdateStatus(order._id, "Out for Delivery")}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        🛵 Out for Delivery
      </button>

      <button
        disabled={order.status !== "Out for Delivery"}
        onClick={() => onOpenOtp(order._id)}
        className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
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
