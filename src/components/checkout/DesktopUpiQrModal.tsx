"use client";

import React, { useState, useEffect } from "react";
import { X, QrCode, Copy, Check, CreditCard } from "lucide-react";
import { CAMPUSBITE_DEFAULT_UPI_ID, buildUpiIntentUrl } from "@/lib/razorpayCheckout";

export interface DesktopUpiQrModalProps {
  isOpen: boolean;
  amount: number;
  orderId: string;
  vpa?: string;
  onDismiss: () => void;
  onOpenRazorpayModal?: () => void;
  onConfirmPayment?: () => void;
  isVerifying?: boolean;
}

export default function DesktopUpiQrModal({
  isOpen,
  amount,
  orderId,
  vpa = CAMPUSBITE_DEFAULT_UPI_ID,
  onDismiss,
  onOpenRazorpayModal,
  onConfirmPayment,
  isVerifying = false,
}: DesktopUpiQrModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  const upiUri = buildUpiIntentUrl({
    amount,
    orderId,
    vpa,
    payeeName: "CampusBite Operations",
    app: "generic",
  });

  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    upiUri
  )}`;

  const handleCopyVpa = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(vpa);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Best effort clipboard write
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="desktop-upi-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm sm:max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 space-y-4">
        {/* Close Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
          aria-label="Close UPI QR modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center pt-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner">
            <QrCode className="h-6 w-6" />
          </div>
          <h2
            id="desktop-upi-title"
            className="mt-3 text-lg font-black text-stone-900 tracking-tight"
          >
            Scan UPI QR Code to Pay
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Scan using PhonePe, Google Pay, Paytm, or any UPI app on your phone.
          </p>
        </div>

        {/* QR Code Card */}
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
          <div className="bg-white p-3 rounded-2xl shadow-xs border border-stone-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={upiQrUrl}
              alt={`UPI QR code for order ${orderId}`}
              width={180}
              height={180}
              className="rounded-xl"
            />
          </div>

          <div className="mt-3 text-center">
            <span className="text-xs text-stone-500 font-medium">Payable Amount</span>
            <p className="text-2xl font-black text-stone-900">₹{amount.toFixed(2)}</p>
          </div>
        </div>

        {/* VPA Copy Bar */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              CampusBite UPI VPA
            </p>
            <p className="font-mono text-xs font-black text-stone-900 truncate">
              {vpa}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyVpa}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-xs font-bold text-amber-800 hover:bg-amber-100 shadow-2xs transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {onConfirmPayment && (
            <button
              type="button"
              onClick={onConfirmPayment}
              disabled={isVerifying}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isVerifying ? "Verifying Payment..." : "I've Completed Payment"}</span>
            </button>
          )}

          {onOpenRazorpayModal && (
            <button
              type="button"
              onClick={onOpenRazorpayModal}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <CreditCard className="h-4 w-4 text-stone-500" />
              <span>Pay via Cards, NetBanking or Razorpay Modal</span>
            </button>
          )}

          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-2 text-stone-500 hover:text-stone-800 font-semibold text-xs transition cursor-pointer text-center"
          >
            Cancel &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}
