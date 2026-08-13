"use client";

import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import { AuthHttpError } from "@/services/authFetch";
import {
  type Subscription,
  getRestaurantSubscriptions,
  todayIsoDate,
} from "@/services/subscriptionService";

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function SubscriptionRow({ subscription }: { subscription: Subscription }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3 text-sm">{subscription.customer_email}</td>
      <td className="px-4 py-3 text-sm capitalize">
        {subscription.meal_type} · {subscription.subscription_type}
      </td>
      <td className="px-4 py-3 text-sm">
        {formatDate(subscription.start_date)} –{" "}
        {formatDate(subscription.end_date)}
      </td>
      <td className="px-4 py-3 text-sm capitalize">{subscription.status}</td>
      <td className="px-4 py-3 text-sm">₹{subscription.price.toFixed(2)}</td>
    </tr>
  );
}

function SectionTable({
  title,
  items,
  empty,
}: {
  title: string;
  items: Subscription[];
  empty: string;
}) {
  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{items.length} total</p>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <SubscriptionRow
                  key={item.subscription_id}
                  subscription={item}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function RestaurantSubscriptionsPage() {
  const [items, setItems] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = todayIsoDate();

  const groups = useMemo(() => {
    const active: Subscription[] = [];
    const upcoming: Subscription[] = [];
    const paused: Subscription[] = [];
    const cancelled: Subscription[] = [];

    for (const item of items) {
      if (item.status === "cancelled") {
        cancelled.push(item);
        continue;
      }
      if (item.status === "paused") {
        paused.push(item);
        continue;
      }
      if (item.start_date > today) {
        upcoming.push(item);
        continue;
      }
      if (
        item.status === "active" &&
        item.start_date <= today &&
        item.end_date >= today
      ) {
        active.push(item);
      }
    }

    return { active, upcoming, paused, cancelled };
  }, [items, today]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      const email = getRestaurantOwnerEmail();
      if (!email) {
        setError("Restaurant session not found.");
        setLoading(false);
        return;
      }

      try {
        const data = await getRestaurantSubscriptions(email);
        setItems(data);
      } catch (err) {
        if (err instanceof AuthHttpError && err.status === 401) return;
        setError(
          err instanceof Error ? err.message : "Unable to load subscriptions"
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <Users className="h-8 w-8 text-orange-600" />
        <div>
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">
            Read-only view of mess subscribers for your restaurant.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-8">
          <SectionTable
            title="Active subscribers"
            items={groups.active}
            empty="No active subscribers right now."
          />
          <SectionTable
            title="Upcoming starts"
            items={groups.upcoming}
            empty="No upcoming subscription starts."
          />
          <SectionTable
            title="Paused subscriptions"
            items={groups.paused}
            empty="No paused subscriptions."
          />
          <SectionTable
            title="Cancelled subscriptions"
            items={groups.cancelled}
            empty="No cancelled subscriptions."
          />
        </div>
      )}
    </div>
  );
}
