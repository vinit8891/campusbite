"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Banknote,
  Bike,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  IndianRupee,
  MessageCircle,
  Percent,
  RefreshCw,
  Search,
  ShieldAlert,
  Wallet,
  X,
  Lock,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import { formatINR } from "@/lib/formatters";
import {
  fetchCanteenSettlements,
  fetchCourierSettlements,
  markCanteenSettlementPaidAdmin,
  acknowledgeCourierRemittanceAdmin,
  type CanteenSettlementItem,
  type CourierSettlementItem,
  type SettlementsCanteensResponse,
  type SettlementsCouriersResponse,
} from "@/services/adminService";

export default function AdminPayoutsPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [activeTab, setActiveTab] = useState<"canteens" | "couriers">("canteens");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data states
  const [canteenData, setCanteenData] = useState<SettlementsCanteensResponse | null>(null);
  const [courierData, setCourierData] = useState<SettlementsCouriersResponse | null>(null);

  // Search & filter states
  const [canteenSearch, setCanteenSearch] = useState("");
  const [courierSearch, setCourierSearch] = useState("");
  const [courierStatusFilter, setCourierStatusFilter] = useState<"ALL" | "LOCKED" | "WARNING" | "ACTIVE">("ALL");

  // Modal states for Canteen Pay
  const [selectedCanteenForPay, setSelectedCanteenForPay] = useState<CanteenSettlementItem | null>(null);
  const [canteenTxnRef, setCanteenTxnRef] = useState("");
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Modal states for Courier Remittance
  const [selectedCourierForRemit, setSelectedCourierForRemit] = useState<CourierSettlementItem | null>(null);
  const [remitAmount, setRemitAmount] = useState<string>("");
  const [remitUtr, setRemitUtr] = useState<string>("");
  const [isSubmittingRemit, setIsSubmittingRemit] = useState(false);

  const loadData = useCallback(async (dateStr: string) => {
    try {
      setLoading(true);
      const [canteensRes, couriersRes] = await Promise.all([
        fetchCanteenSettlements(dateStr),
        fetchCourierSettlements(dateStr),
      ]);
      setCanteenData(canteensRes);
      setCourierData(couriersRes);
    } catch (err) {
      console.error("Failed to load payout data:", err);
      toast.error("Failed to load payout data. Please try again.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData(selectedDate);
  }, [loadData, selectedDate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(selectedDate);
    toast.success("Financial payout data refreshed");
  };

  // Export CSV handler
  const handleExportCSV = () => {
    if (activeTab === "canteens") {
      if (!canteenData || canteenData.canteens.length === 0) {
        toast.error("No canteen records to export");
        return;
      }
      const headers = [
        "Canteen Name",
        "Email",
        "Phone",
        "UPI ID",
        "Orders Completed",
        "Gross Food Sales (Rs)",
        "Platform Commission 18% (Rs)",
        "GST 5% (Rs)",
        "Net Payable (Rs)",
        "Status",
        "Transaction Ref",
        "Settled At",
        "Date",
      ];
      const rows = canteenData.canteens.map((c) => [
        `"${c.restaurant_name}"`,
        `"${c.restaurant_email}"`,
        `"${c.phone || ""}"`,
        `"${c.upi_id}"`,
        c.orders_count,
        formatINR(c.gross_food_sales),
        formatINR(c.platform_commission),
        formatINR(c.gst_collected),
        formatINR(c.net_payout),
        c.status,
        `"${c.transaction_ref || ""}"`,
        `"${c.settled_at || ""}"`,
        c.settlement_date,
      ]);
      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `canteen_settlements_${selectedDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Canteen settlements CSV downloaded");
    } else {
      if (!courierData || courierData.couriers.length === 0) {
        toast.error("No courier records to export");
        return;
      }
      const headers = [
        "Courier Name",
        "Phone",
        "Email",
        "Vehicle",
        "Orders Completed",
        "COD Cash Collected (Rs)",
        "Wages Earned (Rs)",
        "Net Dues to Admin (Rs)",
        "Lockout Status",
        "Date",
      ];
      const rows = courierData.couriers.map((r) => [
        `"${r.name}"`,
        `"${r.phone}"`,
        `"${r.email || ""}"`,
        `"${r.vehicle || ""}"`,
        r.orders_completed,
        formatINR(r.cod_collected),
        formatINR(r.wages_earned),
        formatINR(r.net_cash_due_to_admin),
        r.status,
        r.settlement_date || selectedDate,
      ]);
      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `courier_cih_payouts_${selectedDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Courier CIH settlements CSV downloaded");
    }
  };

  // Canteen Action: Open Mark as Paid modal
  const handleOpenPayModal = (item: CanteenSettlementItem) => {
    setSelectedCanteenForPay(item);
    const dateFormatted = selectedDate.replace(/-/g, "");
    setCanteenTxnRef(`UPI/${dateFormatted}/${Math.floor(100000 + Math.random() * 900000)}`);
  };

  // Canteen Action: Confirm Mark as Paid
  const handleConfirmCanteenPay = async () => {
    if (!selectedCanteenForPay) return;
    try {
      setIsSubmittingPay(true);
      await markCanteenSettlementPaidAdmin(selectedCanteenForPay.id, {
        date: selectedDate,
        amount: selectedCanteenForPay.net_payout,
        transaction_ref: canteenTxnRef,
        upi_id: selectedCanteenForPay.upi_id,
        orders_count: selectedCanteenForPay.orders_count,
        restaurant_name: selectedCanteenForPay.restaurant_name,
        restaurant_email: selectedCanteenForPay.restaurant_email,
      });
      toast.success(`Marked ₹${formatINR(selectedCanteenForPay?.net_payout)} as Paid for ${selectedCanteenForPay.restaurant_name}`);
      setSelectedCanteenForPay(null);
      await loadData(selectedDate);
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark settlement as paid");
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // Canteen Action: WhatsApp message
  const handleSendWhatsApp = (item: CanteenSettlementItem) => {
    const cleanPhone = (item.phone || "").replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const text =
      `Hello *${item.restaurant_name}*,\n\n` +
      `CampusBite Daily Settlement Summary for *${selectedDate}*:\n` +
      `• Completed Orders: *${item.orders_count}*\n` +
      `• Gross Food Sales: *₹${formatINR(item?.gross_food_sales)}*\n` +
      `• 18% Platform Commission: *-₹${formatINR(item?.platform_commission)}*\n` +
      `• GST (5%): *+₹${formatINR(item?.gst_collected)}*\n` +
      `------------------------------------\n` +
      `• Net Amount: *₹${formatINR(item?.net_payout)}*\n` +
      `• Status: *${item.status.toUpperCase()}*\n` +
      `• Payout UPI ID: *${item.upi_id}*\n` +
      (item.transaction_ref ? `• UTR / Ref: *${item.transaction_ref}*\n` : "") +
      `\nFor any queries, please reach out to CampusBite Admin.`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Courier Action: Open Remittance modal
  const handleOpenRemitModal = (courier: CourierSettlementItem) => {
    setSelectedCourierForRemit(courier);
    setRemitAmount(formatINR(courier?.net_cash_due_to_admin));
    const dateFormatted = selectedDate.replace(/-/g, "");
    setRemitUtr(`CASH/${dateFormatted}/${Math.floor(1000 + Math.random() * 9000)}`);
  };

  // Courier Action: Confirm Remittance
  const handleConfirmCourierRemit = async () => {
    if (!selectedCourierForRemit) return;
    try {
      setIsSubmittingRemit(true);
      const parsedAmount = parseFloat(remitAmount) || 0;
      await acknowledgeCourierRemittanceAdmin(selectedCourierForRemit.id, {
        amount: parsedAmount,
        utr: remitUtr,
      });
      toast.success(`Remittance of ₹${formatINR(parsedAmount)} acknowledged for ${selectedCourierForRemit.name}`);
      setSelectedCourierForRemit(null);
      await loadData(selectedDate);
    } catch (err) {
      console.error(err);
      toast.error("Failed to acknowledge cash remittance");
    } finally {
      setIsSubmittingRemit(false);
    }
  };

  // KPI calculations
  const totalDailySales = canteenData?.summary?.total_food_sales ?? 0;
  const adminTakeRateCut = canteenData?.summary?.total_commission ?? 0;
  const pendingCanteenPayouts = canteenData?.summary?.pending_payout ?? 0;
  const courierCashInTransit = courierData?.summary?.net_cash_due_to_admin ?? 0;

  // Filtered lists
  const filteredCanteens = (canteenData?.canteens || []).filter((c) => {
    const q = canteenSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      c.restaurant_name.toLowerCase().includes(q) ||
      c.restaurant_email.toLowerCase().includes(q) ||
      c.upi_id.toLowerCase().includes(q)
    );
  });

  const filteredCouriers = (courierData?.couriers || []).filter((r) => {
    const q = courierSearch.toLowerCase().trim();
    const matchSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      (r.vehicle && r.vehicle.toLowerCase().includes(q));

    let matchStatus = true;
    if (courierStatusFilter === "LOCKED") matchStatus = r.is_locked || r.status === "LOCKED";
    else if (courierStatusFilter === "WARNING") matchStatus = r.status === "APPROACHING_LIMIT";
    else if (courierStatusFilter === "ACTIVE") matchStatus = r.status === "ACTIVE" && !r.is_locked;

    return matchSearch && matchStatus;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Header */}
      <AdminPageHeader
        title="Financial Payouts"
        description="Daily vendor settlements, platform take-rate commissions, and physical courier cash remittance oversight"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Picker Input */}
            <div className="relative flex items-center">
              <Calendar className="pointer-events-none absolute left-3 h-4 w-4 text-zinc-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-xs font-semibold text-zinc-800 shadow-xs outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                aria-label="Filter settlements by date"
              />
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 disabled:opacity-60 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-zinc-900 px-4 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-zinc-300" />
              <span>Export CSV</span>
            </button>
          </div>
        }
      />

      {/* KPI Metric Grid (4 Clean Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Daily Sales */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Total Daily Sales
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Building2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-zinc-900 font-mono">
              ₹{totalDailySales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-zinc-500">
            Gross food subtotal across canteens
          </p>
        </div>

        {/* Card 2: CampusBite 18% Cut */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              CampusBite 18% Cut
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Percent className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-600 font-mono">
              ₹{adminTakeRateCut.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-emerald-700/80">
            Platform take-rate commission
          </p>
        </div>

        {/* Card 3: Pending Canteen Payouts */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Pending Canteen Payouts
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Banknote className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-600 font-mono">
              ₹{pendingCanteenPayouts.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-zinc-500">
            Net payable owed to vendors
          </p>
        </div>

        {/* Card 4: Courier Cash in Transit */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Courier Cash in Transit
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
              <Wallet className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-orange-600 font-mono">
              ₹{courierCashInTransit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-zinc-500">
            Physical COD held by delivery riders
          </p>
        </div>
      </div>

      {/* Dual-Tab Navigation Switcher */}
      <div className="flex items-center gap-2 rounded-2xl bg-zinc-100/90 p-1.5 border border-zinc-200">
        <button
          type="button"
          onClick={() => setActiveTab("canteens")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "canteens"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50"
          }`}
        >
          <Building2 className="h-4 w-4 text-orange-500" />
          <span>Tab 1: Canteen Settlements</span>
          <span className="ml-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-700">
            {canteenData?.canteens?.length ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("couriers")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "couriers"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50"
          }`}
        >
          <Bike className="h-4 w-4 text-emerald-500" />
          <span>Tab 2: Courier Cash-in-Hand (CIH)</span>
          <span className="ml-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-700">
            {courierData?.couriers?.length ?? 0}
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <AdminTableSkeleton rows={4} columns={6} />
      ) : activeTab === "canteens" ? (
        /* TAB 1: CANTEEN SETTLEMENTS */
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          {/* Subheader / Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Canteen Daily Settlement Sheet
              </h2>
              <p className="text-xs text-zinc-500">
                Formula: Net Payable = Gross Food Sales - 18% Platform Commission + 5% GST
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search canteen or UPI..."
                value={canteenSearch}
                onChange={(e) => setCanteenSearch(e.target.value)}
                className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-9 pr-3 text-xs text-zinc-800 outline-hidden focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 text-[11px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3">Canteen Details</th>
                  <th className="px-4 py-3">Bank / UPI ID</th>
                  <th className="px-4 py-3 text-center">Completed Orders</th>
                  <th className="px-4 py-3 text-right">Gross Sales</th>
                  <th className="px-4 py-3 text-right">18% Cut</th>
                  <th className="px-4 py-3 text-right">Net Payable</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredCanteens.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-xs text-zinc-500">
                      No canteen settlements found for {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  filteredCanteens.map((c) => (
                    <tr key={c.id || c.restaurant_email} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-zinc-900">{c.restaurant_name}</div>
                        <div className="text-[11px] text-zinc-500">{c.restaurant_email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-zinc-700">
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 border border-zinc-200/80">
                          {c.upi_id || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 font-bold text-blue-700 border border-blue-200">
                          {c.orders_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-900">
                        ₹{formatINR(c?.gross_food_sales)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-red-600">
                        -₹{formatINR(c?.platform_commission)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 text-sm">
                        ₹{formatINR(c?.net_payout)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.status === "Paid" || c.status === "Settled" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Mark as Paid Action */}
                          {c.status === "Pending" ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPayModal(c)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Mark Paid</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[90px]" title={c.transaction_ref || ""}>
                              {c.transaction_ref ? c.transaction_ref.slice(-8) : "Settled"}
                            </span>
                          )}

                          {/* WhatsApp Notification Button */}
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(c)}
                            title="Send WhatsApp payout slip"
                            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors cursor-pointer"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 2: COURIER CASH-IN-HAND (CIH) */
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          {/* Subheader / Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Courier CIH Oversight & Remittance Ledger
              </h2>
              <p className="text-xs text-zinc-500">
                Hard Lockout triggered at ₹500.00 cash dues. Wages: ₹20 per completed delivery.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-48">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search courier..."
                  value={courierSearch}
                  onChange={(e) => setCourierSearch(e.target.value)}
                  className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-9 pr-3 text-xs text-zinc-800 outline-hidden focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Status pills */}
              <div className="flex rounded-xl bg-zinc-100 p-1 border border-zinc-200/60">
                {(["ALL", "LOCKED", "WARNING", "ACTIVE"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCourierStatusFilter(st)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                      courierStatusFilter === st
                        ? "bg-white text-zinc-900 shadow-xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {st === "WARNING" ? "Near Limit" : st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 text-[11px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3">Rider Details</th>
                  <th className="px-4 py-3 text-center">Orders Completed</th>
                  <th className="px-4 py-3 text-right">Cash Collected</th>
                  <th className="px-4 py-3 text-right">₹20 Wages Earned</th>
                  <th className="px-4 py-3 text-right">Net Dues to Admin</th>
                  <th className="px-4 py-3 text-center">Lockout Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredCouriers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-zinc-500">
                      No courier records found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCouriers.map((r) => (
                    <tr key={r.id || r.phone} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900">{r.name}</span>
                          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 border border-zinc-200">
                            {r.vehicle || "Bike"}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500">{r.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 font-bold text-blue-700 border border-blue-200">
                          {r.orders_completed}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-900">
                        ₹{formatINR(r?.cod_collected)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                        ₹{formatINR(r?.wages_earned)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-sm">
                        <span className={(r?.net_cash_due_to_admin ?? 0) >= 500 ? "text-red-600" : (r?.net_cash_due_to_admin ?? 0) >= 400 ? "text-amber-600" : "text-zinc-900"}>
                          ₹{formatINR(r?.net_cash_due_to_admin)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.is_locked || r.status === "LOCKED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-black text-red-700 border border-red-200 uppercase">
                            <Lock className="h-3 w-3" />
                            Locked (≥₹500)
                          </span>
                        ) : r.status === "APPROACHING_LIMIT" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 uppercase">
                            <ShieldAlert className="h-3 w-3" />
                            Warning (≥₹400)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 uppercase">
                            <Unlock className="h-3 w-3" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenRemitModal(r)}
                          className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
                        >
                          <Wallet className="h-3 w-3 text-amber-400" />
                          <span>Acknowledge Remittance</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Canteen Mark As Paid */}
      {selectedCanteenForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Mark Canteen Settlement Paid
                </h3>
                <p className="text-xs text-zinc-500">
                  {selectedCanteenForPay.restaurant_name} ({selectedDate})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCanteenForPay(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-zinc-50 p-3.5 space-y-2 border border-zinc-200/80 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Completed Orders:</span>
                <span className="font-bold text-zinc-900">{selectedCanteenForPay.orders_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Gross Food Sales:</span>
                <span className="font-mono text-zinc-900">₹{formatINR(selectedCanteenForPay.gross_food_sales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">18% CampusBite Cut:</span>
                <span className="font-mono text-red-600">-₹{formatINR(selectedCanteenForPay.platform_commission)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">GST (5%):</span>
                <span className="font-mono text-zinc-900">+₹{formatINR(selectedCanteenForPay.gst_collected)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-2 font-bold text-sm">
                <span className="text-zinc-900">Net Disbursed:</span>
                <span className="font-mono text-emerald-600">₹{formatINR(selectedCanteenForPay.net_payout)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-zinc-500">UPI ID:</span>
                <span className="font-mono text-xs font-semibold text-zinc-800">{selectedCanteenForPay.upi_id}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">
                Transaction Reference / UTR
              </label>
              <input
                type="text"
                value={canteenTxnRef}
                onChange={(e) => setCanteenTxnRef(e.target.value)}
                className="h-10 w-full rounded-xl border border-zinc-300 px-3 text-xs font-mono font-medium outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="UPI/20261012/123456"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCanteenForPay(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingPay}
                onClick={handleConfirmCanteenPay}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingPay ? "Confirming..." : "Confirm & Mark Paid"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Courier Remittance Handover */}
      {selectedCourierForRemit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Acknowledge Cash Remittance
                </h3>
                <p className="text-xs text-zinc-500">
                  Rider: {selectedCourierForRemit.name} ({selectedCourierForRemit.phone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCourierForRemit(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-zinc-50 p-3.5 space-y-2 border border-zinc-200/80 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Completed Orders:</span>
                <span className="font-bold text-zinc-900">{selectedCourierForRemit.orders_completed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">COD Cash Collected:</span>
                <span className="font-mono text-zinc-900">₹{formatINR(selectedCourierForRemit.cod_collected)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Earned Wages Kept:</span>
                <span className="font-mono text-emerald-600">-₹{formatINR(selectedCourierForRemit.wages_earned)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-2 font-bold text-sm">
                <span className="text-zinc-900">Net Due Owed to Admin:</span>
                <span className="font-mono text-red-600">₹{formatINR(selectedCourierForRemit.net_cash_due_to_admin)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700">
                  Physical Cash Amount Received (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={remitAmount}
                  onChange={(e) => setRemitAmount(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-300 px-3 text-xs font-mono font-medium outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="Enter amount handed over"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700">
                  Receipt / UTR Reference
                </label>
                <input
                  type="text"
                  value={remitUtr}
                  onChange={(e) => setRemitUtr(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-300 px-3 text-xs font-mono font-medium outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="CASH/20261012/1234"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCourierForRemit(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingRemit}
                onClick={handleConfirmCourierRemit}
                className="rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingRemit ? "Processing..." : "Acknowledge Cash Handover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
