import React from "react";
import type { Subscription } from "@/services/subscriptionService";
import { SubscriptionCard } from "./SubscriptionCard";

export type SubscriptionGroupSectionProps = {
  title: string;
  subscriptions: Subscription[];
  emptyText: string;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  busyId: string | null;
};

export function SubscriptionGroupSection({
  title,
  subscriptions,
  emptyText,
  onPause,
  onResume,
  onCancel,
  busyId,
}: SubscriptionGroupSectionProps) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {subscriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <SubscriptionCard
              key={sub.subscription_id}
              subscription={sub}
              onPause={onPause}
              onResume={onResume}
              onCancel={onCancel}
              busy={busyId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
