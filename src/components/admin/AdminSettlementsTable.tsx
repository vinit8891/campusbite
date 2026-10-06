"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  IndianRupee,
  MessageCircle,
  Percent,
  Printer,
  RefreshCw,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Store,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminCanteenDailyBreakdown,
  recordCanteenSettlementAdmin,
  triggerCanteenBatchPayoutAdmin,
  type CanteenDailySettlement,
} from "@/services/adminService";

export function AdminSettlementsTable() {
  const [isMounted, setIsMounted] = useState(false);
  const [settlements, setSettlements] = useState<CanteenDailySettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // Individual Settlement Modal
  const [activeModalItem, setActiveModalItem] = useState<CanteenDailySettlement | null>(null);
  const [customTxnRef, setCustomTxnRef] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk 9:00 PM Batch Modal
  const [isBulkBatchModalOpen, setIsBulkBatchModalOpen] = useState(false);
  const [bulkBatchRef, setBulkBatchRef] = useState("");
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setSelectedDate(new Date().toISOString().split("T")[0]);
  }, []);

  const loadData = async (dateStr?: string) => {
    try {
      setLoading(true);
      const data = await getAdminCanteenDailyBreakdown(dateStr || selectedDate);
      setSettlements(data);
    } catch (err) {
      console.error("Failed to load canteen daily settlements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    void loadData();

    const handleStateChange = () => {
      void loadData();
    };

    window.addEventListener("admin_settlement_changed", handleStateChange);
    return () => {
      window.removeEventListener("admin_settlement_changed", handleStateChange);
    };
  }, [isMounted, selectedDate]);

  const handleOpenIndividualModal = (item: CanteenDailySettlement) => {
    const defaultRef = `UPI/${selectedDate.replace(/-/g, "")}/${Math.floor(100000 + Math.random() * 900000)}`;
    setCustomTxnRef(defaultRef);
    setActiveModalItem(item);
  };

  const handleOpenBulkModal = () => {
    const defaultRef = `BATCH/9PM/${selectedDate.replace(/-/g, "")}/${Math.floor(100000 + Math.random() * 900000)}`;
    setBulkBatchRef(defaultRef);
    setIsBulkBatchModalOpen(true);
  };

  const handleConfirmIndividualSettlement = async () => {
    if (!activeModalItem) return;

    try {
      setIsSubmitting(true);
      const res = await recordCanteenSettlementAdmin({
        restaurant_email: activeModalItem.restaurant_email,
        restaurant_name: activeModalItem.restaurant_name,
        upi_id: activeModalItem.upi_id,
        amount: activeModalItem.net_payable_subtotal,
        orders_count: activeModalItem.orders_count,
        transaction_ref: customTxnRef.trim(),
        settlement_date: selectedDate,
      });

      toast.success(
        res.message ||
          `Settlement marked as paid for ${activeModalItem.restaurant_name}`
      );
      setActiveModalItem(null);
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record settlement"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmBulkPayout = async () => {
    try {
      setIsSubmittingBulk(true);
      const pendingItems = settlements.filter((s) => s.status !== "Settled");
      const emails = pendingItems.map((s) => s.restaurant_email);

      const res = await triggerCanteenBatchPayoutAdmin({
        settlement_date: selectedDate,
        batch_reference: bulkBatchRef.trim(),
        restaurant_emails: emails.length > 0 ? emails : undefined,
      });

      // Also record each pending canteen in local store
      for (const item of pendingItems) {
        await recordCanteenSettlementAdmin({
          restaurant_email: item.restaurant_email,
          restaurant_name: item.restaurant_name,
          upi_id: item.upi_id,
          amount: item.net_payable_subtotal,
          orders_count: item.orders_count,
          transaction_ref: bulkBatchRef.trim(),
          settlement_date: selectedDate,
        }).catch(() => null);
      }

      toast.success(
        res.message ||
          `9:00 PM Batch payout confirmed for ${pendingItems.length} canteens!`
      );
      setIsBulkBatchModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to execute bulk batch payout"
      );
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  const getWhatsAppShareUrl = (item: CanteenDailySettlement) => {
    const utr = item.transaction_ref || "PENDING-9PM-BATCH";
    const text = `CampusBite Daily Settlement (${selectedDate}): Orders: ${item.orders_count} | Gross: ₹${item.gross_food_sales.toFixed(2)} | Net Transferred: ₹${item.net_payable_subtotal.toFixed(2)} | Ref: ${utr}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const handleExportCsv = () => {
    const headers = [
      "Settlement Date",
      "Canteen Name",
      "Canteen Email",
      "UPI ID / Bank A/C",
      "Orders Count",
      "Gross Food Sales (₹)",
      "Statutory GST 5% (₹)",
      "Platform Commission 18% (₹)",
      "Net Transfer Amount (₹)",
      "Settlement Status",
      "Transaction Ref / UTR",
    ];

    const rows = settlements.map((s) => [
      s.settlement_date,
      `"${s.restaurant_name}"`,
      s.restaurant_email,
      s.upi_id,
      s.orders_count,
      s.gross_food_sales.toFixed(2),
      (s.gst_amount ?? (s.gross_food_sales * 0.05)).toFixed(2),
      s.commission_deducted.toFixed(2),
      s.net_payable_subtotal.toFixed(2),
      s.status,
      s.transaction_ref || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `campusbite_settlements_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported settlement report for ${selectedDate}`);
  };

  if (!isMounted) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-32 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  const filtered = settlements.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.restaurant_name.toLowerCase().includes(q) ||
      s.restaurant_email.toLowerCase().includes(q) ||
      s.upi_id.toLowerCase().includes(q) ||
      (s.transaction_ref || "").toLowerCase().includes(q)
    );
  });

  const totalGross = settlements.reduce((sum, s) => sum + s.gross_food_sales, 0);
  const totalCommission = settlements.reduce((sum, s) => sum + s.commission_deducted, 0);
  const totalGst = settlements.reduce((sum, s) => sum + (s.gst_amount ?? (s.gross_food_sales * 0.05)), 0);
  const totalNetPayable = settlements.reduce((sum, s) => sum + s.net_payable_subtotal, 0);
  const totalOrders = settlements.reduce((sum, s) => sum + s.orders_count, 0);
  const pendingCount = settlements.filter((s) => s.status !== "Settled").length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 p-5 sm:p-6 shadow-sm space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-emerald-100/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                <Store className="h-3.5 w-3.5 text-emerald-700" />
                <span>Daily UPI Settlement Batch</span>
              </span>
              <span className="text-xs text-emerald-700 font-medium">
                • Automated 9:00 PM Payout Portal
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
              <span>Canteen End-of-Day Settlements</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              Multi-canteen daily financial clearing: Gross food sales, 18% commission deduction, 5% statutory GST, and automated 9:00 PM batch payouts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                void loadData(e.target.value);
              }}
              className="h-9 rounded-xl border border-emerald-200 bg-white px-3 text-xs font-semibold text-stone-800 shadow-xs focus:border-emerald-500 focus:outline-none"
            />

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 shadow-xs hover:bg-stone-50 active:scale-95 transition-all cursor-pointer select-none"
            >
              <Download size={13} className="text-stone-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => void loadData()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-xs hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer select-none"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>

            {/* Bulk Batch Action */}
            <button
              type="button"
              onClick={handleOpenBulkModal}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2 text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Wallet size={14} />
              <span>Mark 9:00 PM Batch as Paid ({pendingCount} Pending)</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Daily Fulfilled Orders */}
          <div className="rounded-xl border border-stone-200 bg-white/90 p-4 shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Batch Orders
            </span>
            <p className="text-2xl font-black text-stone-900">
              {totalOrders} <span className="text-xs font-normal text-stone-500">orders</span>
            </p>
            <p className="text-xs text-stone-500">
              Across {settlements.length} active canteens
            </p>
          </div>

          {/* Gross Food Sales */}
          <div className="rounded-xl border border-blue-200/80 bg-white/90 p-4 shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Gross Food Sales
            </span>
            <p className="text-2xl font-black text-blue-800 flex items-center">
              <IndianRupee size={20} className="text-blue-600" />
              <span>{totalGross.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
            <p className="text-xs text-blue-700">
              Kitchen item sales (excl. fees)
            </p>
          </div>

          {/* Platform 18% Commission */}
          <div className="rounded-xl border border-purple-200/80 bg-white/90 p-4 shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1">
              <Percent size={13} /> Platform 18% Cut
            </span>
            <p className="text-2xl font-black text-purple-800 flex items-center">
              <IndianRupee size={20} className="text-purple-600" />
              <span>{totalCommission.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
            <p className="text-xs text-purple-700">
              18% standard take-rate
            </p>
          </div>

          {/* Total Net Batch Payable */}
          <div className="rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 p-4 shadow-xs space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-700" /> Net Transfer Amount
            </span>
            <p className="text-2xl font-black text-emerald-800 flex items-center">
              <IndianRupee size={20} className="text-emerald-600" />
              <span>{totalNetPayable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
            <p className="text-xs font-bold text-emerald-700">
              Disbursed at 9:00 PM daily
            </p>
          </div>
        </div>

        {/* Canteen Daily Settlement Sheet Table */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm sm:text-base font-extrabold text-stone-900 flex items-center gap-2">
              <span>Canteen Daily Settlement Sheet</span>
              <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[11px] font-bold text-stone-700">
                {filtered.length} Canteens
              </span>
            </h3>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search canteen, UPI ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-100 bg-stone-50/80 font-bold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Canteen Name</th>
                  <th className="px-4 py-3">Bank A/C & IFSC / UPI ID</th>
                  <th className="px-4 py-3 text-center">Orders Count</th>
                  <th className="px-4 py-3 text-right">Gross Food Sales</th>
                  <th className="px-4 py-3 text-right">Platform 18% Cut</th>
                  <th className="px-4 py-3 text-right">Net Transfer Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-stone-400">
                      No canteen records found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const isSettled = item.status === "Settled";
                    const gst = item.gst_amount ?? (item.gross_food_sales * 0.05);

                    return (
                      <tr
                        key={item.restaurant_email}
                        className="hover:bg-emerald-50/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-stone-900">
                          <div className="flex items-center gap-1.5">
                            <Store size={14} className="text-orange-600 shrink-0" />
                            <span>{item.restaurant_name}</span>
                          </div>
                          <div className="text-[11px] font-normal text-stone-500">
                            {item.restaurant_email}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-[11px] text-stone-700">
                          <span className="bg-stone-100 border border-stone-200 px-2 py-0.5 rounded block truncate max-w-[170px]" title={item.upi_id}>
                            {item.upi_id}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center font-bold text-stone-800">
                          {item.orders_count}
                        </td>

                        <td className="px-4 py-3 text-right font-semibold text-stone-900">
                          ₹{item.gross_food_sales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td className="px-4 py-3 text-right font-medium text-purple-700">
                          -₹{item.commission_deducted.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td className="px-4 py-3 text-right font-black text-emerald-800">
                          ₹{item.net_payable_subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {isSettled ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                <CheckCircle2 size={11} />
                                <span>Settled</span>
                              </span>
                              {item.transaction_ref && (
                                <div className="text-[10px] font-mono text-stone-400 truncate max-w-[130px] mx-auto">
                                  {item.transaction_ref}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                              <Clock size={11} />
                              <span>Pending 9 PM</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1-tap WhatsApp Share */}
                            <a
                              href={getWhatsAppShareUrl(item)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all"
                              title="Share Settlement Summary on WhatsApp"
                            >
                              <MessageCircle size={12} className="text-emerald-600" />
                              <span>WhatsApp</span>
                            </a>

                            <button
                              type="button"
                              disabled={isSettled}
                              onClick={() => handleOpenIndividualModal(item)}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold shadow-xs active:scale-95 transition-all select-none cursor-pointer ${
                                isSettled
                                  ? "bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              }`}
                            >
                              <Send size={11} />
                              <span>{isSettled ? "Paid" : "Mark Paid"}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Individual Settle Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Store size={18} className="text-orange-600" />
                <span>Confirm Daily UPI Settlement</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-stone-700">
              <div className="rounded-xl bg-stone-50 p-3.5 space-y-1.5 border border-stone-200">
                <div className="flex justify-between">
                  <span className="text-stone-500">Canteen:</span>
                  <span className="font-bold text-stone-900">{activeModalItem.restaurant_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Recipient UPI ID:</span>
                  <span className="font-mono font-bold text-emerald-700">{activeModalItem.upi_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Fulfilled Orders:</span>
                  <span className="font-semibold text-stone-800">{activeModalItem.orders_count} orders</span>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-1.5">
                  <span className="font-bold text-stone-900">Net Transfer Amount:</span>
                  <span className="text-base font-black text-emerald-700">
                    ₹{activeModalItem.net_payable_subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">
                  Bank / UPI Transaction Reference:
                </label>
                <input
                  type="text"
                  value={customTxnRef}
                  onChange={(e) => setCustomTxnRef(e.target.value)}
                  placeholder="e.g. UPI/20261003/981273"
                  className="w-full h-10 rounded-xl border border-stone-200 px-3 font-mono text-xs text-stone-900 focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-stone-500">
                  Recorded in audit logs for accounting and financial reconciliation.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setActiveModalItem(null)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !customTxnRef.trim()}
                onClick={() => void handleConfirmIndividualSettlement()}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-5 py-2 text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Recording..." : "Confirm & Mark Paid"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk 9:00 PM Batch Settlement Modal */}
      {isBulkBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Wallet size={18} className="text-emerald-600" />
                <span>Mark 9:00 PM Batch as Paid</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkBatchModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-stone-700">
              <div className="rounded-xl bg-emerald-50/80 p-3.5 space-y-1.5 border border-emerald-200">
                <div className="flex justify-between">
                  <span className="text-emerald-900">Settlement Date:</span>
                  <span className="font-bold text-emerald-950">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-900">Pending Canteens:</span>
                  <span className="font-bold text-emerald-950">{pendingCount} canteens</span>
                </div>
                <div className="flex justify-between border-t border-emerald-200 pt-1.5">
                  <span className="font-bold text-emerald-900">Total Batch Net Payout:</span>
                  <span className="text-base font-black text-emerald-800">
                    ₹{totalNetPayable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">
                  Batch Bank UTR / Reference Number:
                </label>
                <input
                  type="text"
                  value={bulkBatchRef}
                  onChange={(e) => setBulkBatchRef(e.target.value)}
                  placeholder="e.g. BATCH/9PM/20261006/891234"
                  className="w-full h-10 rounded-xl border border-stone-200 px-3 font-mono text-xs text-stone-900 focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-stone-500">
                  This UTR will be recorded across all pending canteen settlements for this date.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                disabled={isSubmittingBulk}
                onClick={() => setIsBulkBatchModalOpen(false)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingBulk || !bulkBatchRef.trim()}
                onClick={() => void handleConfirmBulkPayout()}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-5 py-2 text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmittingBulk ? "Processing Batch..." : "Confirm Batch Payout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSettlementsTable;
