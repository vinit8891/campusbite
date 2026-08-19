import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import type {
  DashboardData,
  StatCard,
} from "@/hooks/restaurant/useRestaurantDashboard";
import type { RestaurantSubscriptionRevenueSummary } from "@/types";

type DashboardMetricCardsProps = {
  cards: StatCard[];
  dashboard: DashboardData;
  subscriptionRevenue: RestaurantSubscriptionRevenueSummary | null;
};

export function DashboardMetricCards({
  cards,
  dashboard,
  subscriptionRevenue,
}: DashboardMetricCardsProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="bg-white shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-gray-700">{card.label}</CardTitle>
            {card.hint && <CardDescription>{card.hint}</CardDescription>}
          </CardHeader>
          <CardContent>
            <p className={`text-4xl font-bold ${card.valueClass}`}>
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}

      <Link href={ROUTES.RESTAURANT_ORDERS} className="block">
        <Card className="h-full bg-white shadow-sm transition hover:border-orange-300 hover:shadow-md">
          <CardHeader className="pb-0">
            <CardTitle className="text-gray-700">
              Today&apos;s Subscription Meals
            </CardTitle>
            <CardDescription>
              Auto-generated mess orders for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-orange-600">
              {dashboard.today_subscription_meals ?? 0}
            </p>
            <p className="mt-2 text-sm text-orange-700">
              View in Restaurant Orders →
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href={ROUTES.RESTAURANT_SUBSCRIPTIONS} className="block">
        <Card className="h-full bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-md">
          <CardHeader className="pb-0">
            <CardTitle className="text-gray-700">
              Subscription Revenue
            </CardTitle>
            <CardDescription>
              Active plans and subscription billing (read-only)
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Active subscriptions</span>
              <span className="font-semibold">
                {subscriptionRevenue?.active_subscriptions ?? 0}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Monthly revenue</span>
              <span className="font-semibold text-emerald-700">
                ₹
                {Number(
                  subscriptionRevenue?.monthly_subscription_revenue ?? 0
                ).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Pending payments</span>
              <span className="font-semibold text-amber-700">
                {subscriptionRevenue?.pending_subscription_payments ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
