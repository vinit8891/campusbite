import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatPaymentMethod,
  formatPaymentStatus,
} from "@/lib/paymentLabels";
import type {
  AnalyticsOverview,
  CountRow,
  TopItem,
  TrendPoint,
} from "@/hooks/restaurant/useRestaurantDashboard";

function ProgressList({
  rows,
  labelFor,
  emptyText,
}: {
  rows: CountRow[];
  labelFor: (key: string) => string;
  emptyText: string;
}) {
  if (!rows.length) {
    return <p className="text-xs sm:text-sm text-stone-500">{emptyText}</p>;
  }

  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="space-y-3 sm:space-y-4">
      {rows.map((row, index) => (
        <div key={`${row.key}-${index}`}>
          <div className="mb-1 flex justify-between gap-2 text-xs sm:text-sm">
            <span className="font-semibold text-stone-700 truncate">
              {labelFor(row.key)}
            </span>
            <span className="font-bold text-stone-900 shrink-0">
              {row.count}
            </span>
          </div>
          <div className="h-2 sm:h-2.5 rounded-full bg-stone-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-300"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

type DashboardAnalyticsChartsProps = {
  analytics: AnalyticsOverview | null;
  trend: TrendPoint[];
  maxTrendRevenue: number;
  topItems: TopItem[];
  maxTop: number;
};

export function DashboardAnalyticsCharts({
  analytics,
  trend,
  maxTrendRevenue,
  topItems,
  maxTop,
}: DashboardAnalyticsChartsProps) {
  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      {/* 1. Revenue Trend (7 days) */}
      <Card className="rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white shadow-xs">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg font-extrabold text-stone-900">
            Revenue Trend (7 days)
          </CardTitle>
          <CardDescription className="text-xs text-stone-500">
            Delivered-order revenue by day
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-3">
          {trend.every((point) => point.revenue === 0) ? (
            <p className="text-xs sm:text-sm text-stone-500">
              No delivered revenue in the last 7 days yet.
            </p>
          ) : (
            <div className="flex h-40 sm:h-48 items-end gap-1.5 sm:gap-2 pt-2">
              {trend.map((point) => (
                <div
                  key={point.date}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <div
                    className="w-full rounded-t-md bg-orange-500 transition-all hover:bg-orange-600"
                    style={{
                      height: `${Math.max(
                        (point.revenue / maxTrendRevenue) * 100,
                        point.revenue > 0 ? 8 : 2
                      )}%`,
                    }}
                    title={`₹${point.revenue.toFixed(2)} · ${point.orders} orders`}
                  />
                  <span className="text-[9px] sm:text-[10px] font-bold text-stone-500 truncate">
                    {point.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Orders by Status */}
      <Card className="rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white shadow-xs">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg font-extrabold text-stone-900">
            Orders by Status
          </CardTitle>
          <CardDescription className="text-xs text-stone-500">
            Current order mix & volume
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-3">
          <ProgressList
            rows={analytics?.orders_by_status || []}
            labelFor={(key) => key}
            emptyText="No orders yet."
          />
        </CardContent>
      </Card>

      {/* 3. Payment Breakdown */}
      <Card className="rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white shadow-xs">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg font-extrabold text-stone-900">
            Payment Breakdown
          </CardTitle>
          <CardDescription className="text-xs text-stone-500">
            Payment method and settlement status
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-3 space-y-5 sm:space-y-6">
          <div>
            <h3 className="mb-2 text-xs font-bold text-stone-600 uppercase tracking-wider">
              By Method
            </h3>
            <ProgressList
              rows={analytics?.orders_by_payment_method || []}
              labelFor={(key) => formatPaymentMethod(key)}
              emptyText="No payment data yet."
            />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-bold text-stone-600 uppercase tracking-wider">
              By Status
            </h3>
            <ProgressList
              rows={analytics?.orders_by_payment_status || []}
              labelFor={(key) => formatPaymentStatus(key, "online")}
              emptyText="No payment status data yet."
            />
          </div>
        </CardContent>
      </Card>

      {/* 4. Top Selling Items */}
      <Card className="rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white shadow-xs">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg font-extrabold text-stone-900">
            Top Selling Items
          </CardTitle>
          <CardDescription className="text-xs text-stone-500">
            Top dishes ranked by order count
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-3">
          {topItems.length === 0 ? (
            <p className="text-xs sm:text-sm text-stone-500">
              No delivered orders yet.
            </p>
          ) : (
            <div className="space-y-3.5 sm:space-y-4">
              {topItems.map((item, index) => (
                <div key={item.name}>
                  <div className="mb-1 flex justify-between gap-2 text-xs sm:text-sm">
                    <span className="font-bold text-stone-900 truncate">
                      #{index + 1} {item.name}
                    </span>
                    <span className="font-extrabold text-orange-600 shrink-0">
                      {item.orders} sold
                    </span>
                  </div>
                  <div className="h-2 sm:h-2.5 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all duration-300"
                      style={{
                        width: `${(item.orders / maxTop) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DashboardAnalyticsCharts;
