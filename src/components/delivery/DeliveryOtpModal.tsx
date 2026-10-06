import { useRef, useEffect, useState } from "react";
import {
  KeyRound,
  X,
  CheckCircle,
  ShieldAlert,
  Sparkles,
  Banknote,
  QrCode,
  Copy,
  Check,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const CAMPUSBITE_UPI_ID = "campusbite.ops@okaxis";
export const CAMPUSBITE_UPI_NAME = "CampusBite Operations";

export type DeliveryOtpModalProps = {
  isOpen: boolean;
  otp: string;
  setOtp: (val: string) => void;
  verifying: boolean;
  otpError: string;
  onVerify: (collectionMode?: "upi" | "cash") => void;
  onClose: () => void;
  order?: {
    id?: string;
    _id?: string;
    total?: number;
    total_amount?: number;
    payment_method?: string;
    payment_status?: string;
  } | null;
};

export function DeliveryOtpModal({
  isOpen,
  otp,
  setOtp,
  verifying,
  otpError,
  onVerify,
  onClose,
  order,
}: DeliveryOtpModalProps) {
  const [collectionMode, setCollectionMode] = useState<"upi" | "cash">("upi");
  const [cashCollected, setCashCollected] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Auto focus first input and reset collection state when opened
  useEffect(() => {
    if (isOpen) {
      setCollectionMode("upi");
      setCashCollected(false);
      setCopiedUpi(false);
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const orderId = order?._id || (order as { id?: string })?.id || "";
  const orderIdSuffix = orderId ? orderId.slice(-6) : "000000";
  const orderAmount = order?.total_amount ?? order?.total ?? 0;

  const isCod =
    order?.payment_method?.toLowerCase().includes("cod") ||
    order?.payment_method?.toLowerCase().includes("cash") ||
    order?.payment_method === "cash_on_delivery" ||
    order?.payment_method?.toLowerCase().includes("pay on delivery");
  const isPaid =
    order?.payment_status?.toLowerCase() === "paid" ||
    order?.payment_status?.toLowerCase() === "completed";
  const requiresPaymentCollection = Boolean(isCod && !isPaid);

  const upiUri = `upi://pay?pa=${CAMPUSBITE_UPI_ID}&pn=${encodeURIComponent(
    CAMPUSBITE_UPI_NAME
  )}&am=${orderAmount}&cu=INR&tn=CB-Order-${orderIdSuffix}`;
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    upiUri
  )}`;

  const digits = [otp[0] || "", otp[1] || "", otp[2] || "", otp[3] || ""];

  function handleCopyUpi() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(CAMPUSBITE_UPI_ID);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  }

  function handleDigitChange(index: number, value: string) {
    // Only accept numeric digits
    const cleanValue = value.replace(/\D/g, "");
    if (!cleanValue) {
      // Emptying this digit
      const nextOtp = otp.slice(0, index) + "" + otp.slice(index + 1);
      setOtp(nextOtp);
      return;
    }

    if (cleanValue.length > 1) {
      // Pasting multi-digit code
      const pasted = cleanValue.slice(0, 4);
      setOtp(pasted);
      const targetFocus = Math.min(pasted.length, 3);
      inputRefs[targetFocus].current?.focus();
      return;
    }

    // Single digit input
    const newDigits = [...digits];
    newDigits[index] = cleanValue;
    const nextOtp = newDigits.join("").slice(0, 4);
    setOtp(nextOtp);

    // Auto advance focus to next digit
    if (index < 3 && cleanValue) {
      inputRefs[index + 1].current?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    if (
      e.key === "Enter" &&
      otp.length === 4 &&
      (!requiresPaymentCollection || collectionMode === "upi" || cashCollected)
    ) {
      e.preventDefault();
      onVerify(requiresPaymentCollection ? collectionMode : undefined);
    }
  }

  const isSubmitDisabled =
    verifying ||
    otp.length !== 4 ||
    (requiresPaymentCollection && collectionMode === "cash" && !cashCollected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div
        className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-7 shadow-2xl relative ${
          otpError ? "ring-2 ring-rose-500 animate-shake" : ""
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5">
          <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 shadow-xs">
            <KeyRound className="h-6 w-6" />
          </div>

          <h2 className="text-2xl font-black text-stone-900 tracking-tight">
            Handover Verification OTP
          </h2>

          <p className="text-xs sm:text-sm text-stone-600 px-2">
            Ask the student recipient for the 4-digit code shown on their live order screen.
          </p>
        </div>

        {/* Doorstep Payment Collection Section for COD / Pay on Delivery */}
        {requiresPaymentCollection && (
          <div className="mt-4 space-y-3">
            {/* Collection Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-stone-500 block text-left">
                Payment Collection Mode
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-stone-100 border border-stone-200">
                <button
                  type="button"
                  onClick={() => setCollectionMode("upi")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    collectionMode === "upi"
                      ? "bg-orange-600 text-white shadow-sm"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
                  }`}
                  aria-pressed={collectionMode === "upi"}
                >
                  <Smartphone className="h-3.5 w-3.5 shrink-0" />
                  <span>📱 Paid via CampusBite QR (UPI)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCollectionMode("cash")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    collectionMode === "cash"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
                  }`}
                  aria-pressed={collectionMode === "cash"}
                >
                  <Banknote className="h-3.5 w-3.5 shrink-0" />
                  <span>💵 Paid in Paper Cash</span>
                </button>
              </div>
            </div>

            {/* Default: Prominent Dynamic CampusBite UPI QR Display */}
            {collectionMode === "upi" ? (
              <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-b from-orange-50/70 via-white to-orange-50/30 p-4 text-center space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-orange-950 flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-orange-600" />
                    <span>CampusBite Doorstep UPI QR</span>
                  </span>
                  <span className="text-xs font-black text-orange-900 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-200">
                    Collect ₹{orderAmount}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center py-1">
                  <div className="bg-white p-2.5 rounded-2xl shadow-xs border border-orange-200 inline-block">
                    <img
                      src={upiQrUrl}
                      alt={`UPI QR Code for CampusBite Order ${orderIdSuffix}`}
                      width={150}
                      height={150}
                      className="rounded-xl mx-auto"
                    />
                  </div>
                  <p className="mt-2 text-xs sm:text-sm font-black text-stone-800">
                    Ask student to scan and pay via GPay / PhonePe / Paytm
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-orange-50/80 border border-orange-200/80 text-left">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-orange-800 truncate">
                      VPA: {CAMPUSBITE_UPI_ID}
                    </p>
                    <p className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                      <span>✓</span>
                      <span>Rider CIH physical cash remains ₹0.00</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-orange-300 text-orange-700 text-[10px] font-bold shadow-xs hover:bg-orange-100 transition active:scale-95 cursor-pointer shrink-0"
                  >
                    {copiedUpi ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy VPA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Fallback: Paper Cash Mode */
              <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 space-y-2.5 text-left animate-in fade-in">
                <div className="flex items-center gap-2 text-amber-950 font-black text-xs sm:text-sm">
                  <Banknote className="h-5 w-5 text-amber-700 shrink-0" />
                  <span>💵 CASH ON DELIVERY: Collect ₹{orderAmount}</span>
                </div>

                <p className="text-xs text-amber-900 font-medium leading-relaxed">
                  Confirm you have collected the cash from the recipient before verifying OTP. Your courier COD balance will be credited.
                </p>

                <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none text-xs font-bold text-amber-950">
                  <input
                    type="checkbox"
                    checked={cashCollected}
                    onChange={(e) => setCashCollected(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-amber-400 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                  <span>
                    I confirm that I have collected ₹{orderAmount} in cash from the recipient.
                  </span>
                </label>

                <p className="text-[10px] font-bold text-amber-800">
                  ⚠️ Adds order amount to rider CIH balance
                </p>
              </div>
            )}
          </div>
        )}

        {/* 4-Digit Box Input */}
        <div className="my-5">
          <div className="flex justify-center gap-2.5 sm:gap-3">
            {[0, 1, 2, 3].map((index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digits[index]}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`h-13 w-12 sm:h-15 sm:w-13 rounded-2xl border text-center text-2xl sm:text-3xl font-black text-stone-900 shadow-xs outline-none transition-all ${
                  otpError
                    ? "border-rose-400 bg-rose-50/50 text-rose-900"
                    : digits[index]
                    ? "border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/20"
                    : "border-stone-300 bg-stone-50 hover:border-stone-400 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
                }`}
                placeholder="•"
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          {otpError && (
            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 p-2 text-xs font-bold text-rose-700">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{otpError}</span>
            </div>
          )}
        </div>

        {/* Delivery Fee Confirmation Pill */}
        <div className="mb-5 rounded-2xl bg-emerald-50 border border-emerald-200 p-2.5 text-center">
          <p className="text-xs font-bold text-emerald-900 flex items-center justify-center gap-1.5">
            <Sparkles size={14} className="text-emerald-600" />
            <span>Successful delivery will credit +₹20 to your courier wallet</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border-stone-200 hover:bg-stone-50 font-bold text-sm cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={() => onVerify(requiresPaymentCollection ? collectionMode : undefined)}
            disabled={isSubmitDisabled}
            className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {verifying ? (
              <span>Verifying Handover…</span>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Verify &amp; Complete</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export const CompleteDeliveryModal = DeliveryOtpModal;
export default DeliveryOtpModal;
