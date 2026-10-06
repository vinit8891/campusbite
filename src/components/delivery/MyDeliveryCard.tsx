import { useState } from "react";
import { Banknote, Copy, Check, IndianRupee } from "lucide-react";
import { toast } from "sonner";
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
      navigator.clipboard.writeText("campusbite.ops@okaxis");
      setCopiedUpi(true);
      toast.success("CampusBite UPI ID copied to clipboard!");
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  }

  const upiUri = `upi://pay?pa=campusbite.ops@okaxis&pn=CampusBite%20Operations&am=${orderTotal}&cu=INR&tn=CB-Order-${orderIdSuffix}`;
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    upiUri
  )}`;

  const isAddon = Boolean(order.is_batch_addon || order.isBatchAddon);
  const wageBadge = isAddon ? "Batch Add-on (₹10.00 wage)" : "Base Drop (₹20.00 wage)";

  return (
    <div className="rounded-2xl border bg-white p-6 shadow space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">
            🍽 {order.restaurant_email}
          </h2>
          <p>{order.customer_name}</p>
          <p>{order.phone}</p>
          <p className="text-gray-500">{order.address}</p>
        </div>

        <div className="text-right space-y-1.5">
          <p className="text-xl font-bold text-orange-600">
            ₹{order.total}
          </p>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">
              {order.status}
            </span>
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                isAddon
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-emerald-100 text-emerald-900 border-emerald-300"
              }`}
            >
              {wageBadge}
            </span>
          </div>
        </div>
      </div>

      <hr className="my-2" />

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
                  campusbite.ops@okaxis
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
                      <span>📋 Copy UPI ID (campusbite.ops@okaxis)</span>
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

export default MyDeliveryCard;
