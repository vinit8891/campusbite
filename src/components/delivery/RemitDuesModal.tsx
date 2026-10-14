"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { QrCode, Copy, Check, ShieldCheck, X, Clock } from "lucide-react";
import { formatINR } from "@/lib/formatters";
import {
  remitRiderDues,
  getRiderCashReconciliation,
  type RiderCashReconciliation,
} from "@/services/deliveryPartnerService";

export const CAMPUSBITE_UPI_ID =
  process.env.NEXT_PUBLIC_CAMPUSBITE_OPS_VPA || "9404125117-2@ybl";
export const CAMPUSBITE_UPI_NAME = "Vinit Gurudeo Awathare";

export type CourierDueInfo = {
  cash_in_hand?: number;
  cih_balance?: number;
  net_cash_due?: number;
  collected_cod?: number;
  wages_earned?: number;
  [key: string]: any;
};

export interface RemitDuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  courier?: any;
  duesAmount?: number; // Optional direct override from lockout card
  netCashDue?: number;
  phone?: string;
  onRemitSuccess?: (updated: RiderCashReconciliation) => void | Promise<void>;
}

export function RemitDuesModal({
  isOpen,
  onClose,
  courier: rawCourier,
  duesAmount,
  netCashDue,
  phone,
  onRemitSuccess,
}: RemitDuesModalProps) {
  // Exhaustively resolve the pending cash balance across all possible schema fields:
  const calculatedCodDiff =
    rawCourier &&
    (rawCourier.collected_cod !== undefined ||
      rawCourier.cash_collected !== undefined ||
      rawCourier.total_cod_collected !== undefined)
      ? Number(rawCourier?.cash_collected ?? rawCourier?.collected_cod ?? rawCourier?.total_cod_collected ?? 0) -
        Number(rawCourier?.wages_earned ?? rawCourier?.total_payout_earned ?? 0) -
        Number(rawCourier?.bonus_earned ?? rawCourier?.milestone_bonus ?? 0)
      : undefined;

  const fallbackDue =
    phone ? getRiderCashReconciliation(phone).net_cash_due : undefined;

  const resolvedDues = Math.max(
    0,
    Number(
      duesAmount ??
      netCashDue ??
      rawCourier?.net_due_amount ??
      rawCourier?.net_cash_due ??
      rawCourier?.cash_in_hand ??
      rawCourier?.cih_balance ??
      calculatedCodDiff ??
      fallbackDue ??
      0
    )
  );

  const fallbackRecon = phone ? getRiderCashReconciliation(phone) : null;
  const wagesEarned = Number(rawCourier?.wages_earned ?? rawCourier?.total_payout_earned ?? fallbackRecon?.total_payout_earned ?? 0);
  const bonusEarned = Number(rawCourier?.bonus_earned ?? rawCourier?.milestone_bonus ?? 0);
  const unlockedTier = rawCourier?.unlocked_tier ?? rawCourier?.milestone_tier ?? "Milestone Tier";
  const cashCollected = Number(
    rawCourier?.cash_collected ??
    rawCourier?.collected_cod ??
    rawCourier?.total_cod_collected ??
    rawCourier?.cash_in_hand ??
    fallbackRecon?.cash_in_hand ??
    (resolvedDues > 0 ? resolvedDues + wagesEarned + bonusEarned : 0)
  );
  const netDueAmount = Number(rawCourier?.net_due_amount ?? rawCourier?.net_cash_due ?? resolvedDues);

  const courier = {
    cash_collected: cashCollected,
    wages_earned: wagesEarned,
    bonus_earned: bonusEarned,
    unlocked_tier: unlockedTier,
    net_due_amount: netDueAmount,
    ...rawCourier,
  };

  const [countdownText, setCountdownText] = useState<string>("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
      const istNow = new Date(utcTime + 5.5 * 3600000);

      const istCutoff = new Date(istNow);
      istCutoff.setHours(23, 0, 0, 0);

      const diffMs = istCutoff.getTime() - istNow.getTime();
      if (diffMs <= 0) {
        setCountdownText("Due in 0 hours 0 mins — settle before cutoff to avoid account lock");
      } else {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setCountdownText(`Due in ${hours} hours ${mins} mins — settle before cutoff to avoid account lock`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000);
    return () => clearInterval(interval);
  }, []);

  const [remitAmount, setRemitAmount] = useState<string>('');

  useEffect(() => {
    if (resolvedDues > 0) {
      setRemitAmount(resolvedDues.toFixed(2));
    }
  }, [resolvedDues, isOpen]);

  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  function handleCopyUpi() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(CAMPUSBITE_UPI_ID);
      setCopiedUpi(true);
      toast.success("UPI ID copied to clipboard!");
      setTimeout(() => setCopiedUpi(false), 2500);
    }
  }

  async function handleConfirm() {
    const amountNum = parseFloat(remitAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid remittance amount.");
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = remitRiderDues(phone, amountNum);

      toast.success("Dues remittance confirmed!", {
        description: `Successfully cleared ₹${amountNum.toFixed(2)} from your Cash-In-Hand balance.`,
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("delivery_state_changed"));
      }

      if (onRemitSuccess) {
        await onRemitSuccess(updated);
      }

      onClose();
    } catch {
      toast.error("Failed to record remittance. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const vpa = CAMPUSBITE_UPI_ID;
  const cleanAmount = parseFloat(remitAmount) || 0;
  const upiUri = `upi://pay?pa=${vpa}&pn=Vinit%20Gurudeo%20Awathare&am=${cleanAmount.toFixed(2)}&cu=INR&tn=Courier%20COD%20Remittance`;
  const upiQrUrl = "/images/campusbite-upi-qr.jpg";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="remit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 shadow-inner">
            <QrCode className="h-7 w-7" />
          </div>
          <h3
            id="remit-modal-title"
            className="mt-3.5 text-xl font-black text-stone-900"
          >
            Remit Dues to CampusBite
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Scan the official PhonePe UPI QR code or transfer directly to the official VPA to settle your collected COD cash.
          </p>
        </div>

        {/* QR Code Container */}
        <div className="mt-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
          <div className="bg-white p-3 rounded-xl shadow-xs border border-stone-200">
            <img
              src="/images/campusbite-upi-qr.jpg"
              alt={`CampusBite PhonePe QR Code for ${CAMPUSBITE_UPI_ID}`}
              width={180}
              height={180}
              className="rounded-lg object-contain max-h-[180px] max-w-[180px]"
            />
          </div>

          <span className="mt-2 text-[11px] font-semibold text-stone-500">
            Scan with GPay, PhonePe, Paytm, or any UPI App
          </span>
        </div>

        {/* VPA Copy Bar */}
        <div className="mt-4 flex items-center justify-between gap-2 p-3 rounded-xl bg-orange-50/80 border border-orange-200/80">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-800">
              Official CampusBite UPI VPA
            </p>
            <p className="font-mono text-xs sm:text-sm font-black text-stone-900 truncate">
              {CAMPUSBITE_UPI_ID}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyUpi}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-orange-300 text-orange-700 text-xs font-bold shadow-xs hover:bg-orange-100 transition active:scale-95 cursor-pointer shrink-0"
          >
            {copiedUpi ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
        </div>

        {/* Due Settlement Reminder Card & Countdown */}
        {resolvedDues > 0 && (
          <div className="mt-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 p-3 text-amber-900 shadow-xs">
            <div className="flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-amber-900">
                  Daily COD Cash Remittance Cutoff: 11:00 PM IST tonight
                </h4>
                <p className="text-[11px] font-medium text-amber-700 mt-0.5">
                  {countdownText}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Financial Breakdown Box with Bonus Deduction */}
        {resolvedDues > 0 && (
          <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200 text-xs space-y-1.5 my-3">
            <div className="flex justify-between text-zinc-600">
              <span>Total Physical COD Collected:</span>
              <span className="font-semibold text-zinc-800">₹{formatINR(courier.cash_collected)}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span>Base Delivery Wages Earned:</span>
              <span className="font-semibold">-₹{formatINR(courier.wages_earned)}</span>
            </div>
            {courier.bonus_earned > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Daily Milestone Bonus ({courier.unlocked_tier}):</span>
                <span className="font-semibold">-₹{formatINR(courier.bonus_earned)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-zinc-200 text-zinc-900">
              <span>Net Cash Due to Remit:</span>
              <span className="text-orange-600">₹{formatINR(courier.net_due_amount)}</span>
            </div>
          </div>
        )}

        {/* Remittance Amount Input & Quick-Selection Preset Pills */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="remit-amount-input"
              className="block text-xs font-bold text-stone-700"
            >
              Amount to Remit (₹)
            </label>
            <span className="text-[11px] font-medium text-stone-500">
              Pending: ₹{resolvedDues.toFixed(2)}
            </span>
          </div>

          {/* Quick-Selection Preset Pills */}
          <div className="flex items-center gap-2 my-2">
            <button
              type="button"
              onClick={() => setRemitAmount(resolvedDues.toFixed(2))}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              Full Due (₹{resolvedDues.toFixed(2)})
            </button>
            {resolvedDues > 200 && (
              <button
                type="button"
                onClick={() => setRemitAmount('200.00')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                ₹200
              </button>
            )}
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400 font-bold">
              ₹
            </div>
            <input
              id="remit-amount-input"
              type="number"
              step="0.01"
              min="1"
              value={remitAmount}
              onChange={(e) => setRemitAmount(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-8 pr-4 text-sm font-bold text-stone-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              placeholder={`e.g. ${resolvedDues.toFixed(2)}`}
            />
          </div>
          <p className="text-[11px] text-stone-500">
            Current Net Dues: ₹{resolvedDues.toFixed(2)}
          </p>
        </div>

        {/* Confirmation CTA */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting || cleanAmount <= 0}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 px-4 text-sm font-black text-white shadow-lg shadow-emerald-600/30 transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ShieldCheck className="h-5 w-5" />
            {isSubmitting
              ? "Recording Remittance..."
              : `Confirm Remitted ₹${cleanAmount.toFixed(2)}`}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 transition cursor-pointer"
          >
            Cancel & Close
          </button>
        </div>
      </div>
    </div>
  );
}

export const RemitCashModal = RemitDuesModal;
export default RemitDuesModal;

