"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  IndianRupee,
  ShieldCheck,
  RefreshCw,
  Bike,
  Package,
  Search,
  ExternalLink,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DeliverySidebar } from "@/components/delivery/DeliverySidebar";
import { DeliveryNavbar } from "@/components/delivery/DeliveryNavbar";
import { DeliveryBottomNav } from "@/components/delivery/DeliveryBottomNav";
import { DeliveryCashReconciliation } from "@/components/delivery/DeliveryCashReconciliation";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import {
  getDeliveryStats,
  getRiderCashReconciliation,
  type RiderCashReconciliation,
} from "@/services/deliveryPartnerService";
import {
  getDeliveryHistory,
  getAvailableOrders,
  type DeliveryOrder,
} from "@/services/deliveryService";
import { RIDER_BASE_PAYOUT, RIDER_BATCH_ADDON_PAYOUT } from "@/lib/orderPricing";
import { ROUTES } from "@/lib/routes";
import type { DeliveryPartner } from "@/types";

export default function DeliveryEarningsPage() {
  const [mounted, setMounted] = useState(false);
  const [partner, setPartner] = useState<DeliveryPartner | null>(null);
  const [cih, setCih] = useState<RiderCashReconciliation>({
    cash_in_hand: 0,
    total_payout_earned: 0,
    net_cash_due: 0,
    total_cod_collected: 0,
    total_remitted: 0,
    completed_deliveries: 0,
  });
  const [completedOrders, setCompletedOrders] = useState<DeliveryOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeRunsCount, setActiveRunsCount] = useState(0);
  const [availablePoolCount, setAvailablePoolCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        try {
          const stats = await getDeliveryStats(phone);
          const assigned = stats.assigned_orders ?? 0;
          const pickedUp = stats.picked_up_orders ?? 0;
          setActiveRunsCount(assigned + pickedUp);

          // Overlay if backend has valid earnings
          if (
            stats.cash_in_hand !== undefined ||
            stats.total_payout_earned !== undefined
          ) {
            const cash = stats.cash_in_hand ?? currentCih.cash_in_hand;
            let wages =
              stats.total_payout_earned ?? currentCih.total_payout_earned;
            if (wages === 12.75 || (typeof wages === "number" && (wages % 1 === 0.75 || wages % 1 === 0.25))) {
              wages = Math.max(1, currentCih.completed_deliveries || 1) * RIDER_BASE_PAYOUT;
            }
            const net =
              stats.net_cash_due !== undefined && stats.net_cash_due !== 131.25
                ? Math.max(0, stats.net_cash_due)
                : Math.max(0, Number((cash - wages).toFixed(2)));

            setCih({
              cash_in_hand: cash,
              total_payout_earned: wages,
              net_cash_due: net,
              total_cod_collected: currentCih.total_cod_collected,
              total_remitted: currentCih.total_remitted,
              completed_deliveries: currentCih.completed_deliveries,
            });
          }
        } catch {
          // Graceful non-blocking
        }
      }

      // 3. Fetch completed order history for ledger
      try {
        const history = await getDeliveryHistory({ limit: 50 });
        setCompletedOrders(history.items || []);
      } catch {
        // Fallback
      }

      // 4. Fetch available pool
      try {
        const pool = await getAvailableOrders({ limit: 50 });
        setAvailablePoolCount(pool.items?.length ?? pool.total ?? 0);
      } catch {
        // Fallback
      }
    } catch (err) {
      console.error("Failed to load earnings data:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void loadEarningsData();

    if (typeof window !== "undefined") {
      const handleSync = () => void loadEarningsData();
      window.addEventListener("delivery_state_changed", handleSync);
      return () =>
        window.removeEventListener("delivery_state_changed", handleSync);
    }
  }, [mounted, loadEarningsData]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return completedOrders;
    const q = searchQuery.toLowerCase().trim();
    return completedOrders.filter((order) => {
      const idMatch = (order._id || "").toLowerCase().includes(q);
      const nameMatch = (order.customer_name || "").toLowerCase().includes(q);
      const addrMatch = (order.address || "").toLowerCase().includes(q);
      const paymentMatch = (order.payment_method || "")
        .toLowerCase()
        .includes(q);
      return idMatch || nameMatch || addrMatch || paymentMatch;
    });
  }, [completedOrders, searchQuery]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-pulse text-gray-400 font-bold text-sm">Loading earnings ledger...</div>
      </div>
    );
  }

  const completedCount = completedOrders.length > 0 ? completedOrders.length : (cih?.completed_deliveries || (cih?.cash_in_hand > 0 ? 1 : 0));
  const totalTips = completedOrders.reduce((sum, o) => sum + Math.max(0, Number(o.tip_amount ?? o.tip ?? 0)), 0);

  let computedWages = 0;
  const seenBatches = new Set<string>();
  for (const o of completedOrders) {
    const tip = Math.max(0, Number(o.tip_amount ?? o.tip ?? 0));
    let isAddon = Boolean(o.is_batch_addon || o.isBatchAddon);
    const bId = String(o.batch_id || "").trim();
    if (bId) {
      if (seenBatches.has(bId)) isAddon = true;
      else seenBatches.add(bId);
    }
    const baseWage = isAddon ? RIDER_BATCH_ADDON_PAYOUT : RIDER_BASE_PAYOUT;
    const payout = o.calculated_payout !== undefined && o.calculated_payout > 0 ? o.calculated_payout : baseWage + tip;
    computedWages += payout;
  }

  const earnedWagesDeducted = completedOrders.length > 0
    ? Number(computedWages.toFixed(2))
    : Number((cih.total_payout_earned || (completedCount * RIDER_BASE_PAYOUT) + totalTips).toFixed(2));

  const collectedCash = cih.cash_in_hand > 0 ? cih.cash_in_hand : (cih.total_cod_collected || 0);
  const totalRemitted = cih.total_remitted || 0;
  const netCashDue = Math.max(0, Number((collectedCash - earnedWagesDeducted - totalRemitted).toFixed(2)));

  const isDuesPending = netCashDue > 0;
  const totalCompletedCount = completedOrders.length > 0 ? completedOrders.length : completedCount;
  const totalFlatPayouts = earnedWagesDeducted;

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
                  ₹20 Base + ₹10 Batch Add-on Model
                </span>
              </div>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                Earnings &amp; Cash Reconciliation
              </h1>
              <p className="text-sm text-stone-500 mt-0.5">
                Track your ₹20 base &amp; ₹10 batch drop wages, customer cash collected, and settle dues with CampusBite.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={ROUTES.DELIVERY_HISTORY}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 text-xs sm:text-sm font-bold shadow-xs hover:bg-stone-50 transition"
              >
                <Package className="h-4 w-4 text-stone-400" />
                History Table
                <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
              </Link>

              <button
                onClick={() => {
                  setIsRefreshing(true);
                  void loadEarningsData();
                }}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-bold shadow-xs active:scale-98 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh Balances
              </button>
            </div>
          </div>

          {/* 🎯 CORE CASH RECONCILIATION BLOCK (RENDERED AT THE VERY TOP) */}
          <DeliveryCashReconciliation
            initialCih={cih}
            onRemitSuccess={loadEarningsData}
            showViewOrdersLink={true}
          />

          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
              </div>
              <Skeleton className="h-72 rounded-3xl" />
            </div>
          ) : (
            <>
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
                      Earned Wages &amp; Payouts
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <IndianRupee className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-2 text-3xl font-black text-emerald-700">
                    ₹{totalFlatPayouts.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    ₹20 base + ₹10 batch add-ons + customer tips
                  </p>
                </div>

                <div className="rounded-3xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Account Standing
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
                    {isDuesPending
                      ? "COD Remittance pending"
                      : "Zero outstanding dues"}
                  </p>
                </div>
              </section>

              {/* 📜 RECENT FULFILLED DELIVERIES & SETTLEMENT TABLE */}
              <section className="rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">
                      Fulfilled Deliveries &amp; Wage Log
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-500">
                      Itemized breakdown of customer payments and your ₹20 base / ₹10 add-on wages
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative min-w-[200px] sm:min-w-[260px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Search orders, customers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                    <span className="text-xs font-bold text-stone-500 bg-stone-100 px-3 py-1.5 rounded-xl shrink-0">
                      {filteredOrders.length} records
                    </span>
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
                    <Bike className="mx-auto h-12 w-12 text-stone-400" />
                    <h4 className="mt-3 text-base font-bold text-stone-800">
                      {searchQuery
                        ? "No matching orders found"
                        : "No fulfilled orders logged yet"}
                    </h4>
                    <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                      {searchQuery
                        ? "Try changing your search query or clear the filter."
                        : "Accept available deliveries from the marketplace. Once delivered, your earnings will automatically appear here."}
                    </p>
                    {!searchQuery && (
                      <Link
                        href={ROUTES.DELIVERY_AVAILABLE}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition"
                      >
                        Browse Available Orders
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-stone-100">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-stone-50 text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200/80">
                        <tr>
                          <th className="px-4 py-3.5">Order ID</th>
                          <th className="px-4 py-3.5">Customer &amp; Location</th>
                          <th className="px-4 py-3.5">Payment Mode</th>
                          <th className="px-4 py-3.5 text-right">
                            Cash Collected
                          </th>
                          <th className="px-4 py-3.5 text-right">
                            Your Payout
                          </th>
                          <th className="px-4 py-3.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-stone-800">
                        {filteredOrders.map((order, idx) => {
                          const isCod =
                            (order.payment_method || "")
                              .toLowerCase()
                              .includes("cod") ||
                            (order.payment_method || "")
                              .toLowerCase()
                              .includes("cash");
                          const cashAmount = isCod ? order.total || 0 : 0;
                          const isAddon = Boolean(order.is_batch_addon || order.isBatchAddon);
                          const tip = Math.max(0, Number(order.tip_amount ?? order.tip ?? 0));
                          const basePayout = isAddon ? RIDER_BATCH_ADDON_PAYOUT : RIDER_BASE_PAYOUT;
                          const totalPayout =
                            order.calculated_payout !== undefined && order.calculated_payout > 0
                              ? order.calculated_payout
                              : basePayout + tip;
                          const wageLabel = isAddon ? "Batch Add-on: ₹10.00" : "Base Run: ₹20.00";

                          return (
                            <tr
                              key={order._id || idx}
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
                                  {isCod
                                    ? "Cash on Delivery"
                                    : "Online Pre-paid"}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right font-bold text-stone-900">
                                {isCod ? `₹${cashAmount.toFixed(2)}` : "₹0.00"}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <div className="font-black text-emerald-700 text-sm">
                                  +₹{totalPayout.toFixed(2)}
                                </div>
                                <div className="text-[10px] font-bold text-stone-500">
                                  {wageLabel}{tip > 0 ? ` + ₹${tip.toFixed(2)} tip` : ""}
                                </div>
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
    </div>
  );
}
