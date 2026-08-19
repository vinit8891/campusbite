import type { DeliveryOrder } from "@/types";

type MyDeliveryCardProps = {
  order: DeliveryOrder;
  onUpdateStatus: (id: string, status: string) => void;
  onOpenOtp: (orderId: string) => void;
};

export function MyDeliveryCard({
  order,
  onUpdateStatus,
  onOpenOtp,
}: MyDeliveryCardProps) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">
            🍽 {order.restaurant_email}
          </h2>
          <p>{order.customer_name}</p>
          <p>{order.phone}</p>
          <p className="text-gray-500">{order.address}</p>
        </div>

        <div className="text-right">
          <p className="text-xl font-bold text-orange-600">
            ₹{order.total}
          </p>
          <span className="rounded bg-blue-100 px-3 py-1">
            {order.status}
          </span>
        </div>
      </div>

      <hr className="my-5" />

      <h3 className="mb-3 font-semibold">Ordered Items</h3>

      {Array.isArray(order.items) && order.items.length > 0 ? (
        <div className="space-y-2">
          {order.items.map((item, idx) => (
            <div
              key={item.id ?? idx}
              className="flex justify-between"
            >
              <span>
                {item.name} × {item.quantity ?? 1}
              </span>
              <span>₹{(item.price ?? 0) * (item.quantity ?? 1)}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
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
          className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
        >
          🗺 Navigate
        </button>
      </div>
    </div>
  );
}
