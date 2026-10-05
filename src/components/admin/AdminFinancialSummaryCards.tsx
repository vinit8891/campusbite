import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  PackageCheck,
  Percent,
  ChevronDown,
  ChevronUp,
  Store,
  Bike,
  Receipt,
  Info,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import type { AdminFinancialAnalytics, RiderReconciliationSummary } from "@/types";
import { getRiderCihOversight } from "@/services/adminService";

type AdminFinancialSummaryCardsProps = {
  analytics: AdminFinancialAnalytics | null;
  reconciliation?: RiderReconciliationSummary | null;
  totalCampusCih?: number;
  lockedRidersCount?: number;
  loading?: boolean;
  onViewLockedRiders?: () => void;
};

export function AdminFinancialSummaryCards({
  analytics,
  reconciliation,
  totalCampusCih,
  lockedRidersCount,
  loading = false,
  onViewLockedRiders,
}: AdminFinancialSummaryCardsProps) {
  const [showDistribution, setShowDistribution] = useState(true);
  const [reconData, setReconData] = useState<RiderReconciliationSummary | null>(
    reconciliation || null
  );

  useEffect(() => {
    if (reconciliation !== undefined) {
      setReconData(reconciliation);
      return;
    }
    let cancelled = false;
    const fetchRecon = async () => {
      try {
        const data = await getRiderCihOversight();
        if (!cancelled) setReconData(data);
      } catch (_) {}
    };
    void fetchRecon();

    const handleUpdate = () => {
      void fetchRecon();
    };
    window.addEventListener("admin_settlement_changed", handleUpdate);
    window.addEventListener("delivery_state_changed", handleUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("admin_settlement_changed", handleUpdate);
      window.removeEventListener("delivery_state_changed", handleUpdate);
    };
  }, [reconciliation]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="animate-pulse rounded-2xl border bg-white p-5 shadow-sm space-y-3"
            >
              <div className="h-4 w-28 rounded bg-gray-200" />
              <div className="h-8 w-36 rounded bg-gray-200" />
              <div className="h-3 w-44 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const earnings = analytics?.platform_earnings ?? 0;
  const gmv = analytics?.total_revenue ?? 0;
  const orders = analytics?.total_orders ?? 0;
  const aov = analytics?.average_order_value ?? 0;
  const restaurantNet = analytics?.restaurant_settlements ?? 0;
  const courierPayouts = analytics?.courier_payouts ?? 0;
  const gstPool = analytics?.gst_pool ?? 0;
  const smallOrderFeesTotal =
    analytics?.total_small_order_fees ??
    analytics?.small_order_fees_total ??
    0;
  const smallOrderCount = analytics?.small_order_count ?? 0;

  const campusCih =
    totalCampusCih ??
    reconData?.total_campus_cih ??
    reconData?.total_cash_collected ??
    0;
  const lockedCount =
    lockedRidersCount ??
    reconData?.locked_riders_count ??
    (reconData?.riders
      ? reconData.riders.filter((r) => r.is_locked || r.status === "LOCKED").length
      : 0);

  return (
    <div className="space-y-6">
      {/* Top 4 Financial Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Net App Earnings */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-emerald-900">
              Net App Earnings
            </h3>
            <div className="rounded-xl bg-emerald-100/80 p-2 text-emerald-700">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-emerald-700">
            ₹{earnings.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-2 space-y-1.5">
            <p
              className="flex items-start text-xs font-medium text-emerald-800 leading-snug"
              title="18% Canteen Commission + Tech Fees (₹3/₹5) + Small Order Fees (₹5) + Delivery Differential"
            >
              <Info className="mr-1 mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>18% Canteen Commission + Tech Fees (₹3/₹5) + Small Order Fees (₹5) + Delivery Differential</span>
            </p>
            {smallOrderFeesTotal > 0 || smallOrderCount > 0 ? (
              <div
                data-testid="small-order-surcharge-pill"
                className="inline-flex items-center gap-1 rounded-md bg-emerald-100/90 px-2 py-0.5 text-[11px] font-semibold text-emerald-900 border border-emerald-200"
              >
                <span>⚡ Small Order Surcharges (&lt;₹50): +₹{smallOrderFeesTotal.toFixed(2)} ({smallOrderCount} orders)</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Total Revenue (GMV) */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-blue-900">
              Total Revenue (GMV)
            </h3>
            <div className="rounded-xl bg-blue-100/80 p-2 text-blue-700">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-blue-700">
            ₹{gmv.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-blue-600">
            Gross merchandise volume processed
          </p>
        </div>

        {/* Completed Orders */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/70 via-white to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-purple-900">
              Completed Orders
            </h3>
            <div className="rounded-xl bg-purple-100/80 p-2 text-purple-700">
              <PackageCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-purple-700">
            {orders.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-purple-600">
            Delivered customer orders
          </p>
        </div>

        {/* Avg. Order Value (AOV) */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/70 via-white to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-900">
              Avg. Order Value (AOV)
            </h3>
            <div className="rounded-xl bg-amber-100/80 p-2 text-amber-700">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-amber-700">
            ₹{aov.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-amber-600">
            GMV ÷ completed orders
          </p>
        </div>
      </div>

      {/* Fund Distribution Breakdown */}
      <div className="rounded-2xl border bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowDistribution((prev) => !prev)}
          className="flex w-full items-center justify-between p-5 text-left transition hover:bg-gray-50/60 rounded-2xl cursor-pointer"
          aria-expanded={showDistribution}
        >
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Fund Distribution &amp; Settlement Pool
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Breakdown of food subtotals, rider payouts, and statutory GST from completed deliveries
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
            <span>{showDistribution ? "Hide Breakdown" : "View Breakdown"}</span>
            {showDistribution ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </button>

        {showDistribution && (
          <div className="border-t border-gray-100 p-5 pt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Restaurant Subtotal Net */}
              <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-4">
                <div className="flex items-center gap-2 text-orange-800">
                  <Store className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Restaurant Subtotal Net
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-orange-700">
                  ₹{restaurantNet.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="mt-1 text-xs text-orange-600/80">
                  Food sales minus commission payouts
                </p>
              </div>

              {/* Delivery Pool & Float Oversight */}
              <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-teal-800">
                    <Bike className="h-4 w-4 text-teal-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Delivery Pool &amp; Float Oversight
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-teal-700">
                    ₹{courierPayouts.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1 text-xs text-teal-600/80">
                    Total rider wages earned (fulfilled × ₹20.00 + tips)
                  </p>
                </div>

                {/* Physical Cash on Campus & Hard Lockout Counter */}
                <div className="mt-3 pt-3 border-t border-teal-200/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-teal-900 font-medium">Total Physical Cash on Campus:</span>
                    <span className="font-mono font-bold text-teal-950">
                      ₹{campusCih.toFixed(2)}
                    </span>
                  </div>
                  {lockedCount > 0 ? (
                    <div
                      data-testid="locked-riders-warning"
                      className="rounded-lg bg-rose-100 border border-rose-300 p-2 text-xs font-bold text-rose-900 flex items-center justify-between shadow-xs"
                    >
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-700 shrink-0" />
                        <span>⚠️ {lockedCount} Rider(s) Locked Out (Holdings ≥ ₹500)</span>
                      </span>
                      <a
                        href="#rider-cih-oversight"
                        onClick={onViewLockedRiders}
                        className="text-[11px] underline text-rose-950 hover:text-black font-extrabold cursor-pointer ml-1"
                      >
                        View Locked
                      </a>
                    </div>
                  ) : (
                    <div
                      data-testid="all-riders-active-badge"
                      className="rounded-lg bg-emerald-100/70 border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-900 flex items-center gap-1"
                    >
                      <span>✅ All Couriers Active (&lt; ₹500 CIH)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Statutory GST (5%) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <Receipt className="h-4 w-4 text-slate-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Statutory GST (5%)
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-700">
                  ₹{gstPool.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Collected 5% restaurant food tax
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminFinancialSummaryCards;
