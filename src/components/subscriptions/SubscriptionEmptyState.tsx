import React from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common";

export type SubscriptionEmptyStateProps = {
  isLoggedIn: boolean;
  onBrowsePlans?: () => void;
};

export function SubscriptionEmptyState({
  isLoggedIn,
  onBrowsePlans,
}: SubscriptionEmptyStateProps) {
  return (
    <EmptyState
      icon={<CalendarDays className="h-10 w-10 text-orange-500" />}
      title="No subscriptions yet"
      description="Subscribe to a mess plan to see active meals, upcoming starts, and history here."
      action={
        isLoggedIn && onBrowsePlans ? (
          <Button className="mt-2 bg-orange-500 hover:bg-orange-600" onClick={onBrowsePlans}>
            Browse plans
          </Button>
        ) : null
      }
    />
  );
}
