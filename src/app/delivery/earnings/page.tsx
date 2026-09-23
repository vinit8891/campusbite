"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  IndianRupee,
  QrCode,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  X,
  Bike,
  Package,
  Check,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DeliverySidebar } from "@/components/delivery/DeliverySidebar";
import { DeliveryNavbar } from "@/components/delivery/DeliveryNavbar";
import { DeliveryBottomNav } from "@/components/delivery/DeliveryBottomNav";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import {
  getDeliveryStats,
  getRiderCashReconciliation,
  remitRiderDues,
  type RiderCashReconciliation,
} from "@/services/deliveryPartnerService";
import {
  getDeliveryHistory,
  getAvailableOrders,
  type DeliveryOrder,
} from "@/services/deliveryService";
import { RIDER_BASE_PAYOUT } from "@/lib/orderPricing";
import { ROUTES } from "@/lib/routes";
import type { DeliveryPartner } from "@/types";

const CAMPUSBITE_UPI_ID = "campusbite.ops@upi";
const CAMPUSBITE_UPI_NAME = "CampusBite Operations";

export default function DeliveryEarningsPage() {
  const [partner, setPartner] = useState<DeliveryPartner | null>(() =>
    getDeliveryPartnerSession()
  );
  const [cih, setCih] = useState<RiderCashReconciliation>({
    cash_in_hand: 0,
    total_payout_earned: 0,
    net_cash_due: 0,
  });
  const [completedOrders, setCompletedOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeRunsCount, setActiveRunsCount] = useState(0);
  const [availablePoolCount, setAvailablePoolCount] = useState(0);

  // Modal State
  const [showRemitModal, setShowRemitModal] = useState(false);
  const [remitAmount, setRemitAmount] = useState<string>("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSubmittingRemit, setIsSubmittingRemit] = useState(false);

  const loadEarningsData = useCallback(async () => {
    try {
      const currentPartner = getDeliveryPartnerSession();
      if (currentPartner) {
        setPartner(currentPartner);
      }
      const phone = currentPartner?.phone;

      // 1. Fetch live CIH local reconciliation
      const currentCih = getRiderCashReconciliation(phone);
      setCih(currentCih);

      // 2. Fetch stats for live badge counts & total earnings
      if (phone) {
        const stats = await getDeliveryStats(phone);
        const assigned = stats.assigned_orders ?? 0;
        const pickedUp = stats.picked_up_orders ?? 0;
        setActiveRunsCount(assigned + pickedUp);

        // Overlay if backend has higher earnings
        if (stats.cash_in_hand !== undefined || stats.total_payout_earned !== undefined) {
          setCih({
            cash_in_hand: stats.cash_in_hand ?? currentCih.cash_in_hand,
            total_payout_earned: stats.total_payout_earned ?? currentCih.total_payout_earned,
            net_cash_due: stats.net_cash_due ?? (stats.cash_in_hand ?? currentCih.cash_in_hand) - (stats.total_payout_earned ?? currentCih.total_payout_earned),
          });
        }
      }

      // 3. Fetch completed order history for ledger
      const history = await getDeliveryHistory({ limit: 50 });
      setCompletedOrders(history.items || []);

      // 4. Fetch available pool
      const pool = await getAvailableOrders({ limit: 50 });
      setAvailablePoolCount(pool.items?.length ?? pool.total ?? 0);
    } catch (err) {
      console.error("Failed to load earnings data:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadEarningsData();

    if (typeof window !== "undefined") {
      const handleSync = () => void loadEarningsData();
      window.addEventListener("delivery_state_changed", handleSync);
      return () => window.removeEventListener("delivery_state_changed", handleSync);
    }
  }, [loadEarningsData]);

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
      await loadEarningsData();
    } catch (err) {
      toast.error("Failed to record remittance. Please try again.");
    } finally {
      setIsSubmittingRemit(false);
    }
  }

  const isDuesPending = cih.net_cash_due > 0;
  const totalCompletedCount = completedOrders.length;
  const totalFlatPayouts = totalCompletedCount * RIDER_BASE_PAYOUT;

  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    `upi://pay?pa=${CAMPUSBITE_UPI_ID}&pn=${encodeURIComponent(
      CAMPUSBITE_UPI_NAME
    )}&am=${parseFloat(remitAmount || "0").toFixed(2)}&cu=INR&tn=Rider%20COD%20Deposit`
  )}`;

  return (
    <div className="flex min-h-screen bg-stone-50/70 text-stone-900 font-sans">
      {/* Desktop Left Sidebar */}
      <DeliverySidebar
        activeRunsCount={activeRunsCount}
        availablePoolCount={availablePoolCount}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <DeliveryNavbar activeRunsCount={activeRunsCount} />

        <main className="w-full min-w-0 flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Header Title Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-800">
                  <IndianRupee className="h-3 w-3" />
                  Rider Finance
                </span>
                <span className="text-xs font-semibold text-stone-500">
                  Flat ₹{RIDER_BASE_PAYOUT.toFixed(0)} Payout Model
                </span>
              </div>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                Earnings & Cash Reconciliation
              </h1>
              <p className="text-sm text-stone-500 mt-0.5">
                Track your ₹20 per-delivery wages, customer cash collected, and settle dues with CampusBite.
              </p>
            </div>

            <button
              onClick={() => {
                setIsRefreshing(true);
                void loadEarningsData();
              }}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 text-sm font-bold shadow-xs hover:bg-stone-50 active:scale-98 transition disabled:opacity-50 cursor-pointer w-fit"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh Balances
            </button>
          </div>

          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-56 w-full rounded-3xl" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Skeleton className="h-32 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
              </div>
              <Skeleton className="h-72 rounded-3xl" />
            </div>
          ) : (
            <>
              {/* 🎯 CORE CASH RECONCILIATION CARD */}
              <section className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-md">
                <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-950 p-6 sm:p-8 text-white">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-orange-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
                          Cash-In-Hand (CIH) Ledger
                        </span>
                      </div>
                      <h2 className="mt-2 text-2xl sm:text-4xl font-black tracking-tight text-white">
                        {isDuesPending
                          ? `₹${cih.net_cash_due.toFixed(2)} Net Due to CampusBite`
                          : "₹0.00 No Dues Pending"}
                      </h2>
                      <p className="mt-1.5 text-xs sm:text-sm text-stone-300 max-w-xl">
                        {isDuesPending
                          ? "You have collected customer cash on COD deliveries. Your earned ₹20 delivery fees are already deducted from the cash total."
                          : "Your collected customer cash is completely balanced with your delivery earnings. Your account is in good standing."}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        onClick={handleOpenRemitModal}
                        disabled={cih.net_cash_due <= 0}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-orange-600/30 transition hover:from-orange-600 hover:to-orange-700 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <QrCode className="h-5 w-5" />
                        Remit Dues via UPI ⚡
                      </button>

                      <Link
                        href={ROUTES.DELIVERY_HISTORY}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-98 text-center"
                      >
                        <Package className="h-4 w-4 text-stone-300" />
                        View All Orders
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Mathematical Reconciliation Strip */}
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-200/80 bg-stone-50/50 p-4 sm:p-6">
                  {/* 1. Collected Cash */}
                  <div className="p-4 sm:p-5 flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                      <ArrowDownRight className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                        1. Collected Cash (COD)
                      </span>
                      <p className="mt-1 text-2xl sm:text-3xl font-black text-amber-900">
                        ₹{cih.cash_in_hand.toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        Total cash received directly from students
                      </p>
                    </div>
                  </div>

                  {/* 2. Earned Wages */}
                  <div className="p-4 sm:p-5 flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                      <ArrowUpRight className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                        2. Earned Wages (Deducted)
                      </span>
                      <p className="mt-1 text-2xl sm:text-3xl font-black text-emerald-700">
                        -₹{cih.total_payout_earned.toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        ₹{RIDER_BASE_PAYOUT.toFixed(0)} flat fee per order + 100% tips
                      </p>
                    </div>
                  </div>

                  {/* 3. Net Balance Due */}
                  <div className="p-4 sm:p-5 flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
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
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                        3. Net Due to CampusBite
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
                          ? "Deposit via UPI QR below"
                          : "All collected cash reconciled"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 📊 KEY PERFORMANCE METRICS */}
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="rounded-3xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Total Deliveries
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                      <Bike className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-2 text-3xl font-black text-stone-900">
                    {totalCompletedCount}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Orders successfully handed over
                  </p>
                </div>

                <div className="rounded-3xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Base Payout Earnings
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <IndianRupee className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-2 text-3xl font-black text-emerald-700">
                    ₹{totalFlatPayouts.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Guaranteed ₹{RIDER_BASE_PAYOUT.toFixed(0)} × {totalCompletedCount} deliveries
                  </p>
                </div>

                <div className="rounded-3xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Account Status
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                        isDuesPending
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-current" />
                      {isDuesPending ? "Dues Active" : "100% Reconciled"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    Active campus runner account
                  </p>
                </div>
              </section>

              {/* 📜 RECENT FULFILLED DELIVERIES & SETTLEMENT TABLE */}
              <section className="rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">
                      Fulfilled Deliveries & Wage Log
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-500">
                      Breakdown of customer payments and your ₹20 per-order payout
                    </p>
                  </div>
                  <span className="text-xs font-bold text-stone-500 bg-stone-100 px-3 py-1.5 rounded-xl">
                    {completedOrders.length} records
                  </span>
                </div>

                {completedOrders.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
                    <Bike className="mx-auto h-12 w-12 text-stone-400" />
                    <h4 className="mt-3 text-base font-bold text-stone-800">
                      No fulfilled orders logged yet
                    </h4>
                    <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                      Accept available deliveries from the marketplace. Once delivered, your ₹20 earnings will automatically appear here.
                    </p>
                    <Link
                      href={ROUTES.DELIVERY_AVAILABLE}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition"
                    >
                      Browse Available Orders
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-stone-100">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-stone-50 text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200/80">
                        <tr>
                          <th className="px-4 py-3.5">Order ID</th>
                          <th className="px-4 py-3.5">Customer & Location</th>
                          <th className="px-4 py-3.5">Payment Mode</th>
                          <th className="px-4 py-3.5 text-right">Cash Collected</th>
                          <th className="px-4 py-3.5 text-right">Your Payout</th>
                          <th className="px-4 py-3.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-stone-800">
                        {completedOrders.map((order) => {
                          const isCod =
                            (order.payment_method || "").toLowerCase().includes("cod") ||
                            (order.payment_method || "").toLowerCase().includes("cash");
                          const cashAmount = isCod ? order.total || 0 : 0;
                          const payout = RIDER_BASE_PAYOUT;

                          return (
                            <tr
                              key={order._id}
                              className="hover:bg-orange-50/30 transition-colors"
                            >
                              <td className="px-4 py-3.5 font-bold font-mono text-xs text-stone-900">
                                #{order._id.slice(-8).toUpperCase()}
                              </td>
                              <td className="px-4 py-3.5">
                                <p className="font-semibold text-stone-900 text-xs sm:text-sm">
                                  {order.customer_name || "Student"}
                                </p>
                                <p className="text-[11px] text-stone-500 truncate max-w-xs">
                                  {order.address || "Campus Quad"}
                                </p>
                              </td>
                              <td className="px-4 py-3.5">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                                    isCod
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {isCod ? "Cash on Delivery" : "Online Pre-paid"}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right font-bold text-stone-900">
                                {isCod ? `₹${cashAmount.toFixed(2)}` : "₹0.00"}
                              </td>
                              <td className="px-4 py-3.5 text-right font-black text-emerald-700">
                                +₹{payout.toFixed(2)}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  ✓ Delivered
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <DeliveryBottomNav
        activeRunsCount={activeRunsCount}
        availablePoolCount={availablePoolCount}
      />

      {/* 💳 INTERACTIVE REMIT DUES VIA UPI MODAL */}
      {showRemitModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-200">
            {/* Close Button */}
            <button
              onClick={() => setShowRemitModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Title */}
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 shadow-inner">
                <QrCode className="h-7 w-7" />
              </div>
              <h3 className="mt-3.5 text-xl font-black text-stone-900">
                Remit Dues to CampusBite
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Scan the UPI QR code or pay to the official VPA to settle your collected COD cash.
              </p>
            </div>

            {/* QR Code Card */}
            <div className="mt-6 flex flex-col items-center justify-center p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
              <div className="bg-white p-3 rounded-xl shadow-xs border border-stone-200">
                <img
                  src={upiQrUrl}
                  alt="CampusBite UPI Deposit QR"
                  className="h-44 w-44 object-contain rounded-lg"
                />
              </div>
              <p className="mt-2.5 text-[11px] font-bold text-stone-600 text-center">
                Scan with Google Pay, PhonePe, Paytm, or BHIM
              </p>
            </div>

            {/* UPI ID Copy Field */}
            <div className="mt-4 p-3 rounded-2xl bg-stone-100 flex items-center justify-between gap-2 border border-stone-200/70">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  CampusBite Official UPI ID
                </span>
                <p className="text-sm font-mono font-bold text-stone-900 truncate">
                  {CAMPUSBITE_UPI_ID}
                </p>
              </div>

              <button
                onClick={handleCopyUpi}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-bold text-orange-600 hover:bg-orange-50 active:scale-95 transition shadow-xs shrink-0 cursor-pointer"
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

            {/* Amount Input */}
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                Settlement Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={remitAmount}
                  onChange={(e) => setRemitAmount(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-8 pr-4 text-sm font-bold text-stone-900 shadow-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden"
                  placeholder="Enter amount"
                />
              </div>
            </div>

            {/* Confirmation CTA */}
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={handleConfirmRemittance}
                disabled={isSubmittingRemit}
                className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-orange-600/30 transition disabled:opacity-50 cursor-pointer text-center"
              >
                {isSubmittingRemit
                  ? "Processing Settlement..."
                  : `Confirm Remittance of ₹${parseFloat(remitAmount || "0").toFixed(2)} ✓`}
              </button>

              <button
                onClick={() => setShowRemitModal(false)}
                className="w-full py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold text-xs transition cursor-pointer text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
