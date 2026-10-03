"use client";

import React, { useState, useEffect } from "react";
import {
  Banknote,
  Bike,
  CheckCircle2,
  Clock,
  IndianRupee,
  RefreshCw,
  Search,
  ShieldAlert,
  Wallet,
  ArrowDownToLine,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminRiderReconciliations,
  remitRiderDuesAdmin,
  type RiderReconciliationSummary,
  type RiderReconciliationItem,
} from "@/services/adminService";

export function AdminRiderCihOversight() {
  const [isMounted, setIsMounted] = useState(false);
  const [summary, setSummary] = useState<RiderReconciliationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [remittingPhone, setRemittingPhone] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAdminRiderReconciliations();
      setSummary(data);
    } catch (err) {
      console.error("Failed to load rider reconciliation data:", err);
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
    window.addEventListener("delivery_state_changed", handleStateChange);

    return () => {
      window.removeEventListener("admin_settlement_changed", handleStateChange);
      window.removeEventListener("delivery_state_changed", handleStateChange);
    };
  }, [isMounted]);

  const handleAcknowledgeRemittance = async (rider: RiderReconciliationItem) => {
    try {
      setRemittingPhone(rider.phone);
      const res = await remitRiderDuesAdmin(rider.phone);
      toast.success(res.message || `Remittance acknowledged for ${rider.name}`);
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record remittance"
      );
    } finally {
      setRemittingPhone(null);
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

  const filteredRiders = (summary?.riders || []).filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.name.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      (r.vehicle_number || "").toLowerCase().includes(q) ||
      (r.vehicle || "").toLowerCase().includes(q)
    );
  });

  const totalCashHeld = summary?.total_cash_collected ?? 0;
  const totalWagesKept = summary?.total_wages_kept ?? 0;
  const netUnremitted = summary?.net_unremitted_dues ?? 0;

  return (
    <div className="space-y-6">
      {/* High-visibility Cash-in-Hand Oversight Card */}
      <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-amber-100/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                <Banknote className="h-3.5 w-3.5 text-amber-700" />
                <span>Rider Settlement Oversight</span>
              </span>
              <span className="text-xs text-amber-700 font-medium">
                • Campus Delivery Operations
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
              <span>Courier Cash-in-Hand (COD Dues)</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              Live reconciliation of physical Cash-on-Delivery collected at hostels vs. flat ₹20 fulfilled order wages kept by student couriers.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={loading}
              onClick={() => void loadData()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-50 active:scale-95 transition-all cursor-pointer select-none"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh Audit</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards for CIH */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Total Physical Cash Collected */}
          <div className="rounded-xl border border-amber-200/80 bg-white/90 p-4 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Total Cash Collected
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-800">
                <Banknote className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-950 flex items-center">
              <IndianRupee size={22} className="text-amber-700" />
              <span>{totalCashHeld.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
            <p className="text-xs text-stone-500">
              Physical cash collected from COD hostel deliveries
            </p>
          </div>

          {/* Courier Wages Kept (-₹20/order) */}
          <div className="rounded-xl border border-teal-200/80 bg-white/90 p-4 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-900">
                Courier Wages Kept
              </span>
              <div className="rounded-lg bg-teal-100 p-1.5 text-teal-800">
                <Bike className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-teal-800 flex items-center">
              <IndianRupee size={22} className="text-teal-600" />
              <span>{totalWagesKept.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
            <p className="text-xs text-teal-700 font-medium">
              Offset by riders at flat ₹20/order fulfilled + tips
            </p>
          </div>

          {/* Net Unremitted Dues Owed */}
          <div className="rounded-xl border-2 border-rose-300 bg-gradient-to-br from-rose-50/80 via-white to-rose-50/30 p-4 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-rose-900">
                Net Unremitted Dues Owed
              </span>
              <div className="rounded-lg bg-rose-100 p-1.5 text-rose-700">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-700 flex items-center">
              <IndianRupee size={22} className="text-rose-600" />
              <span>{netUnremitted.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
            <p className="text-xs font-bold text-rose-800">
              Owed to <span className="font-mono underline">campusbite.ops@upi</span>
            </p>
          </div>
        </div>

        {/* Remittance Info Ops Callout */}
        <div className="rounded-xl bg-amber-100/60 border border-amber-200/90 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-amber-800 shrink-0" />
            <p>
              <span className="font-bold text-amber-900">Remittance Protocol:</span> Couriers remit cash balances via UPI to{" "}
              <span className="font-mono font-bold text-amber-900 bg-white/70 px-1.5 py-0.5 rounded">campusbite.ops@upi</span> with note{" "}
              <span className="font-mono text-amber-800">CIH-&lt;phone&gt;</span>. Confirm and mark remittance below.
            </p>
          </div>
        </div>

        {/* Courier Audit Mini-Table */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm sm:text-base font-extrabold text-stone-900 flex items-center gap-2">
              <span>Courier Remittance Ledger</span>
              <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[11px] font-bold text-stone-700">
                {filteredRiders.length} Couriers
              </span>
            </h3>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search rider name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-100 bg-stone-50/80 font-bold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Rider Name &amp; Phone</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3 text-center">Orders Delivered</th>
                  <th className="px-4 py-3 text-right">Cash Collected</th>
                  <th className="px-4 py-3 text-right">Wages Kept (-₹20)</th>
                  <th className="px-4 py-3 text-right">Net Due</th>
                  <th className="px-4 py-3 text-center">Remittance Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filteredRiders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-stone-400">
                      No courier records found matching query.
                    </td>
                  </tr>
                ) : (
                  filteredRiders.map((rider) => {
                    const isPending = rider.net_due > 0;
                    const isProcessing = remittingPhone === rider.phone;

                    return (
                      <tr
                        key={rider.id}
                        className="hover:bg-amber-50/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-stone-900">
                          <div>{rider.name}</div>
                          <div className="flex items-center gap-1 text-[11px] font-normal text-stone-500">
                            <Phone size={11} className="text-stone-400" />
                            <span>{rider.phone}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-stone-600">
                          <div>{rider.vehicle}</div>
                          {rider.vehicle_number && (
                            <div className="text-[10px] font-mono text-stone-400">
                              {rider.vehicle_number}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center font-bold text-stone-800">
                          {rider.orders_delivered}
                        </td>

                        <td className="px-4 py-3 text-right font-semibold text-stone-900">
                          ₹{rider.cash_collected.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td className="px-4 py-3 text-right font-medium text-teal-700">
                          ₹{rider.wages_kept.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-stone-900">
                          <span
                            className={
                              isPending
                                ? "text-rose-600 font-black"
                                : "text-emerald-700"
                            }
                          >
                            ₹{rider.net_due.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                              <Clock size={11} />
                              <span>Pending (₹{rider.net_due})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                              <CheckCircle2 size={11} />
                              <span>Clear / Remitted</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={!isPending || isProcessing}
                            onClick={() => void handleAcknowledgeRemittance(rider)}
                            className="inline-flex items-center gap-1 rounded-lg bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed text-white px-3 py-1.5 text-xs font-bold shadow-xs active:scale-95 transition-all select-none cursor-pointer"
                          >
                            {isProcessing ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <ArrowDownToLine size={12} />
                            )}
                            <span>{isPending ? "Acknowledge" : "Cleared"}</span>
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
    </div>
  );
}

export default AdminRiderCihOversight;
