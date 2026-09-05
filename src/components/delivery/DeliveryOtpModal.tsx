import { useRef, useEffect, useState } from "react";
import { KeyRound, X, CheckCircle, ShieldAlert, Sparkles, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeliveryOtpModalProps = {
  isOpen: boolean;
  otp: string;
  setOtp: (val: string) => void;
  verifying: boolean;
  otpError: string;
  onVerify: () => void;
  onClose: () => void;
  order?: {
    total?: number;
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
  const [cashCollected, setCashCollected] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Auto focus first input and reset cash checkbox when opened
  useEffect(() => {
    if (isOpen) {
      setCashCollected(false);
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isCod =
    order?.payment_method?.toLowerCase().includes("cod") ||
    order?.payment_method?.toLowerCase().includes("cash") ||
    order?.payment_method === "cash_on_delivery";
  const isPaid =
    order?.payment_status?.toLowerCase() === "paid" ||
    order?.payment_status?.toLowerCase() === "completed";
  const requiresCashCollection = Boolean(isCod && !isPaid);

  const digits = [otp[0] || "", otp[1] || "", otp[2] || "", otp[3] || ""];

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
      (!requiresCashCollection || cashCollected)
    ) {
      e.preventDefault();
      onVerify();
    }
  }

  const isSubmitDisabled =
    verifying ||
    otp.length !== 4 ||
    (requiresCashCollection && !cashCollected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div
        className={`w-full max-w-md rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-2xl relative ${
          otpError ? "ring-2 ring-rose-500 animate-shake" : ""
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 shadow-xs">
            <KeyRound className="h-7 w-7" />
          </div>

          <h2 className="text-2xl font-black text-stone-900 tracking-tight">
            Handover Verification OTP
          </h2>

          <p className="text-xs sm:text-sm text-stone-600 px-4">
            Ask the student recipient for the 4-digit code shown on their live order screen.
          </p>
        </div>

        {/* Mandatory Cash on Delivery Safeguard */}
        {requiresCashCollection && (
          <div className="mt-5 rounded-2xl bg-amber-50 border border-amber-300 p-4 space-y-2.5 text-left">
            <div className="flex items-center gap-2 text-amber-950 font-black text-xs sm:text-sm">
              <Banknote className="h-5 w-5 text-amber-700 shrink-0" />
              <span>💵 CASH ON DELIVERY: Collect ₹{order?.total ?? 0}</span>
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
                I confirm that I have collected ₹{order?.total ?? 0} in cash from the recipient.
              </span>
            </label>
          </div>
        )}

        {/* 4-Digit Box Input */}
        <div className="my-6">
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
                className={`h-14 w-12 sm:h-16 sm:w-14 rounded-2xl border text-center text-2xl sm:text-3xl font-black text-stone-900 shadow-xs outline-none transition-all ${
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
            <div className="mt-3.5 flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-bold text-rose-700">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{otpError}</span>
            </div>
          )}
        </div>

        {/* Delivery Fee Confirmation Pill */}
        <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-center">
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
            className="flex-1 h-12 rounded-xl border-stone-200 hover:bg-stone-50 font-bold text-sm cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onVerify}
            disabled={isSubmitDisabled}
            className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
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

export default DeliveryOtpModal;
