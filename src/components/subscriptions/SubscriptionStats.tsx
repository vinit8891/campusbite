import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/formatters";
import { OrderStatusBadge } from "@/components/common";
import type { SubscriptionSummary } from "@/services/subscriptionService";

export type SubscriptionStatsProps = {
  summary: SubscriptionSummary | null;
  summaryLoading: boolean;
};

export function SubscriptionStats({
  summary,
  summaryLoading,
}: SubscriptionStatsProps) {
  if (summaryLoading) {
    return (
      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </section>
    );
  }

  return (
    <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-muted-foreground">
          Today&apos;s Meal
        </h2>
        {summary?.today_meal ? (
          <div className="mt-2">
            <p className="font-semibold capitalize">
              {summary.today_meal.meal_type}
              {summary.today_meal.plan_name
                ? ` · ${summary.today_meal.plan_name}`
                : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              {summary.today_meal.restaurant_email}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No meal scheduled for today.
          </p>
        )}
      </article>

      <article className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-muted-foreground">
          Upcoming Meal
        </h2>
        {summary?.upcoming_meal ? (
          <div className="mt-2">
            <p className="font-semibold">
              {formatDate(summary.upcoming_meal.date)}
            </p>
            <p className="text-sm capitalize">
              {summary.upcoming_meal.meal_type}
              {summary.upcoming_meal.plan_name
                ? ` · ${summary.upcoming_meal.plan_name}`
                : ""}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No upcoming meals scheduled.
          </p>
        )}
      </article>

      <article className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-muted-foreground">
          Last Generated Order
        </h2>
        {summary?.last_generated_order ? (
          <div className="mt-2">
            <p className="font-semibold">
              {summary.last_generated_order.meal_name || "Mess meal"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDate(
                summary.last_generated_order.subscription_order_date
              )}{" "}
              · {summary.last_generated_order.status}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No generated orders yet.
          </p>
        )}
      </article>

      <article className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-muted-foreground">
          Status
        </h2>
        <div className="mt-2">
          {summary?.subscription_status ? (
            <OrderStatusBadge
              status={summary.subscription_status}
              size="sm"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No active subscription
            </p>
          )}
        </div>
      </article>
    </section>
  );
}
