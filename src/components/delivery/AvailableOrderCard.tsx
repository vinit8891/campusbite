import {
  Clock3,
  IndianRupee,
  MapPin,
  Navigation,
  Phone,
  User,
} from "lucide-react";
import { formatDateTime, shortId } from "@/lib/formatters";
import {
  formatPaymentMethod,
  formatPaymentStatus,
} from "@/lib/paymentLabels";
import type { AvailableOrder } from "@/hooks/delivery/useAvailableOrders";

type AvailableOrderCardProps = {
  order: AvailableOrder;
  isAccepting: boolean;
  onAccept: (id: string) => void;
  onNavigate: (order: AvailableOrder) => void;
};

export function AvailableOrderCard({
  order,
  isAccepting,
  onAccept,
  onNavigate,
}: AvailableOrderCardProps) {
  return (
    <div className="rounded-3xl border bg-white p-7 shadow transition hover:-translate-y-1 hover:shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-gray-500">
            Order ID: {shortId(order._id)}
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            {order.restaurant_email || "Restaurant"}
          </h2>

          <div className="mt-3 space-y-2 text-gray-600">
            <p className="flex items-center gap-2">
              <User size={18} />
              {order.customer_name || "Customer"}
            </p>

            <p className="flex items-center gap-2">
              <Phone size={18} />
              {order.phone || "—"}
            </p>

            <p className="flex items-center gap-2">
              <MapPin size={18} />
              {order.address || "Address not available"}
            </p>

            <p className="flex items-center gap-2">
              <Clock3 size={18} />
              {formatDateTime(order.created_at)}
            </p>

            {order.distance != null && order.distance !== "" ? (
              <p className="text-sm text-gray-500">
                Distance: {order.distance}
              </p>
            ) : null}
          </div>
        </div>

        <div className="text-right">
          <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
            {formatPaymentMethod(order.payment_method)}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {formatPaymentStatus(
              order.payment_status,
              order.payment_method,
              order.status
            )}
          </p>

          <div className="mt-5 flex items-center justify-end text-4xl font-bold text-orange-600">
            <IndianRupee size={30} />
            {order.total ?? 0}
          </div>
        </div>
      </div>

      {Array.isArray(order.items) && order.items.length > 0 ? (
        <div className="mt-8 rounded-2xl bg-gray-50 p-5">
          <h3 className="mb-4 text-lg font-bold">Ordered Items</h3>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div
                key={item.id || `${item.name}-${index}`}
                className="flex justify-between"
              >
                <span>
                  {item.name || "Item"} × {item.quantity || 1}
                </span>
                <span className="font-semibold">
                  ₹{(item.price || 0) * (item.quantity || 1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-5">
        <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
          Ready for Pickup
        </span>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => onNavigate(order)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-lg font-semibold text-white transition hover:bg-blue-700"
          >
            <Navigation size={20} />
            Navigate
          </button>

          <button
            onClick={() => onAccept(order._id)}
            disabled={isAccepting}
            className="rounded-xl bg-green-600 px-8 py-3 text-lg font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
          >
            {isAccepting ? "Accepting..." : "🚴 Accept Delivery"}
          </button>
        </div>
      </div>
    </div>
  );
}
