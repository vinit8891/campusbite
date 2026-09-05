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
import { toast } from "sonner";
import { OrderStatusBadge } from "@/components/common";
import { shortId, formatDateTime, formatRestaurantName } from "@/lib/formatters";
import {
  formatPaymentMethod,
  formatPaymentStatus,
} from "@/lib/paymentLabels";
import { getDirectionsUrl } from "@/lib/geolocation";
import { useDeliveryOrders } from "@/hooks/delivery/useDeliveryOrders";
import type { DeliveryOrder } from "@/types";

type ActiveDeliveryManifestProps = {
  order: DeliveryOrder;
  onUpdateStatus?: (id: string, status: string) => void | Promise<void>;
  onConfirmPickup?: (id: string) => void | Promise<void>;
  onPickup?: (id: string) => void | Promise<void>;
  onOpenOtp?: (orderId: string) => void;
};

export function ActiveDeliveryManifest({
  order,
  onUpdateStatus,
  onConfirmPickup,
  onPickup,
  onOpenOtp,
}: ActiveDeliveryManifestProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { updateStatus } = useDeliveryOrders();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Track checked items for canteen pickup validation
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const currentStatus = (order.status || "")
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .trim();
  const isAssigned = currentStatus === "assigned";
  const isEnRoute = [
    "picked up",
    "out for delivery",
    "in transit",
    "on the way",
  ].includes(currentStatus);
  const isDelivered = ["delivered", "completed"].includes(currentStatus);

  const items = Array.isArray(order.items) ? order.items : [];
  const totalItemsCount = items.length;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const allItemsChecked = totalItemsCount > 0 && checkedCount >= totalItemsCount;

  function toggleItemCheck(key: string) {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const handleConfirmPickup = async () => {
    const orderId = order._id || (order as { id?: string }).id;
    console.log("handleConfirmPickup initiated for order ID:", orderId);

    if (!orderId) {
      toast.error("Invalid order ID");
      return;
    }

    try {
      setIsSubmitting(true);
      console.log("Sending status update: Picked Up for", orderId);

      // Guarantee backend API mutation
      await updateStatus(orderId, "Picked Up");

      // Call optional parent callbacks if present
      if (typeof onConfirmPickup === "function") await onConfirmPickup(orderId);
      if (typeof onPickup === "function") await onPickup(orderId);
      if (typeof onUpdateStatus === "function") await onUpdateStatus(orderId, "Picked Up");

      toast.success("Order marked as Picked Up!");
    } catch (err: unknown) {
      console.error("Failed to mark picked up:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to confirm pickup"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canteenName = formatRestaurantName(
    order.restaurant_name || order.restaurant_email
  );

  const mapUrl = getDirectionsUrl(
    order.latitude,
    order.longitude,
    order.address
  );

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

      {/* Stage 1: Item Checklist or En-Route / Completed Banner */}
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

          {items.length > 0 ? (
            <div className="rounded-xl border border-emerald-100/80 bg-white/90 p-3 space-y-1.5 text-xs sm:text-sm text-stone-700">
              {items.map((item, index) => (
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
      ) : isEnRoute ? (
        /* In Transit / Picked Up Banner */
        <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/60 via-indigo-50/30 to-white p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-blue-900 flex items-center gap-2">
              <Navigation className="h-4 w-4 text-blue-600 shrink-0" />
              <span>🛵 Order In Transit to Hostel Dropoff</span>
            </h3>
            <span className="rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
              {totalItemsCount} {totalItemsCount === 1 ? "Item Picked Up" : "Items Picked Up"}
            </span>
          </div>

          {items.length > 0 ? (
            <div className="rounded-xl border border-blue-100/80 bg-white/90 p-3 space-y-1.5 text-xs sm:text-sm text-stone-700">
              {items.map((item, index) => (
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

          {items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item, index) => {
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
                disabled={isSubmitting}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log(
                    "Pickup button tapped for order:",
                    order._id || (order as { id?: string }).id
                  );
                  void handleConfirmPickup();
                }}
                className="relative z-10 w-full h-11 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-extrabold text-xs sm:text-sm shadow-xs active:scale-[0.98] select-none cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>
                  {isSubmitting
                    ? "Updating..."
                    : "📦 Confirm All Items & Mark Picked Up"}
                </span>
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
          {/* Complete Delivery / OTP Handover Trigger */}
          {isEnRoute && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const orderId = order._id || (order as { id?: string }).id;
                if (orderId && typeof onOpenOtp === "function") {
                  onOpenOtp(orderId);
                }
              }}
              className="w-full py-3.5 px-4 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer relative z-10 select-none active:scale-[0.98] transition-all"
            >
              <KeyRound size={18} />
              <span>🔑 Enter Delivery OTP to Complete</span>
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

