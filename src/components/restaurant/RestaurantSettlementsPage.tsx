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
} from "lucide-react";
import { toast } from "sonner";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import {
  getRestaurantSettlements,
  type RestaurantSettlementOverview,
} from "@/services/restaurantService";
import type { CanteenDailySettlement } from "@/types";

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

export function RestaurantSettlementsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [overview, setOverview] = useState<RestaurantSettlementOverview | null>(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Settled" | "Pending">("ALL");

  // Print Slip Modal
  const [selectedSlip, setSelectedSlip] = useState<CanteenDailySettlement | null>(null);

  const fetchSettlementData = useCallback(async (email: string, showToast = false) => {
    if (!email) return;
    try {
      const data = await getRestaurantSettlements(email);
      setOverview(data);
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

  // Filtered ledger records
  const filteredHistory = useMemo(() => {
    if (!overview?.history) return [];
    return overview.history.filter((item) => {
      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.settlement_date.toLowerCase().includes(q) ||
        formatDate(item.settlement_date).toLowerCase().includes(q) ||
        (item.transaction_ref || "").toLowerCase().includes(q) ||
        (item.upi_id || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [overview?.history, statusFilter, searchQuery]);

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
  const grossSales = today?.gross_food_sales ?? 0;
  const commissionDeducted = today?.commission_deducted ?? Number((0.18 * grossSales).toFixed(2));
  const gstAmount = today?.gst_amount ?? Number((0.05 * grossSales).toFixed(2));
  const netPayable = today?.net_payable_subtotal ?? Number((grossSales + gstAmount - commissionDeducted).toFixed(2));
  const upiId = today?.upi_id || "canteen.orders@okaxis";
  const isTodaySettled = today?.status === "Settled";
  const ordersCount = today?.orders_count ?? 0;
  const todayUtr = today?.transaction_ref;

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
                <span>Daily 9:00 PM UPI Batch</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-stone-900 tracking-tight">
              Settlements & Daily Payouts
            </h1>
            <p className="text-xs sm:text-sm font-medium text-stone-600 max-w-2xl">
              Track daily gross food subtotals, statutory 5% GST, CampusBite platform commission (18%), and automated 9:00 PM UPI payouts.
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

      {/* 4 Primary Live Metric Cards */}
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
                <span>{grossSales.toFixed(2)}</span>
              </div>
              <p className="mt-2 text-[11px] font-medium text-blue-800/80 leading-relaxed">
                Kitchen item subtotals (strictly excludes delivery & tech fees).
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
                <span>-₹{commissionDeducted.toFixed(2)}</span>
              </div>
              <p className="mt-2 text-[11px] font-medium text-purple-800/80 leading-relaxed">
                CampusBite cloud infrastructure, hostelite reach & dispatching.
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
                <span>+₹{gstAmount.toFixed(2)}</span>
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
                ₹{netPayable.toFixed(2)}
              </div>
              <p className="mt-2 text-[11px] font-medium text-emerald-800/90 leading-relaxed">
                Gross (₹{grossSales.toFixed(2)}) + 5% GST (₹{gstAmount.toFixed(2)}) − 18% Comm (₹{commissionDeducted.toFixed(2)})
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              {isTodaySettled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-900 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>✅ Paid via Bank UTR: {todayUtr || "SETTLED"}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-900 border border-amber-200 animate-pulse">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  <span>⏰ Scheduled for 9:00 PM Batch Transfer</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Historical Settlements Ledger Table */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7 shadow-xs space-y-5">
        {/* Table Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-stone-900 tracking-tight flex items-center gap-2">
              <span>Historical Settlements Ledger</span>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-600">
                {filteredHistory.length} Days
              </span>
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              Daily consolidated settlement vouchers, bank UTR references, and print-ready receipts.
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
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  statusFilter === "ALL"
                    ? "bg-white text-stone-900 shadow-xs font-black"
                    : "hover:text-stone-900"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("Settled")}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  statusFilter === "Settled"
                    ? "bg-emerald-600 text-white shadow-xs font-black"
                    : "hover:text-emerald-700"
                }`}
              >
                Settled
              </button>
              <button
                onClick={() => setStatusFilter("Pending")}
                className={`rounded-lg px-2.5 py-1 transition-all ${
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/70 text-[11px] font-extrabold uppercase tracking-wider text-stone-500">
                <th className="py-3 px-4 rounded-l-xl">Settlement Date</th>
                <th className="py-3 px-4">Fulfilled Orders</th>
                <th className="py-3 px-4">Gross Sales (₹)</th>
                <th className="py-3 px-4">Platform Fee (18%)</th>
                <th className="py-3 px-4">Net Disbursed (₹)</th>
                <th className="py-3 px-4">Settlement Status</th>
                <th className="py-3 px-4">Bank / UPI UTR</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs font-medium text-stone-700">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-400 font-medium">
                    No settlement records found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => {
                  const isSettled = item.status === "Settled";
                  const gross = item.gross_food_sales;
                  const comm = item.commission_deducted;
                  const net = item.net_payable_subtotal;

                  return (
                    <tr
                      key={item.settlement_date}
                      className="hover:bg-amber-50/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-stone-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-stone-400" />
                          <span>{formatDate(item.settlement_date)}</span>
                          {item.settlement_date === new Date().toISOString().split("T")[0] && (
                            <span className="rounded-md bg-orange-100 px-1.5 py-0.2 text-[10px] font-black text-orange-800">
                              Today
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-stone-800">
                          {item.orders_count}
                        </span>{" "}
                        <span className="text-stone-400">orders</span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-stone-900">
                        ₹{gross.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-purple-700 font-bold">
                        -₹{comm.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                          ₹{net.toFixed(2)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isSettled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Settled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800">
                            <Clock className="h-3 w-3 text-amber-600" />
                            <span>Pending 9:00 PM</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-stone-600">
                        {item.transaction_ref ? (
                          <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-800 font-bold">
                            {item.transaction_ref}
                          </span>
                        ) : (
                          <span className="text-stone-400 italic">Scheduled 21:00</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handlePrintSlip(item)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 shadow-2xs hover:border-orange-300 hover:bg-orange-50 hover:text-orange-900 active:scale-95 transition-all cursor-pointer"
                        >
                          <Printer className="h-3.5 w-3.5 text-stone-500" />
                          <span>Print Slip</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
                    CampusBite Automated Clearing & POS Accounting Slip
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSlip(null)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
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
                    Settlement Date
                  </p>
                  <p className="font-bold text-stone-900 text-sm">
                    {formatDate(selectedSlip.settlement_date)}
                  </p>
                  <p className="text-[11px] text-stone-500 font-mono">
                    Batch: 21:00 IST
                  </p>
                </div>
              </div>

              {/* UPI & UTR Box */}
              <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-amber-800 uppercase">
                    Destination UPI VPA:
                  </span>
                  <span className="font-mono font-bold text-stone-900">
                    {selectedSlip.upi_id}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-amber-800 uppercase">
                    Bank UTR Reference:
                  </span>
                  <span className="font-mono font-bold text-stone-900">
                    {selectedSlip.transaction_ref || "PENDING 21:00 BATCH"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-amber-800 uppercase">
                    Status:
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      selectedSlip.status === "Settled"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-200 text-amber-900"
                    }`}
                  >
                    {selectedSlip.status === "Settled" ? "DISBURSED / SETTLED" : "SCHEDULED"}
                  </span>
                </div>
              </div>

              {/* Financial Tally Breakdown */}
              <div className="rounded-2xl border border-stone-200 p-4 space-y-2 bg-white">
                <div className="flex justify-between items-center text-stone-600">
                  <span>Fulfilled Orders Count:</span>
                  <span className="font-bold text-stone-900">
                    {selectedSlip.orders_count} orders
                  </span>
                </div>
                <div className="flex justify-between items-center text-stone-600">
                  <span>Gross Food Sales Subtotal:</span>
                  <span className="font-bold text-stone-900">
                    ₹{selectedSlip.gross_food_sales.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-stone-600">
                  <span>Food GST Added (5%):</span>
                  <span className="font-bold text-stone-900">
                    +₹{(selectedSlip.gst_amount ?? (selectedSlip.gross_food_sales * 0.05)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-purple-700">
                  <span>CampusBite Platform Commission (18%):</span>
                  <span className="font-bold">
                    -₹{selectedSlip.commission_deducted.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-stone-200 pt-2.5 flex justify-between items-center text-sm font-black text-stone-900">
                  <span>Net Disbursed to Canteen:</span>
                  <span className="text-base text-emerald-700">
                    ₹{selectedSlip.net_payable_subtotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-stone-400 text-center">
                Verified electronic clearing voucher issued by CampusBite Operations. Retain for counter POS accounting.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedSlip(null)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50"
              >
                Close
              </button>
              <button
                onClick={executePrint}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-orange-700 active:scale-95 transition-all cursor-pointer"
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
