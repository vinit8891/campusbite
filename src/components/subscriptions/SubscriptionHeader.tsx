import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";


export type SubscriptionHeaderProps = {
  isLoggedIn: boolean;
  showCreate: boolean;
  onToggleCreate: () => void;
};

export function SubscriptionHeader({
  isLoggedIn,
  showCreate,
  onToggleCreate,
}: SubscriptionHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">Mess Subscriptions</h1>
        <p className="mt-1 text-muted-foreground">
          View and manage your meal plans. Dates cannot be changed after
          activation.
        </p>
      </div>

      {isLoggedIn ? (
        <div className="flex flex-wrap gap-2">
          <Link href={ROUTES.SUBSCRIPTIONS_CALENDAR}>
            <Button variant="outline">Meal calendar</Button>
          </Link>
          <Button onClick={onToggleCreate}>
            {showCreate ? "Close" : "Subscribe"}
          </Button>
        </div>
      ) : (
        <Link href={ROUTES.LOGIN}>
          <Button>Log in</Button>
        </Link>
      )}

    </div>
  );
}
