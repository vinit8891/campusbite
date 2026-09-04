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

function getCardStyle(label: string) {
  switch (label) {
    case "Revenue":
    case "Today's Revenue":
    case "7-Day Revenue":
    case "30-Day Revenue":
      return {
        cardBg: "bg-emerald-50/70 border-emerald-200/80 text-emerald-950",
        valueClass: "text-emerald-800",
        emoji: "💰",
      };
    case "Total Orders":
    case "Today's Orders":
      return {
        cardBg: "bg-blue-50/70 border-blue-200/80 text-blue-950",
        valueClass: "text-blue-800",
        emoji: "📦",
      };
    case "Avg Order Value":
      return {
        cardBg: "bg-teal-50/70 border-teal-200/80 text-teal-950",
        valueClass: "text-teal-800",
        emoji: "🏷️",
      };
    case "Pending":
      return {
        cardBg: "bg-amber-50/80 border-amber-300 text-amber-950",
        valueClass: "text-amber-800",
        emoji: "🔔",
      };
    case "In Progress":
      return {
        cardBg: "bg-indigo-50/70 border-indigo-200/80 text-indigo-950",
        valueClass: "text-indigo-800",
        emoji: "⏳",
      };
    case "Delivered":
      return {
        cardBg: "bg-emerald-50/70 border-emerald-200/80 text-emerald-950",
        valueClass: "text-emerald-800",
        emoji: "✅",
      };
    case "Menu Items":
      return {
        cardBg: "bg-purple-50/70 border-purple-200/80 text-purple-950",
        valueClass: "text-purple-800",
        emoji: "🍱",
      };
    case "Rating":
      return {
        cardBg: "bg-orange-50/70 border-orange-200/80 text-orange-950",
        valueClass: "text-orange-800",
        emoji: "⭐",
      };
    case "Cancelled":
      return {
        cardBg: "bg-rose-50/70 border-rose-200/80 text-rose-950",
        valueClass: "text-rose-800",
        emoji: "❌",
      };
    default:
      return {
        cardBg: "bg-white border-stone-200/80 text-stone-900",
        valueClass: "text-stone-900",
        emoji: "📊",
      };
  }
}

export function DashboardMetricCards({
  cards,
  dashboard,
  subscriptionRevenue,
}: DashboardMetricCardsProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const style = getCardStyle(card.label);

        return (
          <Card
            key={card.label}
            className={`rounded-3xl border shadow-xs transition-all hover:shadow-md ${style.cardBg}`}
          >
            <CardHeader className="pb-1 pt-5 px-5 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-stone-600">
                {card.label}
              </CardTitle>
              <span className="text-xl leading-none" role="img" aria-label={card.label}>
                {style.emoji}
              </span>
            </CardHeader>

            <CardContent className="px-5 pb-5 pt-1">
              <p className={`text-3xl sm:text-4xl font-black tracking-tight ${style.valueClass}`}>
                {card.value}
              </p>
              {card.hint && (
                <CardDescription className="text-xs font-medium text-stone-500 mt-1">
                  {card.hint}
                </CardDescription>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Subscription Quick Cards */}
      <Link href={ROUTES.RESTAURANT_ORDERS} className="block group">
        <Card className="h-full rounded-3xl bg-amber-50/70 border-amber-200/80 text-amber-950 shadow-xs transition-all group-hover:border-amber-300 group-hover:shadow-md">
          <CardHeader className="pb-1 pt-5 px-5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
              Today&apos;s Mess Meals
            </CardTitle>
            <span className="text-xl leading-none">🍱</span>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-1">
            <p className="text-3xl sm:text-4xl font-black text-amber-900 tracking-tight">
              {dashboard.today_subscription_meals ?? 0}
            </p>
            <p className="mt-1 text-xs font-bold text-amber-800 group-hover:underline">
              View in Kitchen Orders →
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href={ROUTES.RESTAURANT_SUBSCRIPTIONS} className="block group">
        <Card className="h-full rounded-3xl bg-emerald-50/70 border-emerald-200/80 text-emerald-950 shadow-xs transition-all group-hover:border-emerald-300 group-hover:shadow-md">
          <CardHeader className="pb-1 pt-5 px-5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
              Subscription Revenue
            </CardTitle>
            <span className="text-xl leading-none">💳</span>
          </CardHeader>

          <CardContent className="px-5 pb-5 pt-1 space-y-1.5 text-xs">
            <div className="flex justify-between gap-3 text-stone-600">
              <span>Active subscriptions</span>
              <span className="font-bold text-stone-900">
                {subscriptionRevenue?.active_subscriptions ?? 0}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-stone-600">Monthly revenue</span>
              <span className="font-extrabold text-emerald-700">
                ₹{Number(subscriptionRevenue?.monthly_subscription_revenue ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-stone-600">Pending payments</span>
              <span className="font-bold text-amber-700">
                {subscriptionRevenue?.pending_subscription_payments ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

