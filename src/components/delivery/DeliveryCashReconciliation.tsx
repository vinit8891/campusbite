"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Wallet,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  X,
  IndianRupee,
  Package,
} from "lucide-react";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import {
  getRiderCashReconciliation,
  remitRiderDues,
  getDeliveryStats,
  type RiderCashReconciliation,
} from "@/services/deliveryPartnerService";
import { RIDER_BASE_PAYOUT } from "@/lib/orderPricing";
import { ROUTES } from "@/lib/routes";
import type { DeliveryPartner } from "@/types";

export const CAMPUSBITE_UPI_ID = "campusbite.ops@upi";
export const CAMPUSBITE_UPI_NAME = "CampusBite Operations";

export type DeliveryCashReconciliationProps = {
  initialCih?: RiderCashReconciliation;
  onRemitSuccess?: (updated: RiderCashReconciliation) => void | Promise<void>;
  showViewOrdersLink?: boolean;
  className?: string;
};

export function DeliveryCashReconciliation({
  initialCih,
  onRemitSuccess,
  showViewOrdersLink = true,
  className = "",
}: DeliveryCashReconciliationProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [partner, setPartner] = useState<DeliveryPartner | null>(null);
  const [cih, setCih] = useState<RiderCashReconciliation>(
    initialCih || {
      cash_in_hand: 0,
      total_payout_earned: 0,
      net_cash_due: 0,
      total_cod_collected: 0,
      total_remitted: 0,
      completed_deliveries: 0,
    }
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Remittance Modal State
  const [showRemitModal, setShowRemitModal] = useState(false);
  const [remitAmount, setRemitAmount] = useState<string>("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSubmittingRemit, setIsSubmittingRemit] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const syncBalances = useCallback(async () => {
    try {
      const current = getDeliveryPartnerSession();
      if (current) setPartner(current);
      const phone = current?.phone;

      // 1. Fetch local storage reconciliation (forces dynamic re-scan & ₹20 recalculation)
      const localCih = getRiderCashReconciliation(phone);
      let nextCih = localCih;

      // 2. Overlay server stats if available
      if (phone) {
        try {
          const stats = await getDeliveryStats(phone);
          if (
            stats.cash_in_hand !== undefined ||
            stats.total_payout_earned !== undefined
          ) {
            const cash = stats.cash_in_hand ?? localCih.cash_in_hand;
            const wage = stats.total_payout_earned ?? localCih.total_payout_earned;
            nextCih = {
              cash_in_hand: cash,
              total_payout_earned: wage,
              net_cash_due: stats.net_cash_due !== undefined ? Math.max(0, stats.net_cash_due) : Math.max(0, Number((cash - wage).toFixed(2))),
              total_cod_collected: localCih.total_cod_collected,
              total_remitted: localCih.total_remitted,
              completed_deliveries: localCih.completed_deliveries,
            };
          }
        } catch {
          // Graceful fallback to local storage
        }
      }

      setCih(nextCih);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (initialCih) {
      setCih(initialCih);
    }
  }, [initialCih]);

  useEffect(() => {
    if (!isMounted) return;
    void syncBalances();

    if (typeof window !== "undefined") {
      const handleSync = () => void syncBalances();
      window.addEventListener("delivery_state_changed", handleSync);
      return () => {
        window.removeEventListener("delivery_state_changed", handleSync);
      };
    }
  }, [isMounted, syncBalances]);

  if (!isMounted) {
    return (
      <div className={`bg-neutral-900 rounded-3xl p-6 text-white text-center animate-pulse ${className}`}>
        <div className="h-6 w-48 bg-neutral-800 rounded mx-auto mb-2"></div>
        <div className="h-10 w-32 bg-neutral-800 rounded mx-auto"></div>
      </div>
    );
  }

  function handleOpenRemitModal() {
    setRemitAmount(Math.max(0, cih.net_cash_due).toFixed(2));
    setShowRemitModal(true);
  }

  function handleCopyUpi() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(CAMPUSBITE_UPI_ID);
      setCopiedUpi(true);
      toast.success("UPI ID copied to clipboard!");
      setTimeout(() => setCopiedUpi(false), 2500);
    }
  }

  async function handleConfirmRemittance() {
    const amountNum = parseFloat(remitAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid remittance amount.");
      return;
    }

    try {
      setIsSubmittingRemit(true);
      const phone = partner?.phone;
      const updated = remitRiderDues(phone, amountNum);
      setCih(updated);

      toast.success("Dues remittance confirmed!", {
        description: `Successfully cleared ₹${amountNum.toFixed(2)} from your Cash-In-Hand balance.`,
      });

      setShowRemitModal(false);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("delivery_state_changed"));
      }

      if (onRemitSuccess) {
        await onRemitSuccess(updated);
      }

      await syncBalances();
    } catch (err) {
      toast.error("Failed to record remittance. Please try again.");
    } finally {
      setIsSubmittingRemit(false);
    }
  }

  const isDuesPending = cih.net_cash_due > 0;
  const currentRemitNum = parseFloat(remitAmount || "0");
  const upiQrAmount = isNaN(currentRemitNum) ? "0.00" : currentRemitNum.toFixed(2);
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    `upi://pay?pa=${CAMPUSBITE_UPI_ID}&pn=${encodeURIComponent(
      CAMPUSBITE_UPI_NAME
    )}&am=${upiQrAmount}&cu=INR&tn=Rider%20COD%20Deposit`
  )}`;

  return (
    <section
      aria-label="Cash-in-Hand Reconciliation"
      className={`overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-md ${className}`}
    >
      {/* 🌟 Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-950 p-5 sm:p-7 lg:p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400">
                <Wallet className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
                Cash-In-Hand (CIH) Reconciliation
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-2.5 py-0.5 text-[11px] font-semibold text-stone-300 border border-stone-700">
                Flat ₹{RIDER_BASE_PAYOUT.toFixed(0)}/run model
              </span>
            </div>

            <h2 className="mt-2.5 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              {isDuesPending ? (
                <>
                  <span className="text-amber-400">
                    ₹{cih.net_cash_due.toFixed(2)}
                  </span>
                  <span className="text-base sm:text-xl font-bold text-stone-300">
                    Net Cash Due to CampusBite
                  </span>
                </>
              ) : (
                <>
                  <span className="text-emerald-400">₹0.00</span>
                  <span className="text-base sm:text-xl font-bold text-stone-300">
                    No Dues Pending (All Reconciled)
                  </span>
                </>
              )}
            </h2>

            <p className="mt-1.5 text-xs sm:text-sm text-stone-300 max-w-xl">
              {isDuesPending
                ? "You have collected customer cash on COD deliveries. Your earned ₹20 delivery wages are already deducted from the cash total."
                : "Your collected customer cash is completely balanced with your earned delivery wages. Your account is 100% in good standing."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Remit Dues Action Button */}
            <button
              onClick={handleOpenRemitModal}
              disabled={cih.net_cash_due <= 0}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 sm:px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-orange-600/30 transition hover:from-orange-600 hover:to-orange-700 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <QrCode className="h-5 w-5" />
              Remit Dues via UPI ⚡
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => {
                setIsRefreshing(true);
                void syncBalances().then(() => {
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event("delivery_state_changed"));
                  }
                  toast.success("Reconciliation balances synced & refreshed!");
                });
              }}
              disabled={isRefreshing}
              title="Refresh live reconciliation balances"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-800 border border-stone-700 hover:bg-stone-700 px-4 py-3.5 text-xs font-bold text-stone-200 transition active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin text-orange-400" : ""}`}
              />
              <span className="hidden sm:inline">Sync</span>
            </button>

            {showViewOrdersLink && (
              <Link
                href={ROUTES.DELIVERY_ORDERS}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-98"
              >
                <Package className="h-4 w-4 text-stone-300" />
                Active Runs
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 📊 3 Reconciled Cards Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-200/80 bg-stone-50/70 p-4 sm:p-6">
        {/* Card 1: Collected Cash (COD) */}
        <div className="p-4 sm:p-5 flex items-start gap-4 bg-white md:bg-transparent rounded-2xl md:rounded-none shadow-xs md:shadow-none mb-3 md:mb-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-xs">
            <ArrowDownRight className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-500">
              Card 1: Collected Cash (COD)
            </span>
            <p className="mt-1 text-2xl sm:text-3xl font-black text-amber-900">
              ₹{cih.cash_in_hand.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Total physical cash collected from students on COD orders
            </p>
          </div>
        </div>

        {/* Card 2: Earned Wages (Deducted) */}
        <div className="p-4 sm:p-5 flex items-start gap-4 bg-white md:bg-transparent rounded-2xl md:rounded-none shadow-xs md:shadow-none mb-3 md:mb-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-xs">
            <ArrowUpRight className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-500">
              Card 2: Earned Wages (Deducted)
            </span>
            <p className="mt-1 text-2xl sm:text-3xl font-black text-emerald-700">
              -₹{cih.total_payout_earned.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Flat ₹{RIDER_BASE_PAYOUT.toFixed(0)}/order guaranteed wage + customer tips
            </p>
          </div>
        </div>

        {/* Card 3: Net Cash Due to CampusBite */}
        <div className="p-4 sm:p-5 flex items-start gap-4 bg-white md:bg-transparent rounded-2xl md:rounded-none shadow-xs md:shadow-none">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs ${
              isDuesPending
                ? "bg-rose-100 text-rose-800"
                : "bg-teal-100 text-teal-800"
            }`}
          >
            {isDuesPending ? (
              <AlertTriangle className="h-6 w-6" />
            ) : (
              <CheckCircle2 className="h-6 w-6" />
            )}
          </div>
          <div>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-500">
              Card 3: Net Cash Due to CampusBite
            </span>
            <p
              className={`mt-1 text-2xl sm:text-3xl font-black ${
                isDuesPending ? "text-rose-700" : "text-teal-700"
              }`}
            >
              ₹{cih.net_cash_due.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {isDuesPending
                ? "Settle dues via UPI QR code before next payout cycle"
                : "All collected cash is fully settled & reconciled"}
            </p>
          </div>
        </div>
      </div>

      {/* 💳 INTERACTIVE REMIT DUES VIA UPI MODAL */}
      {showRemitModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remit-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              onClick={() => setShowRemitModal(false)}
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
                Current Net Dues: ₹{cih.net_cash_due.toFixed(2)}
              </p>
            </div>

            {/* Confirmation CTA */}
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => void handleConfirmRemittance()}
                disabled={isSubmittingRemit || parseFloat(remitAmount || "0") <= 0}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 px-4 text-sm font-black text-white shadow-lg shadow-emerald-600/30 transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ShieldCheck className="h-5 w-5" />
                {isSubmittingRemit
                  ? "Recording Remittance..."
                  : `Confirm Remitted ₹${parseFloat(remitAmount || "0").toFixed(2)}`}
              </button>

              <button
                type="button"
                onClick={() => setShowRemitModal(false)}
                className="w-full py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 transition cursor-pointer"
              >
                Cancel & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default DeliveryCashReconciliation;
