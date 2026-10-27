import { useState } from "react";
import { Banknote, Copy, Check, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { syncCourierActiveRuns } from "@/services/deliveryPartnerService";
import type { DeliveryOrder } from "@/types";

type MyDeliveryCardProps = {
  order: DeliveryOrder;
  index?: number;
  onUpdateStatus: (id: string, status: string) => void;
  onOpenOtp: (orderId: string) => void;
};

export function MyDeliveryCard({
  order,
  index = 0,
  onUpdateStatus,
  onOpenOtp,
}: MyDeliveryCardProps) {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const orderId = order._id || (order as { id?: string }).id || "";
  const orderIdSuffix = orderId ? orderId.slice(-6) : "000000";
  const orderTotal = (order as { total_amount?: number }).total_amount ?? order.total ?? 0;

  const isCod =
    (order.payment_method || "").toLowerCase().includes("cod") ||
    (order.payment_method || "").toLowerCase().includes("cash") ||
    order.payment_method === "cash_on_delivery";

  const isDelivered = ["delivered", "completed"].includes(
    (order.status || "").toLowerCase().trim()
  );

  function handleCopyUpi() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("9404125117-2@ybl");
      setCopiedUpi(true);
      toast.success("CampusBite UPI ID copied to clipboard!");
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  }

  const upiUri = `upi://pay?pa=9404125117-2@ybl&pn=Vinit%20Gurudeo%20Awathare&am=${orderTotal}&cu=INR&tn=CB-Order-${orderIdSuffix}`;
  const upiQrUrl = "/images/campusbite-upi-qr.jpg";

  // Resolve earning: first order in active run is Base order (₹20.00), subsequent orders are Batch Add-ons (+₹14.00)
  const isFirstBatchOrder = order?.is_primary_batch_order !== undefined
    ? Boolean(order.is_primary_batch_order)
    : (index === undefined ? true : index === 0);
  const earningAmount = order?.courier_earning 
    ? Number(order.courier_earning) 
    : (isFirstBatchOrder ? 20.00 : 14.00);

  const wageLabel = isFirstBatchOrder ? 'Base guaranteed run fee' : 'Batch add-on drop (+₹14)';

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm space-y-3.5">
      {/* 1. Header Row: Order ID, Status Badge, Timestamp */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-mono font-bold text-zinc-800 border border-zinc-200/60">
            #{orderId.slice(-6).toUpperCase()}
          </span>
          <span className="rounded-full bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
            {order.status ? (order.status.charAt(0).toUpperCase() + order.status.slice(1)) : 'Assigned'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              await syncCourierActiveRuns();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
            title="Force flush local cache and sync runs with server"
          >
            <span>Sync Runs</span>
            <span>🔄</span>
          </button>
          <span className="text-[11px] text-zinc-400 font-medium shrink-0" suppressHydrationWarning>
            {order.assigned_at || (order as { created_at?: string }).created_at
              ? new Date(order.assigned_at || (order as { created_at?: string }).created_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now'}
          </span>
        </div>
      </div>

      {/* 2. Financial Metrics Box: Courier Payout & Cash to Collect */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left: Rider Earning */}
        <div className="bg-orange-50/60 border border-orange-100 rounded-xl p-3">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Your Earning</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-base font-bold text-emerald-700">₹{earningAmount.toFixed(2)}</span>
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">{wageLabel}</span>
        </div>

        {/* Right: Cash Collection / Online Status */}
        <div className="bg-zinc-50/80 border border-zinc-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            {order.payment_method?.toLowerCase() === 'cod' ? 'Collect From Customer' : 'Payment Status'}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {order.payment_method?.toLowerCase() === 'cod' ? (
              <span className="text-base font-bold text-amber-700">₹{order.total_amount ?? orderTotal}</span>
            ) : (
              <span className="text-emerald-700 text-sm font-semibold">Paid Online ✓</span>
            )}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5 truncate">
            {order.payment_method?.toLowerCase() === 'cod' ? 'Cash on Delivery' : 'Prepaid via UPI'}
          </span>
        </div>
      </div>

      {/* 3. Route Details: Pickup & Drop Off */}
      <div className="space-y-2.5 text-xs pt-1">
        {/* Pickup Point */}
        <div className="flex items-start gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-orange-50 text-sm">
            🏪
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Pickup Point</span>
            <p className="font-semibold text-zinc-900 truncate">
              {order.restaurant_name || order.restaurant?.name || 'Campus Canteen'}
            </p>
            <p className="text-[11px] text-zinc-500 truncate">
              {order.restaurant_address || order.restaurant?.address || 'Zeal College Campus'}
            </p>
          </div>
        </div>

        {/* Drop Point */}
        <div className="flex items-start gap-2.5 pt-2 border-t border-dashed border-zinc-100">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-sm">
            📍
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Delivery Drop</span>
            <p className="font-semibold text-zinc-900">
              {order.delivery_location?.building || order.delivery_address || order.address || 'Hostel Campus'}
            </p>
            {(order.delivery_location?.room || (order as { room_no?: string }).room_no) && (
              <p className="text-[11px] text-zinc-500">
                Room / Flat: {order.delivery_location?.room || (order as { room_no?: string }).room_no}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Doorstep UPI QR Code & Cash Card on Active COD Orders */}
      {isCod && !isDelivered && (
        <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-amber-50/80 via-white to-orange-50/40 p-4 sm:p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
            <div className="flex items-center gap-2 text-amber-950 font-black text-xs sm:text-sm">
              <Banknote className="h-5 w-5 text-amber-700 shrink-0" />
              <span>CASH ON DELIVERY (COD)</span>
            </div>
            <span className="text-xs sm:text-sm font-black text-amber-950 flex items-center">
              <IndianRupee size={16} className="text-amber-700" />
              {orderTotal} to Collect
            </span>
          </div>

          <div className="rounded-xl bg-orange-50 border border-orange-200 p-2.5 text-center">
            <p className="text-xs sm:text-sm font-black text-orange-950">
              📱 Have student scan to pay ₹{orderTotal} directly to CampusBite via GPay / PhonePe / Paytm
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-1">
            <div className="bg-white p-2 rounded-2xl border border-stone-200 shadow-xs shrink-0">
              <img
                src={upiQrUrl}
                alt={`UPI QR Code for CampusBite Order ${orderIdSuffix}`}
                width={140}
                height={140}
                className="rounded-xl mx-auto"
              />
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                  CampusBite Official UPI ID
                </span>
                <span className="font-mono text-xs sm:text-sm font-black text-stone-900 truncate block">
                  9404125117-2@ybl
                </span>
                <span className="text-[11px] font-semibold text-stone-600 block">
                  Payee: Vinit Gurudeo Awathare
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-300 text-orange-800 text-xs font-bold hover:bg-orange-100 transition active:scale-95 cursor-pointer shadow-xs"
                >
                  {copiedUpi ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Copied UPI ID</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>📋 Copy UPI ID (9404125117-2@ybl)</span>
                    </>
                  )}
                </button>

                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  ✓ CIH physical cash remains ₹0.00
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-2 flex items-center justify-between text-xs text-stone-500">
            <span>💵 Paper cash fallback accepted</span>
            <span className="text-[11px] font-bold text-amber-800">
              Adds to CIH ledger
            </span>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 font-semibold">Ordered Items</h3>

        {Array.isArray(order.items) && order.items.length > 0 ? (
          <div className="space-y-2 text-sm text-stone-700">
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
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={order.status !== "Assigned"}
          onClick={(e) => {
            e.stopPropagation();
            onUpdateStatus(orderId, "Out for Delivery");
          }}
          className="relative z-10 rounded-lg bg-orange-600 hover:bg-orange-700 active:bg-orange-800 px-4 py-2 text-white font-bold text-xs select-none cursor-pointer active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-40"
        >
          📦 Pick Up &amp; Transit
        </button>

        <button
          type="button"
          disabled={order.status !== "Picked Up" && order.status !== "Assigned"}
          onClick={(e) => {
            e.stopPropagation();
            onUpdateStatus(orderId, "Out for Delivery");
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
            onOpenOtp(orderId);
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
          type="button"
          aria-label="Launch Google Maps Navigation"
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
          className="rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition px-4 py-2 text-white font-bold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5"
        >
          <span>🗺️</span>
          <span>Google Maps Navigation</span>
        </button>
      </div>
    </div>
  );
}

export default MyDeliveryCard;
