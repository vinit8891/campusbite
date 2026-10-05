"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { QrCode, Copy, Check, ShieldCheck, X } from "lucide-react";
import {
  remitRiderDues,
  getRiderCashReconciliation,
  type RiderCashReconciliation,
} from "@/services/deliveryPartnerService";

export const CAMPUSBITE_UPI_ID = "campusbite.ops@okaxis";
export const CAMPUSBITE_UPI_NAME = "CampusBite Operations";

export type RemitDuesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  netCashDue?: number;
  phone?: string;
  onRemitSuccess?: (updated: RiderCashReconciliation) => void | Promise<void>;
};

export function RemitDuesModal({
  isOpen,
  onClose,
  netCashDue,
  phone,
  onRemitSuccess,
}: RemitDuesModalProps) {
  const [remitAmount, setRemitAmount] = useState<string>("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const due =
        netCashDue !== undefined
          ? netCashDue
          : getRiderCashReconciliation(phone).net_cash_due;
      setRemitAmount(Math.max(0, due).toFixed(2));
      setCopiedUpi(false);
    }
  }, [isOpen, netCashDue, phone]);

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

  const currentRemitNum = parseFloat(remitAmount || "0");
  const upiQrAmount = isNaN(currentRemitNum) ? "0.00" : currentRemitNum.toFixed(2);
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    `upi://pay?pa=${CAMPUSBITE_UPI_ID}&pn=${encodeURIComponent(
      CAMPUSBITE_UPI_NAME
    )}&am=${upiQrAmount}&cu=INR&tn=Rider%20COD%20Deposit`
  )}`;

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
            Scan the dynamic UPI QR code or transfer directly to the official VPA to settle your collected COD cash.
          </p>
        </div>

        {/* QR Code Container */}
        <div className="mt-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
          <div className="bg-white p-3 rounded-xl shadow-xs border border-stone-200">
            <img
              src={upiQrUrl}
              alt={`UPI QR Code for ${CAMPUSBITE_UPI_ID}`}
              width={180}
              height={180}
              className="rounded-lg"
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

        {/* Remittance Amount Input */}
        <div className="mt-4 space-y-1.5">
          <label
            htmlFor="remit-amount-input"
            className="block text-xs font-bold text-stone-700"
          >
            Amount to Remit (₹)
          </label>
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
              placeholder="Enter amount"
            />
          </div>
          <p className="text-[11px] text-stone-500">
            Current Net Dues: ₹
            {(netCashDue !== undefined
              ? netCashDue
              : getRiderCashReconciliation(phone).net_cash_due
            ).toFixed(2)}
          </p>
        </div>

        {/* Confirmation CTA */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting || parseFloat(remitAmount || "0") <= 0}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 px-4 text-sm font-black text-white shadow-lg shadow-emerald-600/30 transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ShieldCheck className="h-5 w-5" />
            {isSubmitting
              ? "Recording Remittance..."
              : `Confirm Remitted ₹${parseFloat(remitAmount || "0").toFixed(2)}`}
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

export default RemitDuesModal;
