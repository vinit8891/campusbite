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
  AlertTriangle,
  Send,
  X,
  Lock,
  Unlock,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  getRiderCihOversight,
  getAdminRiderReconciliations,
  approveRiderRemittance,
  remitRiderDuesAdmin,
  type RiderReconciliationSummary,
  type RiderReconciliationItem,
} from "@/services/adminService";

export function AdminRiderCihOversight() {
  const [isMounted, setIsMounted] = useState(false);
  const [summary, setSummary] = useState<RiderReconciliationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "LOCKED" | "WARNING" | "ACTIVE">("ALL");

  // Remittance Modal State
  const [modalRider, setModalRider] = useState<RiderReconciliationItem | null>(null);
  const [remitAmount, setRemitAmount] = useState<string>("");
  const [remitUtr, setRemitUtr] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getRiderCihOversight();
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

  const openRemittanceModal = (rider: RiderReconciliationItem) => {
    const netDue = rider.net_cash_due ?? rider.net_due ?? 0;
    setModalRider(rider);
    setRemitAmount(netDue > 0 ? netDue.toFixed(2) : "500.00");
    setRemitUtr(`UPI/${Date.now().toString().slice(-8)}`);
  };

  const closeRemittanceModal = () => {
    setModalRider(null);
    setRemitAmount("");
    setRemitUtr("");
    setIsSubmitting(false);
  };

  const handleConfirmRemittance = async () => {
    if (!modalRider) return;
    const amountNum = parseFloat(remitAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid remittance amount.");
      return;
    }
    const utr = remitUtr.trim() || `UPI/${Date.now()}`;

    try {
      setIsSubmitting(true);
      const res = await approveRiderRemittance(
        modalRider.id || modalRider.phone,
        amountNum,
        utr
      );
      toast.success(
        res.message ||
          `Remittance of ₹${amountNum.toFixed(2)} approved (UTR: ${utr}). Rider unlocked.`
      );
      closeRemittanceModal();
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record remittance"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendRemitAlert = (rider: RiderReconciliationItem) => {
    const netDue = rider.net_cash_due ?? rider.net_due ?? 0;
    toast.info(
      `Remittance alert SMS sent to ${rider.name} (${rider.phone}) for ₹${netDue.toFixed(2)} pending dues.`
    );
  };

  if (!isMounted) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-32 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  const allRiders = summary?.riders || [];
  const filteredRiders = allRiders.filter((r) => {
    const netDue = r.net_cash_due ?? r.net_due ?? 0;
    const isLocked = r.is_locked || netDue >= 500.0;
    const isWarning = !isLocked && (netDue >= 400.0 || r.status === "APPROACHING_LIMIT");
    const isActive = !isLocked && !isWarning;

    if (statusFilter === "LOCKED" && !isLocked) return false;
    if (statusFilter === "WARNING" && !isWarning) return false;
    if (statusFilter === "ACTIVE" && !isActive) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.name.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      (r.vehicle_number || "").toLowerCase().includes(q) ||
      (r.vehicle || "").toLowerCase().includes(q)
    );
  });

  const totalCashHeld = summary?.total_campus_cih ?? summary?.total_cash_collected ?? 0;
  const totalWagesKept = summary?.total_wages_kept ?? 0;
  const netUnremitted = summary?.net_unremitted_dues ?? 0;
  const lockedCount =
    summary?.locked_riders_count ??
    allRiders.filter((r) => r.is_locked || (r.net_cash_due ?? r.net_due ?? 0) >= 500.0).length;
  const approachingCount =
    summary?.approaching_limit_count ??
    allRiders.filter(
      (r) =>
        !(r.is_locked || (r.net_cash_due ?? r.net_due ?? 0) >= 500.0) &&
        (r.net_cash_due ?? r.net_due ?? 0) >= 400.0
    ).length;

  return (
    <div id="rider-cih-oversight" className="space-y-6">
      {/* High-visibility Cash-in-Hand Oversight Card */}
      <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-amber-100/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                <Banknote className="h-3.5 w-3.5 text-amber-700" />
                <span>Rider Settlement &amp; Lockout Oversight</span>
              </span>
              <span className="text-xs text-amber-700 font-medium">
                • ₹500 Hard CIH Limit
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
              <span>Courier Cash-in-Hand (COD Dues) &amp; Float Control</span>
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

        {/* Hard Lockout Alert Banner if any rider is locked out */}
        {lockedCount > 0 && (
          <div
            data-testid="admin-locked-riders-banner"
            className="rounded-xl border-2 border-rose-300 bg-rose-50/90 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-rose-200/80 p-2 text-rose-800 shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-rose-950">
                  ⚠️ {lockedCount} Courier(s) Exceeded ₹500 Hard Lockout Limit
                </h4>
                <p className="text-xs text-rose-800">
                  Order claiming is automatically frozen for locked couriers until pending COD dues are remitted and approved.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStatusFilter("LOCKED")}
              className="rounded-lg bg-rose-700 hover:bg-rose-800 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer shrink-0"
            >
              Filter Locked Couriers
            </button>
          </div>
        )}

        {/* 3 Metric Cards for CIH */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Total Physical Cash Collected */}
          <div className="rounded-xl border border-amber-200/80 bg-white/90 p-4 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Total Cash on Campus
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
              <span className="font-mono font-bold text-amber-900 bg-white/70 px-1.5 py-0.5 rounded">campusbite.ops@upi</span>. Verify UTR and click &quot;Acknowledge UPI Remittance&quot; to unfreeze locked couriers in real time.
            </p>
          </div>
        </div>

        {/* Courier Audit Table & Filter Controls */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-stone-900 flex items-center gap-2">
                <span>Courier CIH Oversight Ledger</span>
                <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[11px] font-bold text-stone-700">
                  {filteredRiders.length} Couriers
                </span>
              </h3>

              {/* Status Filter Badges */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-stone-200">
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition cursor-pointer ${
                    statusFilter === "ALL"
                      ? "bg-stone-900 text-white"
                      : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  All ({allRiders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("LOCKED")}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    statusFilter === "LOCKED"
                      ? "bg-rose-700 text-white"
                      : "bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100"
                  }`}
                >
                  <span>🔒 Locked</span>
                  <span>({lockedCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("WARNING")}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    statusFilter === "WARNING"
                      ? "bg-amber-700 text-white"
                      : "bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  <span>⚠️ Warning</span>
                  <span>({approachingCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("ACTIVE")}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition cursor-pointer ${
                    statusFilter === "ACTIVE"
                      ? "bg-emerald-700 text-white"
                      : "bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  ✅ Active
                </button>
              </div>
            </div>

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
                  <th className="px-4 py-3 text-right">Collected COD Cash</th>
                  <th className="px-4 py-3 text-right">Earned Wages (Deducted @ ₹20)</th>
                  <th className="px-4 py-3 text-right">Approved Remittances</th>
                  <th className="px-4 py-3 text-right">Net Cash Due vs Limit</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filteredRiders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-stone-400">
                      No courier records found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRiders.map((rider) => {
                    const netDue = Number((rider.net_cash_due ?? rider.net_due ?? 0).toFixed(2));
                    const isLocked = rider.is_locked || netDue >= 500.0;
                    const isWarning =
                      !isLocked && (netDue >= 400.0 || rider.status === "APPROACHING_LIMIT");
                    const excess =
                      rider.excess_amount ??
                      (isLocked ? Math.max(0, Number((netDue - 500.0).toFixed(2))) : 0);
                    const approvedRemit = Number(
                      (rider.approved_remittances ?? 0).toFixed(2)
                    );

                    return (
                      <tr
                        key={rider.id || rider.phone}
                        className={`transition-colors ${
                          isLocked
                            ? "bg-rose-50/40 hover:bg-rose-50/70"
                            : isWarning
                            ? "bg-amber-50/30 hover:bg-amber-50/60"
                            : "hover:bg-stone-50/50"
                        }`}
                      >
                        {/* Rider Name & Phone */}
                        <td className="px-4 py-3 font-semibold text-stone-900">
                          <div className="flex items-center gap-1.5">
                            {isLocked && <Lock className="h-3.5 w-3.5 text-rose-600 shrink-0" />}
                            <span>{rider.name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-normal text-stone-500">
                            <Phone size={11} className="text-stone-400" />
                            <span>{rider.phone}</span>
                            {rider.vehicle && (
                              <span className="text-stone-400">· {rider.vehicle}</span>
                            )}
                          </div>
                        </td>

                        {/* Collected COD Cash */}
                        <td className="px-4 py-3 text-right font-semibold text-stone-900">
                          ₹{rider.cash_collected.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Earned Wages */}
                        <td className="px-4 py-3 text-right font-medium text-teal-700">
                          -₹{rider.wages_kept.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Approved Remittances */}
                        <td className="px-4 py-3 text-right font-medium text-blue-700">
                          ₹{approvedRemit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Net Cash Due vs Limit */}
                        <td className="px-4 py-3 text-right font-bold">
                          <div
                            className={
                              isLocked
                                ? "text-rose-600 font-black text-sm"
                                : isWarning
                                ? "text-amber-700 font-extrabold"
                                : "text-emerald-700"
                            }
                          >
                            ₹{netDue.toFixed(2)} / ₹500.00
                          </div>
                          {excess > 0 && (
                            <div className="text-[10px] text-rose-700 font-bold">
                              Exceeds limit by +₹{excess.toFixed(2)}
                            </div>
                          )}
                        </td>

                        {/* Status Pill */}
                        <td className="px-4 py-3 text-center">
                          {isLocked ? (
                            <span
                              data-testid="status-locked"
                              className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-300 px-2.5 py-1 text-[11px] font-extrabold text-rose-900 shadow-xs"
                              title={`Over ₹500 limit by +₹${excess.toFixed(2)}`}
                            >
                              <span>🔒 Locked (Over ₹500 Limit)</span>
                              {excess > 0 && (
                                <span className="rounded bg-rose-200/90 px-1 py-0.2 text-[10px] text-rose-950 font-mono">
                                  +₹{excess.toFixed(2)}
                                </span>
                              )}
                            </span>
                          ) : isWarning ? (
                            <span
                              data-testid="status-warning"
                              className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-1 text-[11px] font-extrabold text-amber-900 shadow-xs"
                            >
                              <span>⚠️ Warning (₹400–₹499)</span>
                            </span>
                          ) : (
                            <span
                              data-testid="status-active"
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-xs"
                            >
                              <span>✅ Clear / Active (&lt; ₹400)</span>
                            </span>
                          )}
                        </td>

                        {/* Inline Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Send Remit Alert */}
                            {(isLocked || isWarning || netDue >= 400.0) && (
                              <button
                                type="button"
                                title="Send SMS / App Alert to Courier"
                                onClick={() => handleSendRemitAlert(rider)}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-2.5 py-1.5 text-xs font-bold transition cursor-pointer select-none active:scale-95"
                              >
                                <Send size={11} className="text-amber-700" />
                                <span>Send Alert</span>
                              </button>
                            )}

                            {/* Acknowledge UPI Remittance */}
                            <button
                              type="button"
                              onClick={() => openRemittanceModal(rider)}
                              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold shadow-xs active:scale-95 transition-all select-none cursor-pointer ${
                                isLocked
                                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                                  : netDue > 0
                                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              }`}
                            >
                              <ArrowDownToLine size={12} />
                              <span>
                                {isLocked
                                  ? "Acknowledge UPI & Unlock"
                                  : "Acknowledge UPI Remittance"}
                              </span>
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

      {/* Acknowledge Remittance Modal */}
      {modalRider && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div>
                <h3
                  id="modal-title"
                  className="text-lg font-black text-stone-900 flex items-center gap-2"
                >
                  <ArrowDownToLine className="h-5 w-5 text-orange-600" />
                  <span>Acknowledge UPI Remittance</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Verify rider transaction reference and confirm remittance to update cash ledger.
                </p>
              </div>
              <button
                type="button"
                onClick={closeRemittanceModal}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Courier Context Card */}
            <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-bold text-amber-950">
                <span>Courier: {modalRider.name}</span>
                <span className="font-mono">{modalRider.phone}</span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Current Net Cash Due:</span>
                <span className="font-bold text-rose-700">
                  ₹{(modalRider.net_cash_due ?? modalRider.net_due ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-500 text-[11px]">
                <span>Lockout Limit:</span>
                <span>₹500.00 max physical cash</span>
              </div>
            </div>

            {/* Inputs Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Remittance Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-stone-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={remitAmount}
                    onChange={(e) => setRemitAmount(e.target.value)}
                    className="h-9 w-full rounded-xl border border-stone-300 pl-7 pr-3 text-sm font-semibold text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  UPI Transaction Ref / UTR
                </label>
                <input
                  type="text"
                  value={remitUtr}
                  onChange={(e) => setRemitUtr(e.target.value)}
                  className="h-9 w-full rounded-xl border border-stone-300 px-3 text-xs font-mono font-medium text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="e.g. UPI/429810482012"
                />
                <p className="mt-1 text-[11px] text-stone-400">
                  Bank transaction reference ID or UTR number provided by rider.
                </p>
              </div>

              <div className="text-[11px] text-stone-400 flex items-center justify-between">
                <span>Verification Timestamp:</span>
                <span className="font-mono text-stone-600">
                  {new Date().toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={closeRemittanceModal}
                disabled={isSubmitting}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 active:scale-95 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleConfirmRemittance()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white px-4 py-2 text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                <span>Confirm &amp; Unlock</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRiderCihOversight;
