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
    <div className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-7 shadow-xs transition-all hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
              Order #{shortId(order._id)}
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800">
              +₹20 Runner Fee
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight pt-1">
            {order.restaurant_email || "Campus Canteen"}
          </h2>

          <div className="mt-3 space-y-2 text-xs sm:text-sm text-stone-600">
            <p className="flex items-center gap-2">
              <User size={16} className="text-stone-400 shrink-0" />
              <span className="font-semibold text-stone-800">
                {order.customer_name || "Student Customer"}
              </span>
            </p>

            <p className="flex items-center gap-2">
              <Phone size={16} className="text-stone-400 shrink-0" />
              <span>{order.phone || "—"}</span>
            </p>

            <p className="flex items-start gap-2">
              <MapPin size={16} className="text-orange-500 shrink-0 mt-0.5" />
              <span className="font-medium text-stone-800">
                {order.address || "Hostel Delivery Location"}
              </span>
            </p>

            <p className="flex items-center gap-2 text-stone-500 text-xs">
              <Clock3 size={14} className="text-stone-400 shrink-0" />
              <span>{formatDateTime(order.created_at)}</span>
            </p>

            {order.distance != null && order.distance !== "" ? (
              <p className="text-xs font-semibold text-stone-500">
                📍 Distance: {order.distance}
              </p>
            ) : null}
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="inline-block rounded-full bg-amber-100/80 px-3 py-1 text-xs font-bold text-amber-900">
            {formatPaymentMethod(order.payment_method)}
          </div>
          <p className="text-xs text-stone-500 font-medium">
            {formatPaymentStatus(
              order.payment_status,
              order.payment_method,
              order.status
            )}
          </p>

          <div className="mt-3 flex items-center justify-end text-3xl font-black text-stone-900">
            <IndianRupee size={24} className="text-stone-400" />
            <span>{order.total ?? 0}</span>
          </div>
        </div>
      </div>

      {Array.isArray(order.items) && order.items.length > 0 ? (
        <div className="mt-5 rounded-2xl bg-stone-50 border border-stone-200/60 p-4">
          <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-stone-500">
            Food Items ({order.items.length})
          </h3>
          <div className="space-y-1.5 text-xs sm:text-sm">
            {order.items.map((item, index) => (
              <div
                key={item.id || `${item.name}-${index}`}
                className="flex justify-between text-stone-700"
              >
                <span>
                  {item.name || "Item"} × {item.quantity || 1}
                </span>
                <span className="font-bold text-stone-900">
                  ₹{(item.price || 0) * (item.quantity || 1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
          🟢 Ready for Pickup
        </span>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate(order)}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-4 py-2.5 text-xs font-bold text-stone-700 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Navigation size={15} className="text-blue-600" />
            <span>Map Route</span>
          </button>

          <button
            type="button"
            onClick={() => onAccept(order._id)}
            disabled={isAccepting}
            className="flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 px-5 py-2.5 text-xs font-extrabold text-white transition-all shadow-xs disabled:opacity-60 cursor-pointer"
          >
            <span>{isAccepting ? "Claiming…" : "🚴 Claim Delivery Run"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
