"use client";

import { useState } from "react";
import {
  Navigation,
  Phone,
  MapPin,
  Store,
  Banknote,
  IndianRupee,
  Copy,
  Check,
  CheckCircle2,
  Clock3,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { getDirectionsUrl } from "@/lib/geolocation";
import { formatDateTime, shortId, formatRestaurantName } from "@/lib/formatters";
import { formatPaymentMethod } from "@/lib/paymentLabels";
import type { DeliveryOrder } from "@/types";

export interface RunnerOrderCardProps {
  order: DeliveryOrder;
  index?: number;
  onUpdateStatus?: (id: string, status: string) => void | Promise<void>;
  onConfirmPickup?: (id: string) => void | Promise<void>;
  onPickup?: (id: string) => void | Promise<void>;
  onOpenOtp?: (orderId: string) => void;
}

export function RunnerOrderCard({
  order,
  index = 0,
  onUpdateStatus,
  onConfirmPickup,
  onPickup,
  onOpenOtp,
}: RunnerOrderCardProps) {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [showItems, setShowItems] = useState(false);

  const orderId = order._id || (order as { id?: string }).id || "";
  const orderIdSuffix = orderId ? orderId.slice(-6).toUpperCase() : "ORDER";
  const orderTotal = (order as { total_amount?: number }).total_amount ?? order.total ?? 0;

  const isCod =
    formatPaymentMethod(order.payment_method).toLowerCase().includes("cod") ||
    (order.payment_method || "").toLowerCase().includes("cash") ||
    order.payment_method === "cod" ||
    order.payment_method === "cash_on_delivery";

  const status = (order.status || "Assigned").trim();
  const isAssigned = status.toLowerCase() === "assigned";
  const isEnRoute =
    status.toLowerCase() === "picked up" ||
    status.toLowerCase() === "out for delivery" ||
    status.toLowerCase() === "in transit";
  const isDelivered =
    status.toLowerCase() === "delivered" ||
    status.toLowerCase() === "completed";

  // Batch Role & Courier Wage Resolution
  const isFirstBatchOrder =
    order.is_primary_batch_order !== undefined
      ? Boolean(order.is_primary_batch_order)
      : order.is_batch_addon !== undefined
      ? !order.is_batch_addon
      : index === 0;

  const wageAmount = order.courier_earning
    ? Number(order.courier_earning)
    : isFirstBatchOrder
    ? 20.0
    : 14.0;

  const wageLabel = isFirstBatchOrder
    ? "Base Guaranteed Run Fee"
    : "Batch Add-on Drop (+₹14.00)";

  // Destination Resolution & Google Maps URL
  const destinationAddress =
    order.delivery_location?.building ||
    order.address ||
    order.delivery_address ||
    "Hostel Campus Drop Location";

  const destinationRoom =
    order.delivery_location?.room ||
    (order as { room_no?: string }).room_no ||
    "";

  const canteenName = formatRestaurantName(
    order.restaurant_name || order.restaurant_email || "Campus Canteen"
  );
  const canteenAddress =
    order.restaurant_address ||
    order.restaurant?.address ||
    "Zeal College Campus, Narhe";

  const navUrl = getDirectionsUrl(
    order.latitude,
    order.longitude,
    destinationAddress
  );

  const scheduledWave =
    order.scheduled_wave ||
    (order as { batch_window?: string }).batch_window ||
    "Active Delivery Wave";

  const customerName = order.customer_name || "Campus Student";
  const customerPhone = order.phone || order.customer_phone || "";

  function handleCopyUpi() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("9404125117-2@ybl");
      setCopiedUpi(true);
      toast.success("CampusBite UPI ID copied to clipboard!");
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  }

  return (
    <article className="rounded-2xl border border-gray-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4 font-sans text-gray-900">
      {/* 1. Header: Order ID, Batch Wave, Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-mono font-bold text-gray-800 border border-gray-200/60">
            #{orderIdSuffix}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            {status}
          </span>
          {order.batch_id && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200/80 px-2 py-0.5 text-[10px] font-bold text-purple-700">
              <Layers size={10} />
              <span>Batch #{String(order.batch_id).slice(-6).toUpperCase()}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
          <Clock3 size={13} className="text-gray-400" />
          <span>{scheduledWave}</span>
        </div>
      </div>

      {/* 2. Financial Breakdown: Courier Earning & Customer Payment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Courier Earning */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Your Payout
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-emerald-700">
              ₹{wageAmount.toFixed(2)}
            </span>
            {Number(order.tip_amount || 0) > 0 && (
              <span className="text-xs font-bold text-emerald-600">
                (+₹{Number(order.tip_amount).toFixed(2)} Tip)
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 mt-1">
            {wageLabel}
          </span>
        </div>

        {/* Customer Payment Collection */}
        <div className="rounded-xl border border-gray-200/70 bg-gray-50/80 p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {isCod ? "Cash to Collect" : "Payment Status"}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            {isCod ? (
              <span className="text-xl font-extrabold text-amber-700">
                ₹{orderTotal}
              </span>
            ) : (
              <span className="text-base font-bold text-emerald-700">
                Paid Online ✓
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium text-gray-600 mt-1">
            {isCod ? "Cash on Delivery (Exact change under ₹500)" : "Prepaid via Razorpay/UPI"}
          </span>
        </div>
      </div>

      {/* 3. Pickup Point and Drop Point Details */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 space-y-3 text-xs">
        {/* Pickup Canteen */}
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
            <Store size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Pickup Canteen
            </span>
            <p className="font-bold text-gray-900 truncate">{canteenName}</p>
            <p className="text-[11px] text-gray-500 truncate">{canteenAddress}</p>
          </div>
        </div>

        {/* Delivery Drop with Google Maps Trigger */}
        <div className="flex items-start gap-2.5 pt-2.5 border-t border-dashed border-gray-200">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <MapPin size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Hostel Drop Location
            </span>
            <p className="font-bold text-gray-900">{destinationAddress}</p>
            {destinationRoom && (
              <p className="text-[11px] font-semibold text-gray-600">
                Room / Floor: {destinationRoom}
              </p>
            )}
            {order.landmark && (
              <p className="text-[11px] text-gray-500">Ref: {order.landmark}</p>
            )}
            {order.delivery_instructions && (
              <p className="mt-1 text-[11px] font-medium text-amber-800 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200/60 inline-block">
                Note: {order.delivery_instructions}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Google Maps Navigation Primary Action Button */}
      <div>
        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Navigate to ${destinationAddress} in Google Maps`}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-blue-600/25 transition cursor-pointer"
        >
          <Navigation size={14} className="text-white shrink-0 animate-pulse" />
          <span>Launch Google Maps Navigation</span>
        </a>
      </div>

      {/* 5. Recipient Details & Quick Call */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200/80 bg-white p-3 text-xs">
        <div className="min-w-0 pr-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
            Student Recipient
          </span>
          <p className="font-bold text-gray-900 truncate">{customerName}</p>
          {customerPhone && (
            <p className="text-[11px] text-gray-500 font-mono">{customerPhone}</p>
          )}
        </div>
        {customerPhone && (
          <a
            href={`tel:${customerPhone}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition shrink-0 cursor-pointer"
          >
            <Phone size={13} className="text-emerald-700" />
            <span>Call</span>
          </a>
        )}
      </div>

      {/* 6. COD Doorstep UPI Payment Box (when cash is pending) */}
      {isCod && !isDelivered && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-amber-950">
            <span className="flex items-center gap-1.5">
              <Banknote size={15} className="text-amber-700" />
              <span>Collect ₹{orderTotal}</span>
            </span>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="text-[11px] font-bold text-amber-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              {copiedUpi ? (
                <>
                  <Check size={12} className="text-emerald-600" />
                  <span>Copied UPI</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy UPI ID</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-amber-800">
            Student can scan QR or pay to <span className="font-mono font-bold">9404125117-2@ybl</span> directly.
          </p>
        </div>
      )}

      {/* 7. Collapsible Items List */}
      {Array.isArray(order.items) && order.items.length > 0 && (
        <div className="border-t border-gray-100 pt-2 text-xs">
          <button
            type="button"
            onClick={() => setShowItems(!showItems)}
            className="flex w-full items-center justify-between text-gray-600 hover:text-gray-900 font-bold py-1 cursor-pointer"
          >
            <span>
              Order Items ({order.items.length})
            </span>
            {showItems ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showItems && (
            <div className="mt-2 space-y-1.5 rounded-xl bg-gray-50 p-2.5 text-gray-700 border border-gray-100">
              {order.items.map((item, idx) => (
                <div key={item.id ?? idx} className="flex justify-between items-center py-0.5">
                  <span className="truncate pr-2 font-medium">
                    {item.name} × {item.quantity ?? 1}
                  </span>
                  <span className="font-semibold text-gray-900 shrink-0">
                    ₹{(item.price ?? 0) * (item.quantity ?? 1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. Delivery Runner Status Progression Actions */}
      <div className="pt-1 flex flex-wrap items-center gap-2">
        {isAssigned && (
          <button
            type="button"
            onClick={() => {
              if (onConfirmPickup) onConfirmPickup(orderId);
              else if (onPickup) onPickup(orderId);
              else if (onUpdateStatus) onUpdateStatus(orderId, "Picked Up");
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs active:scale-[0.98] transition cursor-pointer text-center"
          >
            📦 Confirm Pickup from Canteen
          </button>
        )}

        {status.toLowerCase() === "picked up" && (
          <button
            type="button"
            onClick={() => {
              if (onUpdateStatus) onUpdateStatus(orderId, "Out for Delivery");
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs active:scale-[0.98] transition cursor-pointer text-center"
          >
            🛵 Out for Delivery to Hostel
          </button>
        )}

        {status.toLowerCase() === "out for delivery" && (
          <button
            type="button"
            onClick={() => {
              if (onOpenOtp) onOpenOtp(orderId);
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs active:scale-[0.98] transition cursor-pointer text-center"
          >
            ✅ Complete Delivery (Enter Student OTP)
          </button>
        )}

        {isDelivered && (
          <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5">
            <CheckCircle2 size={15} className="text-emerald-600" />
            <span>Delivered &amp; Verified via OTP</span>
          </div>
        )}
      </div>
    </article>
  );
}

export default RunnerOrderCard;
