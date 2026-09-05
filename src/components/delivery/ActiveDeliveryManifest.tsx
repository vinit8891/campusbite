import { useState, useEffect } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  IndianRupee,
  MapPin,
  Navigation,
  Phone,
  Store,
  User,
  KeyRound,
  FileText,
} from "lucide-react";
import { OrderStatusBadge } from "@/components/common";
import { shortId, formatDateTime, formatRestaurantName } from "@/lib/formatters";
import {
  formatPaymentMethod,
  formatPaymentStatus,
} from "@/lib/paymentLabels";
import type { DeliveryOrder } from "@/types";

type ActiveDeliveryManifestProps = {
  order: DeliveryOrder;
  onUpdateStatus: (id: string, status: string) => void;
  onOpenOtp: (orderId: string) => void;
};

export function ActiveDeliveryManifest({
  order,
  onUpdateStatus,
  onOpenOtp,
}: ActiveDeliveryManifestProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Track checked items for canteen pickup validation
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const statusLower = (order.status || "").toLowerCase();
  const isAssigned = statusLower === "assigned";
  const isPickedUp = statusLower === "picked up";
  const isOutForDelivery = statusLower === "out for delivery";
  const isDelivered = statusLower === "delivered";

  const totalItemsCount = Array.isArray(order.items) ? order.items.length : 0;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const allItemsChecked = totalItemsCount > 0 && checkedCount >= totalItemsCount;

  function toggleItemCheck(key: string) {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleConfirmPickup() {
    onUpdateStatus(order._id, "Picked Up");
  }

  const canteenName = formatRestaurantName(
    order.restaurant_name || order.restaurant_email
  );

  const mapUrl =
    order.latitude != null && order.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          order.address || ""
        )}`;

  return (
    <div className="w-full max-w-full min-w-0 box-border rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-5 transition-all hover:shadow-md">
      {/* Manifest Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-4">
        <div className="min-w-0 max-w-full flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-md">
              Order #{shortId(order._id)}
            </span>
            <OrderStatusBadge status={order.status} size="sm" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight pt-1.5 flex items-center gap-2 truncate">
            <Store className="h-5 w-5 text-orange-600 shrink-0" />
            <span className="truncate">{canteenName}</span>
          </h2>

          <p
            suppressHydrationWarning
            className="flex items-center gap-1.5 text-xs text-stone-500 pt-0.5"
          >
            <Clock3 size={13} className="text-stone-400 shrink-0" />
            <span suppressHydrationWarning>
              Assigned at {formatDateTime(order.created_at)}
            </span>
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Order Total
          </span>
          <div className="flex items-center justify-end text-2xl sm:text-3xl font-black text-stone-900">
            <IndianRupee size={22} className="text-stone-400" />
            <span>{order.total ?? 0}</span>
          </div>
          <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-emerald-800">
            <span>{formatPaymentMethod(order.payment_method)}</span>
            <span>•</span>
            <span>
              {formatPaymentStatus(
                order.payment_status,
                order.payment_method,
                order.status
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Stage 1: Item Checklist or Completed Banner */}
      {isDelivered ? (
        /* Completed Delivery Summary Card */
        <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 via-emerald-50/30 to-white p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>✅ Delivery Completed • Verified via OTP 🎉</span>
            </h3>
            <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              {totalItemsCount} {totalItemsCount === 1 ? "Item Delivered" : "Items Delivered"}
            </span>
          </div>

          {Array.isArray(order.items) && order.items.length > 0 ? (
            <div className="rounded-xl border border-emerald-100/80 bg-white/90 p-3 space-y-1.5 text-xs sm:text-sm text-stone-700">
              {order.items.map((item, index) => (
                <div
                  key={item.id || `${item.name}-${index}`}
                  className="flex justify-between items-center py-1 border-b border-stone-100 last:border-0"
                >
                  <span className="font-medium text-stone-800 truncate pr-2">
                    {item.name || "Item"} × {item.quantity || 1}
                  </span>
                  <span className="font-semibold text-stone-600 shrink-0">
                    ₹{(item.price || 0) * (item.quantity || 1)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-500 italic">No item details recorded.</p>
          )}
        </div>
      ) : (
        /* Active Order Item Packing Checklist */
        <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/50 via-orange-50/20 to-white p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <span>📦 ITEM PACKING CHECKLIST</span>
                {totalItemsCount > 0 && (
                  <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[11px] font-bold text-amber-950">
                    {checkedCount}/{totalItemsCount} Checked
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-amber-800/80 font-medium">
                Verify and check off each food item at the counter before pickup.
              </p>
            </div>

            {allItemsChecked && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 shrink-0">
                <CheckCircle2 size={14} /> Ready for transit
              </span>
            )}
          </div>

          {Array.isArray(order.items) && order.items.length > 0 ? (
            <div className="space-y-2">
              {order.items.map((item, index) => {
                const itemKey = String(item.id || `${item.name}-${index}`);
                const isChecked = Boolean(checkedItems[itemKey]);

                return (
                  <label
                    key={itemKey}
                    onClick={() => toggleItemCheck(itemKey)}
                    className={`flex items-center justify-between rounded-xl border p-3 text-xs sm:text-sm transition-all cursor-pointer ${
                      isChecked
                        ? "border-emerald-300 bg-emerald-50/70 text-emerald-950 font-bold"
                        : "border-stone-200 bg-white text-stone-800 hover:border-amber-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by label click
                        className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer shrink-0"
                      />
                      <span className="truncate">
                        {item.name || "Item"} × {item.quantity || 1}
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-stone-500 shrink-0">
                      ₹{(item.price || 0) * (item.quantity || 1)}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-stone-500 italic">No item details provided.</p>
          )}

          {/* Pickup Action Button */}
          {isAssigned && (
            <div className="pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log(
                    "Pickup button tapped for order:",
                    order._id || (order as { id?: string }).id
                  );
                  handleConfirmPickup();
                }}
                className="relative z-10 w-full h-11 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-extrabold text-xs sm:text-sm shadow-xs active:scale-[0.98] select-none cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <span>📦 Confirm All Items &amp; Mark Picked Up</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stage 2: Destination & Hostel Dropoff Details */}
      <div className="rounded-2xl border border-stone-200/90 bg-stone-50/60 p-4 sm:p-5 space-y-3">
        <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-stone-700 flex items-center gap-2">
          <MapPin size={16} className="text-orange-600" />
          <span>Hostel Dropoff &amp; Recipient</span>
        </h3>

        <div className="space-y-2 text-xs sm:text-sm text-stone-700">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-bold text-stone-900 text-sm sm:text-base">
              <User size={16} className="text-stone-400" />
              <span>{order.customer_name || "Student Customer"}</span>
            </p>

            {order.phone && (
              <a
                href={`tel:${order.phone}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer select-none"
              >
                <Phone size={13} />
                <span>Call {order.phone}</span>
              </a>
            )}
          </div>

          <div className="rounded-xl bg-white border border-stone-200 p-3 space-y-1">
            <p className="font-bold text-stone-900 text-sm">
              📍 {order.address || "Campus Hostel Drop Location"}
            </p>
            {order.customer_email && (
              <p className="text-xs text-stone-500">
                Email: {order.customer_email}
              </p>
            )}
          </div>

          {/* Delivery Instructions Callout */}
          <div className="flex items-start gap-2 rounded-xl bg-amber-50/80 border border-amber-200/80 p-2.5 text-xs text-amber-950">
            <FileText size={14} className="text-amber-700 shrink-0 mt-0.5" />
            <p>
              <span className="font-bold text-amber-900">Delivery Rule:</span> Ask
              the recipient for the 4-digit handover OTP upon arrival before handing
              over the food bag.
            </p>
          </div>
        </div>

        {/* Action Controls for Transit & Handover */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2">
          {/* Out for Delivery Action */}
          {isPickedUp && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(order._id, "Out for Delivery");
              }}
              className="relative z-10 flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs sm:text-sm shadow-xs active:scale-[0.98] select-none cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <span>🛵 Start Delivery Trip (Out for Delivery)</span>
              <ChevronRight size={16} />
            </button>
          )}

          {/* Complete Delivery / OTP Handover Trigger */}
          {isOutForDelivery && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenOtp(order._id);
              }}
              className="relative z-10 flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm sm:text-base shadow-sm active:scale-[0.98] select-none cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <KeyRound size={18} />
              <span>🔐 Complete Delivery &amp; Verify OTP</span>
            </button>
          )}

          {/* GPS Directions Link */}
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-4 text-xs font-bold text-stone-700 shadow-xs transition-colors cursor-pointer"
          >
            <Navigation size={14} className="text-blue-600" />
            <span>Open GPS Map</span>
          </a>

          {isDelivered && (
            <span className="rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 px-4 py-2 text-xs font-extrabold flex items-center gap-1.5">
              <CheckCircle2 size={16} /> Delivered Successfully (+₹20 Earned)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActiveDeliveryManifest;
