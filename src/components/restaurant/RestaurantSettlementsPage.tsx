"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  IndianRupee,
  Wallet,
  Clock,
  CheckCircle2,
  Printer,
  Download,
  Search,
  RefreshCw,
  Store,
  Calendar,
  Percent,
  X,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Copy,
  Building2,
  Receipt,
  BadgeAlert,
} from "lucide-react";
import { toast } from "sonner";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import { formatINR } from "@/lib/formatters";
import {
  getRestaurantSettlements,
  getCanteenDailyLedgers,
  getCanteenUpcomingDisbursal,
  type RestaurantSettlementOverview,
} from "@/services/restaurantService";
import type {
  CanteenDailySettlement,
  DailyCanteenLedger,
  CanteenUpcomingDisbursal,
} from "@/types";

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function calculateNextPayoutFallback(targetDateStr?: string): { day: string; formatted: string } {
  const d = targetDateStr ? new Date(targetDateStr) : new Date();
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // Mon(1), Tue(2), Wed(3) -> Friday (+4, +3, +2)
  // Thu(4), Fri(5), Sat(6), Sun(0) -> next Tuesday
  let daysToAdd = 0;
  let targetDayName = "Friday";
  if (dayOfWeek >= 1 && dayOfWeek <= 3) {
    targetDayName = "Friday";
    daysToAdd = 5 - dayOfWeek;
  } else {
    targetDayName = "Tuesday";
    if (dayOfWeek === 4) daysToAdd = 5;
    else if (dayOfWeek === 5) daysToAdd = 4;
    else if (dayOfWeek === 6) daysToAdd = 3;
    else if (dayOfWeek === 0) daysToAdd = 2;
  }
  const payoutDate = new Date(d);
  payoutDate.setDate(d.getDate() + daysToAdd);
  const formatted = payoutDate.toLocaleDateString("en-IN", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  return { day: targetDayName, formatted };
}

export function RestaurantSettlementsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [overview, setOverview] = useState<RestaurantSettlementOverview | null>(null);

  // New bi-weekly & daily ledger states
  const [upcomingDisbursal, setUpcomingDisbursal] = useState<CanteenUpcomingDisbursal | null>(null);
  const [dailyLedgers, setDailyLedgers] = useState<DailyCanteenLedger[]>([]);
  const [expandedLedgerDates, setExpandedLedgerDates] = useState<Set<string>>(new Set());

  // Filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Settled" | "Pending">("ALL");

  // Print Slip Modal
  const [selectedSlip, setSelectedSlip] = useState<CanteenDailySettlement | null>(null);

  const fetchSettlementData = useCallback(async (email: string, showToast = false) => {
    if (!email) return;
    try {
      const overviewData = await getRestaurantSettlements(email);
      setOverview(overviewData);

      // Fetch bi-weekly disbursal and daily ledgers in background
      void getCanteenUpcomingDisbursal(email)
        .then((disbursalData) => {
          if (disbursalData) setUpcomingDisbursal(disbursalData);
        })
        .catch(() => null);

      void getCanteenDailyLedgers(email)
        .then((ledgersData) => {
          if (ledgersData && Array.isArray(ledgersData.ledgers)) {
            setDailyLedgers(ledgersData.ledgers);
          }
        })
        .catch(() => null);

      if (showToast) {
        toast.success("Settlement ledger updated");
      }
    } catch (err) {
      console.error("Failed to fetch restaurant settlements:", err);
      if (showToast) {
        toast.error("Failed to sync settlements");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    const email = getRestaurantOwnerEmail() || "taj@campusbite.in";
    setOwnerEmail(email);
    void fetchSettlementData(email);
  }, [fetchSettlementData]);

  // Listen to cross-window settlement updates from admin
  useEffect(() => {
    if (!isMounted || !ownerEmail) return;

    const handleAdminSettlement = () => {
      void fetchSettlementData(ownerEmail, false);
    };

    window.addEventListener("admin_settlement_changed", handleAdminSettlement);
    return () => {
      window.removeEventListener("admin_settlement_changed", handleAdminSettlement);
    };
  }, [isMounted, ownerEmail, fetchSettlementData]);

  const handleRefresh = async () => {
    if (!ownerEmail) return;
    setRefreshing(true);
    await fetchSettlementData(ownerEmail, true);
  };

  const handlePrintSlip = (item: CanteenDailySettlement) => {
    setSelectedSlip(item);
  };

  const executePrint = () => {
    window.print();
  };

  const toggleExpandDate = (dateKey: string) => {
    setExpandedLedgerDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  // WhatsApp EOD copy text handler
  const handleCopyWhatsAppEOD = (item: CanteenDailySettlement | DailyCanteenLedger, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isLedger = "metrics" in item;
    const dateStr = isLedger ? item.date : (item.settlement_date || item.date || "");
    const ordersCount = isLedger ? item.metrics.total_completed_orders : item.orders_count;
    const gross = isLedger ? item.metrics.gross_food_sales : item.gross_food_sales;
    const fee = isLedger ? item.metrics.commission_amount : item.commission_deducted;
    const net = isLedger ? item.metrics.net_payout_accrued : item.net_payable_subtotal;
    const utr = (isLedger ? item.settlement_batch.utr_number : (item.utr_number || item.transaction_ref)) || "Queued for Bank Clearance";
    const batchDay = isLedger ? item.settlement_batch.cycle_day : "Tue/Fri Batch";
    const scheduledDate = isLedger ? item.settlement_batch.scheduled_payout_date : "";

    const canteenName = overview?.today?.restaurant_name || "Campus Canteen";

    const text =
      `*CampusBite Daily EOD Statement*\n` +
      `🏢 *Canteen:* ${canteenName}\n` +
      `📅 *Date:* ${dateStr} (${formatDate(dateStr)})\n` +
      `📦 *Completed Orders:* ${ordersCount}\n` +
      `💰 *Gross Food Sales:* ₹${formatINR(gross)}\n` +
      `🏷️ *18% CampusBite Take-Rate:* -₹${formatINR(fee)}\n` +
      `✅ *Net Credited:* ₹${formatINR(net)}\n` +
      `🏦 *Disbursal Batch:* ${batchDay} ${scheduledDate ? `(${scheduledDate})` : ""}\n` +
      `⚡ *UTR Reference:* ${utr}\n` +
      `\n_Standard 18.0% platform take rate ledgered daily at 9:00 PM; disbursed bi-weekly (Tue & Fri) per T+2 banking clearance._`;

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      toast.success("WhatsApp EOD statement copied to clipboard!");
    } else {
      toast.info("WhatsApp statement generated");
    }
  };

  // Export Daily Summary / Invoice CSV
  const handleDownloadDailyInvoice = (item: CanteenDailySettlement, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const dateStr = item.settlement_date || item.date || new Date().toISOString().split("T")[0];
    const canteenName = item.restaurant_name || overview?.today?.restaurant_name || "Campus Canteen";
    const headers = ["Canteen", "Date", "Fulfilled Orders", "Gross Sales (INR)", "18% Platform Fee (INR)", "Net Credited (INR)", "Status", "Bank UTR"];
    const row = [
      `"${canteenName}"`,
      `"${dateStr}"`,
      item.orders_count,
      (item.gross_food_sales ?? 0).toFixed(2),
      (item.commission_deducted ?? 0).toFixed(2),
      (item.net_payable_subtotal ?? 0).toFixed(2),
      `"${item.status}"`,
      `"${item.utr_number || item.transaction_ref || 'QUEUED_T2'}"`,
    ];
    const csvContent = [headers.join(","), row.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `campusbite_eod_invoice_${canteenName.replace(/\s+/g, "_")}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Daily statement downloaded successfully");
  };

  // Filtered ledger records
  const filteredHistory = useMemo(() => {
    const historyList = Array.isArray(overview?.history) ? overview.history : [];
    return historyList.filter((item) => {
      if (!item) return false;
      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const settlementDate = item.settlement_date ? String(item.settlement_date) : "";
      const matchesSearch =
        !q ||
        settlementDate.toLowerCase().includes(q) ||
        formatDate(settlementDate).toLowerCase().includes(q) ||
        (item.transaction_ref || "").toLowerCase().includes(q) ||
        (item.upi_id || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [overview?.history, statusFilter, searchQuery]);

  const historicalList = useMemo(() => {
    return Array.isArray(overview?.history) ? overview.history : [];
  }, [overview?.history]);

  // Compute fallback next payout date if upcomingDisbursal is loading
  const fallbackSchedule = useMemo(() => calculateNextPayoutFallback(), []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-stone-50/70 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="animate-pulse text-stone-400 font-bold text-sm flex items-center gap-2">
          <Wallet className="h-5 w-5 animate-spin text-orange-500" />
          <span>Loading canteen settlement portal...</span>
        </div>
      </div>
    );
  }

  const today = overview?.today;
  const grossSales = today?.gross_food_sales ?? today?.gross_sales ?? 0;
  const commissionDeducted = today?.commission_deducted ?? today?.commission ?? (0.18 * Number(grossSales || 0));
  const gstAmount = today?.gst_amount ?? today?.gst ?? (0.05 * Number(grossSales || 0));
  const netPayable = today?.net_payable_subtotal ?? today?.net_payout ?? (Number(grossSales || 0) + Number(gstAmount || 0) - Number(commissionDeducted || 0));
  const upiId = today?.upi_id || "canteen.orders@okaxis";

  const isTodaySettled =
    today?.status?.toLowerCase() === "paid" ||
    today?.status?.toLowerCase() === "settled" ||
    Boolean(today?.is_settled);
  const ordersCount = today?.orders_count ?? 0;
  const todayUtr = today?.utr_number || today?.transaction_ref;

  const settlement = {
    status: isTodaySettled ? "paid" : (today?.status || "Pending"),
    is_settled: isTodaySettled,
    utr_number: todayUtr,
    gross_sales: grossSales,
    gst: gstAmount,
    commission: commissionDeducted,
    net_payout: netPayable,
  };

  // Accrued Net Earnings calculation
  const accruedNetEarnings =
    upcomingDisbursal?.accrued_net_earnings ??
    (historicalList
      .filter((i) => i.status !== "Settled" && i.status !== "paid")
      .reduce((sum, i) => sum + (i.net_payable_subtotal || 0), 0) ||
      netPayable);

  const nextPayoutDateText = upcomingDisbursal?.formatted_payout_date || fallbackSchedule.formatted;
  const unsettledLedgersCount =
    upcomingDisbursal?.daily_ledgers_count ??
    (historicalList.filter((i) => i.status !== "Settled" && i.status !== "paid").length || 1);

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Top Banner & Header */}
      <div className="rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-white p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100/90 px-3 py-1 text-xs font-extrabold text-orange-800 border border-orange-200">
                <Wallet className="h-3.5 w-3.5 text-orange-600" />
                <span>Canteen Financial Ledger</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Daily 9:00 PM EOD Ledgering</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-stone-900 tracking-tight">
              Settlements & Daily Payouts
            </h1>
            <p className="text-xs sm:text-sm font-medium text-stone-600 max-w-2xl">
              Track daily gross food subtotals, statutory 5% GST, CampusBite platform commission (18%), and bi-weekly (Tue &amp; Fri) batch disbursals per T+2 banking clearance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {today && (
              <button
                type="button"
                onClick={() => handlePrintSlip(today)}
                className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-orange-700 active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Download Settlement Slip (PDF/Print)</span>
              </button>
            )}

            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-stone-700 shadow-xs hover:bg-stone-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 text-stone-500 ${
                  refreshing ? "animate-spin text-orange-600" : ""
                }`}
              />
              <span>{refreshing ? "Syncing..." : "Sync Live Orders"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          SECTION A: "UPCOMING DISBURSAL" BANNER (Tue & Fri Batch)
      ========================================================= */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/25 px-3 py-1 text-xs font-black text-emerald-300 border border-emerald-400/30">
                <Calendar className="h-3.5 w-3.5 text-emerald-300" />
                <span>Bi-Weekly Bank Disbursal</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/25 px-3 py-1 text-xs font-black text-amber-200 border border-amber-300/40">
                <Clock className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                <span>Queued for Bank Disbursal (T+2 Clearance)</span>
              </span>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300/85">
                Next Scheduled Payout Date
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mt-0.5">
                {nextPayoutDateText}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/75 font-medium mt-1.5 max-w-xl">
                Mon–Wed sales disburse Friday | Thu–Sun sales disburse Tuesday. 18.0% standard take rate ledgered daily at 9:00 PM.
              </p>
            </div>
          </div>

          {/* Accrued Net Balance Highlight Card */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between sm:justify-start gap-4 rounded-2xl border border-emerald-600/50 bg-emerald-800/40 p-5 backdrop-blur-xs min-w-[280px]">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                Accrued Net Earnings
              </span>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono flex items-center">
                <span>₹{formatINR(accruedNetEarnings)}</span>
              </div>
              <p className="text-[11px] font-medium text-emerald-200/75">
                Sum of un-settled daily ledgers
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-emerald-700/60 pt-2.5 w-full text-xs text-emerald-200">
              <span>Queued Ledger Records:</span>
              <span className="rounded-full bg-emerald-700/60 px-2.5 py-0.5 font-mono font-black text-white">
                {unsettledLedgersCount} Days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Primary Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric Card 1: Today's Gross Food Sales */}
        <div className="relative overflow-hidden rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 via-white to-sky-50/20 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="h-4 w-4 text-blue-600" />
                <span>Today&apos;s Gross Food Sales</span>
              </span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                {ordersCount} Orders
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black text-blue-950 tracking-tight flex items-center">
                <IndianRupee className="h-6 w-6 text-blue-700" />
                <span>{formatINR(grossSales)}</span>
              </div>
              <p className="mt-2 text-[11px] font-medium text-blue-800/80 leading-relaxed">
                Kitchen item subtotals (strictly excludes delivery &amp; tech fees).
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-blue-100 flex items-center justify-between text-[11px] font-semibold text-blue-900">
            <span>Payout Destination</span>
            <span className="font-mono text-[10px] bg-blue-100/70 px-1.5 py-0.5 rounded truncate max-w-[130px]" title={upiId}>
              {upiId}
            </span>
          </div>
        </div>

        {/* Metric Card 2: Platform Commission Retained (-18%) */}
        <div className="relative overflow-hidden rounded-3xl border border-purple-200/80 bg-gradient-to-br from-purple-50/50 via-white to-fuchsia-50/20 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-purple-600" />
                <span>Commission Retained</span>
              </span>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                -18% Take-Rate
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight flex items-center">
                <span>-₹{formatINR(commissionDeducted)}</span>
              </div>
              <p className="mt-2 text-[11px] font-medium text-purple-800/80 leading-relaxed">
                CampusBite cloud infrastructure, hostelite reach &amp; dispatching.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-100 flex items-center justify-between text-[11px] font-semibold text-purple-900">
            <span>Platform Take-Rate</span>
            <span className="font-bold">18.00%</span>
          </div>
        </div>

        {/* Metric Card 3: Statutory GST (+5%) */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/20 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                <span>Statutory GST (+5%)</span>
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                +5% Food GST
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight flex items-center">
                <span>+₹{formatINR(gstAmount)}</span>
              </div>
              <p className="mt-2 text-[11px] font-medium text-amber-800/80 leading-relaxed">
                Food tax pass-through collected and disbursed to canteen account.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-[11px] font-semibold text-amber-900">
            <span>GST Statutory Pool</span>
            <span className="font-bold">+5.00%</span>
          </div>
        </div>

        {/* Metric Card 4: Today's Net Payable (Primary Highlight) */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <IndianRupee className="h-4 w-4 text-emerald-700" />
                <span>Today&apos;s Net Payable</span>
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-900">
                Net 87%
              </span>
            </div>

            <div className="mt-2">
              <div className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">
                ₹{formatINR(netPayable)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Gross (₹{formatINR(settlement.gross_sales)}) + 5% GST (₹{formatINR(settlement.gst)}) − 18% Comm (₹{formatINR(settlement.commission)})
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              {settlement.status === "paid" ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <span>✓ Disbursed & Settled via UPI</span>
                  {settlement.utr_number && <span className="font-mono text-[10px] text-emerald-600">({settlement.utr_number})</span>}
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                  <span>⏰ Scheduled for 9:00 PM Batch Transfer</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          SECTION B: "DAILY ORDER RECORDS & EOD STATEMENTS" TABLE
      ========================================================= */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7 shadow-xs space-y-5">
        {/* Table Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
                <span>Historical Settlements Ledger</span>
              </h2>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-600">
                {filteredHistory.length} Days
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              Daily Order Records &amp; EOD Statements with expandable daily itemized order manifests, 18% CampusBite fee breakdown, and WhatsApp EOD reports.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search date or UTR..."
                className="h-9 w-44 sm:w-56 rounded-xl border border-stone-200 pl-8 pr-3 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-orange-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex rounded-xl border border-stone-200 bg-stone-50 p-0.5 text-xs font-bold text-stone-600">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-white text-stone-900 shadow-xs font-black"
                    : "hover:text-stone-900"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("Settled")}
                className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                  statusFilter === "Settled"
                    ? "bg-emerald-600 text-white shadow-xs font-black"
                    : "hover:text-emerald-700"
                }`}
              >
                Settled
              </button>
              <button
                onClick={() => setStatusFilter("Pending")}
                className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                  statusFilter === "Pending"
                    ? "bg-amber-500 text-white shadow-xs font-black"
                    : "hover:text-amber-700"
                }`}
              >
                Pending 9 PM
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        {historicalList.length === 0 ? (
          <div className="py-12 text-center text-zinc-400">
            <p className="text-sm">No historical settlements found.</p>
            <p className="text-xs text-zinc-500 mt-1">Completed orders will be aggregated and settled here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/70 text-[11px] font-extrabold uppercase tracking-wider text-stone-500">
                  <th className="py-3 px-3 rounded-l-xl w-8"></th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-4">Completed Orders</th>
                  <th className="py-3 px-4">Gross Food Sales</th>
                  <th className="py-3 px-4">18% CampusBite Fee</th>
                  <th className="py-3 px-4">Net Credited</th>
                  <th className="py-3 px-4">Disbursal Batch</th>
                  <th className="py-3 px-4">Status &amp; UTR</th>
                  <th className="py-3 px-4 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs font-medium text-stone-700">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-stone-400 font-medium">
                      No settlement records found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item) => {
                    const isSettled = item.status === "Settled" || item.status === "paid";
                    const gross = item.gross_food_sales;
                    const comm = item.commission_deducted;
                    const net = item.net_payable_subtotal;
                    const dateKey = item.settlement_date;
                    const isExpanded = expandedLedgerDates.has(dateKey);

                    // Find matching enriched daily ledger if available
                    const matchedLedger = dailyLedgers.find((l) => l.date === dateKey);
                    const itemizedOrders = matchedLedger?.orders || (dateKey === today?.settlement_date ? overview?.liveOrders : []) || [];
                    const cycleDay = matchedLedger?.settlement_batch?.cycle_day || "TUE / FRI";
                    const payoutDate = matchedLedger?.settlement_batch?.scheduled_payout_date;

                    return (
                      <React.Fragment key={dateKey}>
                        <tr
                          onClick={() => toggleExpandDate(dateKey)}
                          className="hover:bg-amber-50/30 transition-colors cursor-pointer select-none"
                        >
                          {/* Expand chevron */}
                          <td className="py-3.5 px-3 text-stone-400">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-orange-600" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-stone-400 hover:text-stone-700" />
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-3 font-bold text-stone-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-stone-400" />
                              <span>{formatDate(dateKey)}</span>
                              {dateKey === new Date().toISOString().split("T")[0] && (
                                <span className="rounded-md bg-orange-100 px-1.5 py-0.2 text-[10px] font-black text-orange-800">
                                  Today
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Completed Orders */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-bold text-stone-800">
                              {item.orders_count}
                            </span>{" "}
                            <span className="text-stone-400">orders</span>
                          </td>

                          {/* Gross Food Sales */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-bold text-stone-900">
                            ₹{formatINR(gross)}
                          </td>

                          {/* 18% CampusBite Fee */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-red-600 font-bold text-xs">
                            -₹{formatINR(comm)}
                          </td>

                          {/* Net Credited */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                              ₹{formatINR(net)}
                            </span>
                          </td>

                          {/* Disbursal Batch */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="text-[11px] font-semibold text-stone-800">
                              <span className="rounded bg-teal-50 px-2 py-0.5 text-teal-800 font-bold border border-teal-200/60">
                                {cycleDay} Disbursal
                              </span>
                              {payoutDate && (
                                <p className="text-[10px] text-stone-500 mt-0.5 font-medium">
                                  Due {payoutDate}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Status & UTR */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isSettled ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  <span>Settled</span>
                                </span>
                                {(item.transaction_ref || item.utr_number) && (
                                  <p className="font-mono text-[10px] text-stone-500">
                                    {item.transaction_ref || item.utr_number}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800">
                                <Clock className="h-3 w-3 text-amber-600" />
                                <span>Queued (T+2)</span>
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {/* WhatsApp EOD */}
                              <button
                                type="button"
                                title="Copy WhatsApp EOD Statement"
                                onClick={(e) => handleCopyWhatsAppEOD(matchedLedger || item, e)}
                                className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all cursor-pointer"
                              >
                                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="hidden sm:inline">WhatsApp</span>
                              </button>

                              {/* Download Invoice */}
                              <button
                                type="button"
                                title="Download Daily Summary / Invoice CSV"
                                onClick={(e) => handleDownloadDailyInvoice(item, e)}
                                className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 active:scale-95 transition-all cursor-pointer"
                              >
                                <Download className="h-3.5 w-3.5 text-stone-500" />
                                <span className="hidden sm:inline">Invoice</span>
                              </button>

                              {/* Print Slip */}
                              <button
                                type="button"
                                onClick={() => handlePrintSlip(item)}
                                className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-700 shadow-2xs hover:border-orange-300 hover:bg-orange-50 hover:text-orange-900 active:scale-95 transition-all cursor-pointer"
                              >
                                <Printer className="h-3.5 w-3.5 text-stone-500" />
                                <span>Print Slip</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Itemized Order Details Row */}
                        {isExpanded && (
                          <tr className="bg-stone-50/70 border-b border-stone-200">
                            <td colSpan={9} className="p-4 sm:p-5">
                              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-3">
                                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                                  <div className="flex items-center gap-2">
                                    <Receipt className="h-4 w-4 text-orange-600" />
                                    <h4 className="text-xs font-black uppercase tracking-wider text-stone-800">
                                      Itemized Order Manifest &bull; {formatDate(dateKey)}
                                    </h4>
                                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                                      {itemizedOrders.length} Orders
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleCopyWhatsAppEOD(matchedLedger || item)}
                                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Copy className="h-3 w-3" />
                                    <span>Copy WhatsApp Summary</span>
                                  </button>
                                </div>

                                {itemizedOrders.length === 0 ? (
                                  <p className="py-4 text-center text-xs text-stone-400">
                                    No itemized order records available for this date.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="text-[10px] font-black uppercase text-stone-400 border-b border-stone-100 pb-1">
                                          <th className="py-1.5 px-2">Order #</th>
                                          <th className="py-1.5 px-2">Customer</th>
                                          <th className="py-1.5 px-3">Item Breakdown</th>
                                          <th className="py-1.5 px-2 text-right">Food Subtotal</th>
                                          <th className="py-1.5 px-2 text-right">18% CampusBite Fee</th>
                                          <th className="py-1.5 px-2 text-right">Net Credited</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-stone-100 font-medium">
                                        {itemizedOrders.map((ord: any, idx: number) => {
                                          const ordSubtotal = Number(ord.food_subtotal || ord.items_subtotal || ord.total || 0);
                                          const ordFee = Number(ord.commission_amount || (0.18 * ordSubtotal).toFixed(2));
                                          const ordNet = Number(ord.net_payout || (ordSubtotal - ordFee).toFixed(2));
                                          const itemsSummary = ord.items_summary ||
                                            (Array.isArray(ord.items)
                                              ? ord.items.map((it: any) => `${it.quantity || 1}x ${it.name || "Item"}`).join(", ")
                                              : "Delivered Meal Items");

                                          return (
                                            <tr key={ord.order_id || ord._id || idx} className="hover:bg-stone-50">
                                              <td className="py-2 px-2 font-mono text-[11px] font-bold text-stone-900">
                                                {ord.order_number || String(ord._id || ord.order_id || "").slice(-6).toUpperCase()}
                                              </td>
                                              <td className="py-2 px-2 text-stone-700">
                                                {ord.customer_name || "Campus Student"}
                                              </td>
                                              <td className="py-2 px-3 text-stone-600 max-w-xs truncate" title={itemsSummary}>
                                                {itemsSummary}
                                              </td>
                                              <td className="py-2 px-2 text-right font-bold text-stone-900 font-mono">
                                                ₹{formatINR(ordSubtotal)}
                                              </td>
                                              <td className="py-2 px-2 text-right text-red-600 font-mono">
                                                -₹{formatINR(ordFee)}
                                              </td>
                                              <td className="py-2 px-2 text-right font-black text-emerald-800 font-mono">
                                                ₹{formatINR(ordNet)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Receipt / Voucher Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-sm">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900">
                    Daily Settlement Voucher
                  </h3>
                  <p className="text-xs text-stone-500">
                    CampusBite Automated Clearing &amp; POS Accounting Slip
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSlip(null)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Slip Printable Content */}
            <div id="printable-settlement-slip" className="space-y-4 text-xs text-stone-700">
              <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200/70">
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase">
                    Canteen / Restaurant
                  </p>
                  <p className="font-bold text-stone-900 text-sm">
                    {selectedSlip.restaurant_name}
                  </p>
                  <p className="text-[11px] text-stone-500 truncate">
                    {selectedSlip.restaurant_email}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase">
                    Settlement Voucher Date
                  </p>
                  <p className="font-bold text-stone-900 text-sm">
                    {formatDate(selectedSlip.settlement_date)}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {selectedSlip.settlement_date}
                  </p>
                </div>
              </div>

              {/* Financial Ledger Calculation Breakdown */}
              <div className="rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
                <div className="flex justify-between p-3 bg-stone-50/50 font-bold">
                  <span>Completed Meals &amp; Orders:</span>
                  <span className="text-stone-900">{selectedSlip.orders_count} Orders</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-stone-600">Gross Food Sales Subtotal:</span>
                  <span className="font-bold text-stone-900">
                    ₹{formatINR(selectedSlip.gross_food_sales)}
                  </span>
                </div>
                <div className="flex justify-between p-3 text-red-600">
                  <span>CampusBite Platform Commission (18%):</span>
                  <span className="font-bold">
                    -₹{formatINR(selectedSlip.commission_deducted)}
                  </span>
                </div>
                <div className="flex justify-between p-3 text-emerald-800 bg-emerald-50/40">
                  <span>Food GST Added (5%):</span>
                  <span className="font-bold">
                    +₹{formatINR(selectedSlip.gst_amount ?? selectedSlip.gst ?? Number((0.05 * selectedSlip.gross_food_sales).toFixed(2)))}
                  </span>
                </div>
                <div className="flex justify-between p-3.5 bg-stone-100/90 text-sm font-black text-stone-900">
                  <span>Net Disbursed to Canteen:</span>
                  <span className="text-emerald-700">
                    ₹{formatINR(selectedSlip.net_payable_subtotal)}
                  </span>
                </div>
              </div>

              {/* Transfer Details & Destination */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500 font-semibold">Destination UPI VPA:</span>
                  <span className="font-mono text-stone-900 font-bold">{selectedSlip.upi_id || "canteen.orders@okaxis"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-semibold">Bank / UPI Ref (UTR):</span>
                  <span className="font-mono text-stone-900 font-bold">
                    {selectedSlip.transaction_ref || selectedSlip.utr_number || "PENDING_21:00"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-semibold">Clearance Status:</span>
                  <span className="font-bold text-emerald-700 uppercase">
                    {selectedSlip.status || "Pending"}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="rounded-2xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 active:scale-95 transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={executePrint}
                className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-orange-700 active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print / Download Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RestaurantSettlementsPage;
