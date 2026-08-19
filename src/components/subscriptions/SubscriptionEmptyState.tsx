import React from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SubscriptionEmptyStateProps = {
  isLoggedIn: boolean;
  onBrowsePlans?: () => void;
};

export function SubscriptionEmptyState({
  isLoggedIn,
  onBrowsePlans,
}: SubscriptionEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed bg-white p-12 text-center">
      <CalendarDays className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
      <h2 className="text-xl font-semibold">No subscriptions yet</h2>
      <p className="mt-2 text-muted-foreground">
        Subscribe to a mess plan to see active meals, upcoming starts, and
        history here.
      </p>
      {isLoggedIn && onBrowsePlans ? (
        <Button className="mt-6" onClick={onBrowsePlans}>
          Browse plans
        </Button>
      ) : null}
    </div>
  );
}
