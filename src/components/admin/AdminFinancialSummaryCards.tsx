import React, { useState } from "react";
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
} from "lucide-react";
import type { AdminFinancialAnalytics } from "@/types";

type AdminFinancialSummaryCardsProps = {
  analytics: AdminFinancialAnalytics | null;
  loading?: boolean;
};

export function AdminFinancialSummaryCards({
  analytics,
  loading = false,
}: AdminFinancialSummaryCardsProps) {
  const [showDistribution, setShowDistribution] = useState(true);

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
          <p className="mt-1 flex items-center text-xs font-medium text-emerald-800">
            <Info className="mr-1 h-3.5 w-3.5" />
            ₹3 tech fees + commissions
          </p>
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
          className="flex w-full items-center justify-between p-5 text-left transition hover:bg-gray-50/60 rounded-2xl"
          aria-expanded={showDistribution}
        >
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Fund Distribution & Settlement Pool
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

              {/* Delivery Pool */}
              <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4">
                <div className="flex items-center gap-2 text-teal-800">
                  <Bike className="h-4 w-4 text-teal-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Delivery Pool
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-teal-700">
                  ₹{courierPayouts.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="mt-1 text-xs text-teal-600/80">
                  Rider delivery fees (batch & standard)
                </p>
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
