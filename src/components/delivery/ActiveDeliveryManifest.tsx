import { useState, useEffect } from "react";
import {
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  FileText,
  IndianRupee,
  KeyRound,
  MapPin,
  Navigation,
  Phone,
  Store,
  User,
  Copy,
  Check,
  QrCode,
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
import {
  saveLocalDelivery,
  findRichOrder,
  verifyDeliveryOTP,
  getStatusProgressionRank,
} from "@/services/deliveryService";
import { recordDeliveredOrderCash } from "@/services/deliveryPartnerService";
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
  const [localStatus, setLocalStatus] = useState<string>(order.status || "Assigned");
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Inline OTP state
  const [inlineOtp, setInlineOtp] = useState("");
  const [isVerifyingInline, setIsVerifyingInline] = useState(false);
  const [inlineOtpError, setInlineOtpError] = useState("");
  const [showPackedItems, setShowPackedItems] = useState(false);

  function handleCopyUpi() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("campusbite.ops@okaxis");
      setCopiedUpi(true);
      toast.success("CampusBite UPI ID copied to clipboard!");
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  }

  const { updateStatus } = useDeliveryOrders();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (order.status) {
      const currentRank = getStatusProgressionRank(localStatus);
      const incomingRank = getStatusProgressionRank(order.status);
      if (incomingRank >= currentRank) {
        setLocalStatus(order.status);
      }
    }
  }, [order.status, localStatus]);

  // Enrich order from local storage layers if initial object is missing details
  const rich = isMounted
    ? findRichOrder(order._id || (order as { id?: string }).id || "")
    : null;
  const effectiveOrder: DeliveryOrder = {
    ...(rich || {}),
    ...order,
    items:
      order.items && order.items.length > 0
        ? order.items
        : rich?.items || [],
    total: order.total || rich?.total || 0,
    address: order.address || rich?.address || "",
    customer_name: order.customer_name || rich?.customer_name || "",
    phone: order.phone || rich?.phone || "",
    restaurant_name:
      order.restaurant_name || rich?.restaurant_name || "",
    restaurant_email:
      order.restaurant_email || rich?.restaurant_email || "",
  };

  // Track checked items for canteen pickup validation
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  if (!isMounted) {
    return (
      <div className="w-full max-w-full min-w-0 box-border rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 text-center text-stone-400">
        Loading delivery manifest...
      </div>
    );
  }

  const effectiveStatus = localStatus || effectiveOrder.status || "";
  const currentStatus = effectiveStatus
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

  const items = Array.isArray(effectiveOrder.items) ? effectiveOrder.items : [];
  const totalItemsCount = items.length;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const allItemsChecked = totalItemsCount > 0 && checkedCount >= totalItemsCount;

  function toggleItemCheck(key: string) {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const handleConfirmPickup = () => {
    const orderId = effectiveOrder._id || (effectiveOrder as { id?: string }).id;
    if (!orderId) {
      toast.error("Invalid order ID");
      return;
    }

    // 1. Synchronous optimistic UI update (transition directly to Out for Delivery)
    setLocalStatus("Out for Delivery");
    toast.success("Items confirmed! Out for delivery to hostel.");

    // 2. Persist local state across storage layers immediately
    const partner =
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("cb_delivery_partner") || "null")
        : null;
    const updatedOrder = {
      ...effectiveOrder,
      _id: orderId,
      status: "Out for Delivery",
    };
    saveLocalDelivery(updatedOrder, partner?.phone);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("delivery_state_changed"));
    }

    // 3. Parent callbacks
    if (typeof onConfirmPickup === "function") void onConfirmPickup(orderId);
    if (typeof onPickup === "function") void onPickup(orderId);
    if (typeof onUpdateStatus === "function") void onUpdateStatus(orderId, "Out for Delivery");

    // 4. Background network calls (fire & forget, non-blocking)
    void (async () => {
      try {
        setIsSubmitting(true);
        await updateStatus(orderId, "Out for Delivery");
      } catch (err) {
        console.debug("Background pickup update handled silently:", err);
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const handleInlineVerifyOtp = async () => {
    const orderId = effectiveOrder._id || (effectiveOrder as { id?: string }).id;
    if (!orderId) {
      toast.error("Invalid order ID");
      return;
    }

    if (inlineOtp.length !== 4) {
      setInlineOtpError("Please enter the complete 4-digit OTP");
      return;
    }

    try {
      setIsVerifyingInline(true);
      setInlineOtpError("");

      await verifyDeliveryOTP(orderId, Number(inlineOtp));

      const partner =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("cb_delivery_partner") || "null")
          : null;
      recordDeliveredOrderCash(effectiveOrder, partner?.phone);

      setLocalStatus("Delivered");
      setInlineOtp("");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("delivery_state_changed"));
      }

      if (typeof onUpdateStatus === "function") {
        void onUpdateStatus(orderId, "Delivered");
      }

      toast.success("Delivery completed & verified successfully! 🎉");
    } catch (err: unknown) {
      setInlineOtpError(
        err instanceof Error ? err.message : "Invalid OTP code. Please retry."
      );
    } finally {
      setIsVerifyingInline(false);
    }
  };

  const canteenName = formatRestaurantName(
    effectiveOrder.restaurant_name || effectiveOrder.restaurant_email
  );

  const mapUrl = getDirectionsUrl(
    effectiveOrder.latitude,
    effectiveOrder.longitude,
    effectiveOrder.address
  );

  const isCod =
    formatPaymentMethod(effectiveOrder.payment_method).toLowerCase().includes("cod") ||
    (effectiveOrder.payment_method || "").toLowerCase().includes("cash") ||
    effectiveOrder.payment_method === "cod";

  const isAddon = Boolean(effectiveOrder.is_batch_addon || effectiveOrder.isBatchAddon);
  const wageLabel = isAddon ? "Batch Add-on (₹10.00 wage)" : "Base Drop (₹20.00 wage)";

  return (
    <div className="w-full max-w-full min-w-0 box-border rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-5 transition-all hover:shadow-md">
      {/* Manifest Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-4">
        <div className="min-w-0 max-w-full flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-md">
              Order #{shortId(effectiveOrder._id)}
            </span>
            <OrderStatusBadge status={effectiveStatus} size="sm" />
            <span
              className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                isAddon
                  ? "bg-amber-50 text-amber-900 border-amber-300"
                  : "bg-emerald-50 text-emerald-900 border-emerald-300"
              }`}
            >
              {wageLabel}
            </span>
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
              Assigned at {isMounted && effectiveOrder.created_at ? formatDateTime(effectiveOrder.created_at) : "recently"}
            </span>
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Order Total
          </span>
          <div className="flex items-center justify-end text-2xl sm:text-3xl font-black text-stone-900">
            <IndianRupee size={22} className="text-stone-400" />
            <span>{effectiveOrder.total ?? 0}</span>
          </div>
          <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-emerald-800">
            <span>{formatPaymentMethod(effectiveOrder.payment_method)}</span>
            <span>•</span>
            <span>
              {formatPaymentStatus(
                effectiveOrder.payment_status,
                effectiveOrder.payment_method,
                effectiveStatus
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Stage 1: Item Checklist (Shown when Assigned) or En-Route / Completed State */}
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
        /* In Transit / Picked Up Active State: Checklist is collapsed / hidden */
        <div className="space-y-3">
          <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/60 via-indigo-50/30 to-white p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <h3 className="text-xs sm:text-sm font-extrabold text-blue-900 flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-blue-600 shrink-0 animate-pulse" />
                  <span>🛵 Order In Transit to Hostel Dropoff</span>
                </h3>
                <p className="text-xs text-blue-700/80">
                  Items packed from {canteenName}. Head towards the student&apos;s hostel block.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                  {totalItemsCount} {totalItemsCount === 1 ? "Item Picked Up" : "Items Picked Up"}
                </span>
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPackedItems(!showPackedItems)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white/80 border border-blue-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  >
                    <span>{showPackedItems ? "Hide Items" : "View Items"}</span>
                    {showPackedItems ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
              </div>
            </div>

            {/* Collapsed Item Summary when expanded */}
            {showPackedItems && items.length > 0 && (
              <div className="rounded-xl border border-blue-100/80 bg-white/90 p-3 space-y-1.5 text-xs sm:text-sm text-stone-700 animate-in fade-in">
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
            )}
          </div>
        </div>
      ) : (
        /* Active Order Item Packing Checklist (Shown during 'Assigned' state) */
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

      {/* Stage 2: Prominent COD Doorstep UPI QR & Cash Collection Card (Active Orders) */}
      {isCod && (
        <div className="rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-amber-500/15 via-orange-500/10 to-amber-500/20 p-5 sm:p-6 space-y-4 shadow-sm">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300/70 pb-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0">
                <Banknote className="h-6 w-6 text-amber-800" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 block">
                  Cash On Delivery (COD)
                </span>
                <span className="text-sm sm:text-base font-extrabold text-amber-950">
                  Doorstep Payment &amp; Collection
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-amber-800 block">Amount to Collect</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-950 flex items-center justify-end">
                <IndianRupee size={22} className="text-amber-700" />
                {effectiveOrder.total ?? 0}
              </span>
            </div>
          </div>

          {/* Active Order: Render Dynamic CampusBite UPI QR Code & Instructions */}
          {!isDelivered && (
            <div className="rounded-2xl border border-amber-300/90 bg-white p-4 sm:p-5 space-y-3.5 shadow-xs">
              {/* Clean Student Banner */}
              <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 text-center">
                <p className="text-xs sm:text-sm font-extrabold text-orange-950">
                  📱 Have student scan to pay ₹{effectiveOrder.total ?? 0} directly to CampusBite via GPay / PhonePe / Paytm
                </p>
              </div>

              {/* Dynamic QR Code and Details */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 py-1">
                <div className="bg-stone-50 p-2.5 rounded-2xl border border-stone-200 shadow-inner shrink-0">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                      `upi://pay?pa=campusbite.ops@okaxis&pn=CampusBite%20Operations&am=${
                        effectiveOrder.total ?? 0
                      }&cu=INR&tn=CB-Order-${(
                        effectiveOrder._id || (effectiveOrder as { id?: string }).id || ""
                      ).slice(-6)}`
                    )}`}
                    alt={`UPI QR Code for CampusBite Order ${(
                      effectiveOrder._id || (effectiveOrder as { id?: string }).id || ""
                    ).slice(-6)}`}
                    width={150}
                    height={150}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2.5 text-center sm:text-left flex-1 min-w-0">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                      Official Payment VPA
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-black text-stone-900 truncate block">
                      campusbite.ops@okaxis
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5 justify-center sm:justify-start">
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

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                      ✓ CIH physical cash remains ₹0.00
                    </span>
                  </div>
                </div>
              </div>

              {/* Secondary Fallback Tag */}
              <div className="border-t border-stone-100 pt-2.5 flex items-center justify-between text-xs text-stone-600">
                <span className="font-semibold text-stone-500">
                  💵 Fallback: Paper cash accepted if recipient cannot scan UPI
                </span>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Cash adds to CIH ledger
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stage 3: Destination & Hostel Dropoff Details */}
      <div className="rounded-2xl border border-stone-200/90 bg-stone-50/60 p-4 sm:p-5 space-y-3">
        <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-stone-700 flex items-center gap-2">
          <MapPin size={16} className="text-orange-600" />
          <span>Hostel Dropoff &amp; Recipient</span>
        </h3>

        <div className="space-y-2 text-xs sm:text-sm text-stone-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-bold text-stone-900 text-sm sm:text-base">
              <User size={16} className="text-stone-400" />
              <span>{effectiveOrder.customer_name || "Student Customer"}</span>
            </p>

            {effectiveOrder.phone && (
              <a
                href={`tel:${effectiveOrder.phone}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-all cursor-pointer select-none"
              >
                <Phone size={14} />
                <span>Call {effectiveOrder.phone}</span>
              </a>
            )}
          </div>

          <div className="rounded-xl bg-white border border-stone-200 p-3.5 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                  Delivery Location
                </span>
                <p className="font-extrabold text-stone-900 text-sm sm:text-base">
                  📍 {effectiveOrder.address || "Campus Hostel Drop Location"}
                </p>
              </div>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 px-3 text-xs font-bold text-stone-700 shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Navigation size={13} className="text-blue-600" />
                <span>GPS Map</span>
              </a>
            </div>
            {effectiveOrder.customer_email && (
              <p className="text-xs text-stone-500 pt-0.5">
                Email: {effectiveOrder.customer_email}
              </p>
            )}
          </div>

          {/* Delivery Instructions Callout */}
          <div className="flex items-start gap-2 rounded-xl bg-amber-50/80 border border-amber-200/80 p-2.5 text-xs text-amber-950">
            <FileText size={14} className="text-amber-700 shrink-0 mt-0.5" />
            <p>
              <span className="font-bold text-amber-900">Delivery Handover Rule:</span> Ask
              the recipient for the 4-digit handover OTP shown on their screen upon arrival before handing
              over the food package.
            </p>
          </div>
        </div>

        {/* Stage 4: Customer Delivery OTP Verification Input (Active during Transit) */}
        {isEnRoute && (
          <div className="mt-4 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-emerald-950">
                    Customer Delivery Handover OTP
                  </h4>
                  <p className="text-xs text-emerald-800">
                    Enter the 4-digit code shown on customer&apos;s live tracking screen.
                  </p>
                </div>
              </div>

              {typeof onOpenOtp === "function" && (
                <button
                  type="button"
                  onClick={() => {
                    const orderId = effectiveOrder._id || (effectiveOrder as { id?: string }).id;
                    if (orderId) onOpenOtp(orderId);
                  }}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                >
                  Open Dialog
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={inlineOtp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setInlineOtp(val);
                  setInlineOtpError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inlineOtp.length === 4) {
                    e.preventDefault();
                    void handleInlineVerifyOtp();
                  }
                }}
                placeholder="4-digit OTP"
                className="w-full sm:w-44 tracking-[0.3em] font-mono text-center text-xl font-black h-12 rounded-xl border-2 border-emerald-300 bg-white text-stone-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 shadow-xs"
              />

              <button
                type="button"
                disabled={inlineOtp.length !== 4 || isVerifyingInline}
                onClick={() => void handleInlineVerifyOtp()}
                className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed select-none"
              >
                {isVerifyingInline ? (
                  <span>Verifying OTP...</span>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Verify OTP &amp; Complete Delivery</span>
                  </>
                )}
              </button>
            </div>

            {inlineOtpError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5 animate-shake">
                ⚠️ {inlineOtpError}
              </p>
            )}
          </div>
        )}

        {/* Delivered Badge if status is completed */}
        {isDelivered && (
          <div className="pt-2">
            <span className="rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 px-4 py-2.5 text-xs font-extrabold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-700" />
              <span>Delivered Successfully • Handover verified with Customer OTP</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActiveDeliveryManifest;
