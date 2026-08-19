import React from "react";
import { Pause, Play, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/formatters";
import { OrderStatusBadge } from "@/components/common";
import {
  isSubscriptionPaused,
  isSubscriptionCancelled,
  isSubscriptionExpired,
} from "@/lib/subscriptionDomain";
import type { Subscription } from "@/services/subscriptionService";


export type SubscriptionCardProps = {
  subscription: Subscription;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  busy: string | null;
};

export function SubscriptionCard({
  subscription,
  onPause,
  onResume,
  onCancel,
  busy,
}: SubscriptionCardProps) {
  const isBusy = busy === subscription.subscription_id;

  return (
    <article className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold capitalize">
            {subscription.plan_name
              ? subscription.plan_name
              : `${subscription.meal_type} · ${subscription.subscription_type}`}
          </h3>
          <p className="text-sm text-muted-foreground">
            {subscription.restaurant_email}
          </p>
        </div>
        <OrderStatusBadge status={subscription.status} size="sm" />
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Period</dt>
          <dd>
            {formatDate(subscription.start_date)} –{" "}
            {formatDate(subscription.end_date)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Price</dt>
          <dd>₹{subscription.price.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Delivery days</dt>
          <dd className="capitalize">
            {subscription.delivery_days.join(", ")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Payment</dt>
          <dd className="capitalize">{subscription.payment_status}</dd>
        </div>
        {subscription.pause_from && subscription.pause_to ? (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Paused</dt>
            <dd>
              {formatDate(subscription.pause_from)} –{" "}
              {formatDate(subscription.pause_to)}
            </dd>
          </div>
        ) : null}
      </dl>

      {!isSubscriptionCancelled(subscription.status) &&
      !isSubscriptionExpired(subscription.status) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {isSubscriptionPaused(subscription.status) ? (
            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => onResume(subscription.subscription_id)}
            >
              <Play className="mr-2 h-4 w-4" />
              Resume
            </Button>
          ) : (

            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => onPause(subscription.subscription_id)}
            >
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
            disabled={isBusy}
            onClick={() => onCancel(subscription.subscription_id)}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      ) : null}
    </article>
  );
}
