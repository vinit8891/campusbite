import {
  Clock3,
  MapPin,
  Navigation,
  Phone,
  User,
  Zap,
  FileText,
} from "lucide-react";
import { formatDateTime, shortId, formatRestaurantName } from "@/lib/formatters";
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
  const canteenName = formatRestaurantName(
    order.restaurant_name || order.restaurant_email
  );

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden box-border rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-6 shadow-xs transition-all hover:shadow-md">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-stone-100">
        <div className="space-y-1 min-w-0 max-w-full flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
              #{shortId(order._id)}
            </span>
            <span className="rounded-xl bg-orange-100/90 px-2.5 py-0.5 text-[11px] font-bold text-orange-800">
              🟢 Ready for Pickup
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight pt-1 truncate">
            🏪 {canteenName}
          </h2>
        </div>

        {/* Payout Pill */}
        <div className="rounded-xl bg-emerald-100/90 border border-emerald-200 px-2.5 py-1 text-xs sm:text-sm max-w-full text-right shrink-0">
          <span className="font-black text-emerald-900 flex items-center gap-1">
            💰 +₹20 Payout
          </span>
        </div>
      </div>

      {/* Middle Destination & Customer Details */}
      <div className="py-3.5 space-y-2 text-xs sm:text-sm text-stone-600 min-w-0 max-w-full">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="flex items-center gap-1.5 font-semibold text-stone-800">
            <User size={15} className="text-stone-400 shrink-0" />
            <span>{order.customer_name || "Student Customer"}</span>
          </p>

          {order.phone ? (
            <p className="flex items-center gap-1.5 text-stone-600">
              <Phone size={15} className="text-stone-400 shrink-0" />
              <a
                href={`tel:${order.phone}`}
                className="hover:text-orange-600 hover:underline"
              >
                {order.phone}
              </a>
            </p>
          ) : null}
        </div>

        <p className="flex items-start gap-1.5">
          <MapPin size={16} className="text-orange-500 shrink-0 mt-0.5" />
          <span className="font-semibold text-stone-900 truncate">
            {order.address || "Campus Hostel Dropoff"}
          </span>
        </p>

        {/* Special Instructions / Note */}
        {order.special_instructions || (order as { notes?: string }).notes ? (
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200/70 px-2.5 py-1 text-[11px] font-medium text-amber-900 max-w-full truncate">
            <FileText className="h-3 w-3 text-amber-600 shrink-0" />
            <span className="truncate">
              Note: {order.special_instructions || (order as { notes?: string }).notes}
            </span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-stone-500">
          <span suppressHydrationWarning className="flex items-center gap-1">
            <Clock3 size={13} className="text-stone-400" />
            {formatDateTime(order.created_at)}
          </span>

          <span>•</span>
          <span className="font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
            {formatPaymentMethod(order.payment_method)} ({formatPaymentStatus(
              order.payment_status,
              order.payment_method,
              order.status
            )})
          </span>
        </div>
      </div>

      {/* Food Items Breakdown */}
      {Array.isArray(order.items) && order.items.length > 0 ? (
        <div className="mb-4 rounded-xl bg-stone-50 border border-stone-200/60 p-3 min-w-0 max-w-full">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500">
              Food Items ({order.items.length})
            </h3>
            <span className="text-xs font-black text-stone-900">
              Order Value: ₹{order.total ?? 0}
            </span>
          </div>
          <div className="space-y-1 text-xs text-stone-700">
            {order.items.map((item, index) => (
              <div
                key={item.id || `${item.name}-${index}`}
                className="flex justify-between"
              >
                <span className="truncate pr-2">
                  {item.name || "Item"} × {item.quantity || 1}
                </span>
                <span className="font-semibold text-stone-900 shrink-0">
                  ₹{(item.price || 0) * (item.quantity || 1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Bottom Action Footer with 48px Touch Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-stone-100 min-w-0 max-w-full">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <span className="text-xs text-stone-500">
            Order Total: <strong className="text-stone-900 font-black">₹{order.total ?? 0}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onNavigate(order)}
            className="h-12 flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-4 text-xs font-bold text-stone-700 transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
          >
            <Navigation size={15} className="text-blue-600" />
            <span>Map Route</span>
          </button>

          <button
            type="button"
            onClick={() => onAccept(order._id)}
            disabled={isAccepting}
            className="h-12 flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-98 px-6 text-sm font-black text-white transition-all shadow-xs disabled:opacity-60 cursor-pointer"
          >
            <Zap className="h-4 w-4 fill-white shrink-0" />
            <span>{isAccepting ? "Claiming…" : "⚡ Claim Run • ₹20 Payout"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AvailableOrderCard;
