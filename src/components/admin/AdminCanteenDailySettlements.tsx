"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  IndianRupee,
  Percent,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminCanteenDailyBreakdown,
  recordCanteenSettlementAdmin,
  type CanteenDailySettlement,
} from "@/services/adminService";

export function AdminCanteenDailySettlements() {
  const [isMounted, setIsMounted] = useState(false);
  const [settlements, setSettlements] = useState<CanteenDailySettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  
  // Modal state for settling
  const [activeModalItem, setActiveModalItem] = useState<CanteenDailySettlement | null>(null);
  const [customTxnRef, setCustomTxnRef] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleOpenSettlementModal = (item: CanteenDailySettlement) => {
    const defaultRef = `UPI/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}/${Math.floor(100000 + Math.random() * 900000)}`;
    setCustomTxnRef(defaultRef);
    setActiveModalItem(item);
  };

  const handleConfirmSettlement = async () => {
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
  const totalNetPayable = settlements.reduce((sum, s) => sum + s.net_payable_subtotal, 0);
  const totalOrders = settlements.reduce((sum, s) => sum + s.orders_count, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 p-5 sm:p-6 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-emerald-100/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                <Store className="h-3.5 w-3.5 text-emerald-700" />
                <span>Daily UPI Settlement Batch</span>
              </span>
              <span className="text-xs text-emerald-700 font-medium">
                • 9:00 PM Consolidated Batch
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
              <span>Canteen End-of-Day Settlements (9:00 PM Consolidated UPI)</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              Daily automated net food sales aggregation, platform commission deductions, and direct-to-bank UPI transfers for mess and canteen partners.
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
              disabled={loading}
              onClick={() => void loadData()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-xs hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer select-none"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh Sheet</span>
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
              Total kitchen sales processed
            </p>
          </div>

          {/* Platform Commission Deducted */}
          <div className="rounded-xl border border-purple-200/80 bg-white/90 p-4 shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1">
              <Percent size={13} /> Commission Deducted
            </span>
            <p className="text-2xl font-black text-purple-800 flex items-center">
              <IndianRupee size={20} className="text-purple-600" />
              <span>{totalCommission.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
            <p className="text-xs text-purple-700">
              18% standard platform commission
            </p>
          </div>

          {/* Total Net Batch Payable */}
          <div className="rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 p-4 shadow-xs space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-700" /> Total Net UPI Batch
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
                  <th className="px-4 py-3">Canteen / Restaurant</th>
                  <th className="px-4 py-3 text-center">Fulfilled Orders</th>
                  <th className="px-4 py-3 text-right">Gross Food Sales</th>
                  <th className="px-4 py-3 text-right">Commission Deducted</th>
                  <th className="px-4 py-3 text-right">Net Payable Subtotal</th>
                  <th className="px-4 py-3">Canteen UPI ID</th>
                  <th className="px-4 py-3 text-center">Batch Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
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

                        <td className="px-4 py-3 font-mono text-[11px] text-stone-700">
                          <span className="bg-stone-100 border border-stone-200 px-2 py-0.5 rounded">
                            {item.upi_id}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {isSettled ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                <CheckCircle2 size={11} />
                                <span>UPI Settled</span>
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
                          <button
                            type="button"
                            disabled={isSettled}
                            onClick={() => handleOpenSettlementModal(item)}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold shadow-xs active:scale-95 transition-all select-none cursor-pointer ${
                              isSettled
                                ? "bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200"
                                : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white"
                            }`}
                          >
                            <Send size={12} />
                            <span>{isSettled ? "Settled" : "Mark Settled"}</span>
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
      </div>

      {/* Settle Modal */}
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
                  <span className="font-bold text-stone-900">Net Payable Amount:</span>
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
                onClick={() => void handleConfirmSettlement()}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-5 py-2 text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Recording..." : "Confirm & Mark Paid"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCanteenDailySettlements;
