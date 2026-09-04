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
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4">
      {cards.map((card) => {
        const style = getCardStyle(card.label);
        const isPendingWithOrders =
          card.label === "Pending" && Number(dashboard.pending_orders ?? 0) > 0;

        return (
          <Card
            key={card.label}
            className={`rounded-2xl sm:rounded-3xl border shadow-xs transition-all hover:shadow-md ${style.cardBg} ${
              isPendingWithOrders ? "ring-2 ring-amber-400/80 animate-pulse" : ""
            }`}
          >
            <CardHeader className="pb-0.5 pt-3.5 px-3.5 sm:pt-4 sm:px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-stone-600 truncate pr-1">
                {card.label}
              </CardTitle>
              <span
                className="text-base sm:text-lg leading-none shrink-0"
                role="img"
                aria-label={card.label}
              >
                {style.emoji}
              </span>
            </CardHeader>

            <CardContent className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-0.5 sm:pt-1">
              <p
                className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight truncate ${style.valueClass}`}
              >
                {card.value}
              </p>
              {card.hint && (
                <CardDescription className="text-[10px] sm:text-xs font-medium text-stone-500 mt-0.5 truncate">
                  {card.hint}
                </CardDescription>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Subscription Quick Card: Today's Mess Meals */}
      <Link href={ROUTES.RESTAURANT_ORDERS} className="block group">
        <Card className="h-full rounded-2xl sm:rounded-3xl bg-amber-50/70 border-amber-200/80 text-amber-950 shadow-xs transition-all group-hover:border-amber-300 group-hover:shadow-md">
          <CardHeader className="pb-0.5 pt-3.5 px-3.5 sm:pt-4 sm:px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-amber-800 truncate pr-1">
              Today&apos;s Mess Meals
            </CardTitle>
            <span className="text-base sm:text-lg leading-none shrink-0">🍱</span>
          </CardHeader>
          <CardContent className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-0.5 sm:pt-1">
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-900 tracking-tight truncate">
              {dashboard.today_subscription_meals ?? 0}
            </p>
            <p className="mt-0.5 text-[10px] sm:text-xs font-bold text-amber-800 group-hover:underline truncate">
              View in Kitchen Orders →
            </p>
          </CardContent>
        </Card>
      </Link>

      {/* Subscription Quick Card: Subscription Revenue */}
      <Link
        href={ROUTES.RESTAURANT_SUBSCRIPTIONS}
        className="block group col-span-2 sm:col-span-1"
      >
        <Card className="h-full rounded-2xl sm:rounded-3xl bg-emerald-50/70 border-emerald-200/80 text-emerald-950 shadow-xs transition-all group-hover:border-emerald-300 group-hover:shadow-md">
          <CardHeader className="pb-0.5 pt-3.5 px-3.5 sm:pt-4 sm:px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-emerald-800 truncate pr-1">
              Subscription Revenue
            </CardTitle>
            <span className="text-base sm:text-lg leading-none shrink-0">💳</span>
          </CardHeader>

          <CardContent className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-0.5 sm:pt-1 space-y-1 text-[11px] sm:text-xs">
            <div className="flex justify-between gap-2 text-stone-600">
              <span className="truncate">Active subs</span>
              <span className="font-bold text-stone-900 shrink-0">
                {subscriptionRevenue?.active_subscriptions ?? 0}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-stone-600 truncate">Monthly rev</span>
              <span className="font-extrabold text-emerald-700 shrink-0">
                ₹{Number(subscriptionRevenue?.monthly_subscription_revenue ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-stone-600 truncate">Pending dues</span>
              <span className="font-bold text-amber-700 shrink-0">
                {subscriptionRevenue?.pending_subscription_payments ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

