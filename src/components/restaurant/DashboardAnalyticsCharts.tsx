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
    return <p className="text-sm text-gray-500">{emptyText}</p>;
  }

  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={`${row.key}-${index}`}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="font-medium">{labelFor(row.key)}</span>
            <span className="font-semibold">{row.count}</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100">
            <div
              className="h-2.5 rounded-full bg-orange-500"
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
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Revenue Trend (7 days)</CardTitle>
          <CardDescription>Delivered-order revenue by day</CardDescription>
        </CardHeader>
        <CardContent>
          {trend.every((point) => point.revenue === 0) ? (
            <p className="text-sm text-gray-500">
              No delivered revenue in the last 7 days yet.
            </p>
          ) : (
            <div className="flex h-48 items-end gap-2">
              {trend.map((point) => (
                <div
                  key={point.date}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div
                    className="w-full rounded-t-md bg-orange-500"
                    style={{
                      height: `${Math.max(
                        (point.revenue / maxTrendRevenue) * 100,
                        point.revenue > 0 ? 8 : 2
                      )}%`,
                    }}
                    title={`₹${point.revenue.toFixed(2)} · ${point.orders} orders`}
                  />
                  <span className="text-[10px] text-gray-500">
                    {point.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Orders by Status</CardTitle>
          <CardDescription>Current order mix</CardDescription>
        </CardHeader>
        <CardContent>
          <ProgressList
            rows={analytics?.orders_by_status || []}
            labelFor={(key) => key}
            emptyText="No orders yet."
          />
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Payment Breakdown</CardTitle>
          <CardDescription>Method and payment status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-600">
              By method
            </h3>
            <ProgressList
              rows={analytics?.orders_by_payment_method || []}
              labelFor={(key) => formatPaymentMethod(key)}
              emptyText="No payment data yet."
            />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-600">
              By status
            </h3>
            <ProgressList
              rows={analytics?.orders_by_payment_status || []}
              labelFor={(key) => formatPaymentStatus(key, "online")}
              emptyText="No payment status data yet."
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Top Selling Items</CardTitle>
          <CardDescription>Top 5 from delivered orders</CardDescription>
        </CardHeader>
        <CardContent>
          {topItems.length === 0 ? (
            <p className="text-sm text-gray-500">No delivered orders yet.</p>
          ) : (
            <div className="space-y-5">
              {topItems.map((item, index) => (
                <div key={item.name}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="font-semibold">
                      #{index + 1} {item.name}
                    </span>
                    <span className="font-bold">{item.orders} sold</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100">
                    <div
                      className="h-2.5 rounded-full bg-orange-500"
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
