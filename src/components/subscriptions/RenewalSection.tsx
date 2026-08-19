import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import type { Subscription } from "@/services/subscriptionService";

export type RenewalSectionProps = {
  subscription: Subscription;
  canRenew: boolean;
  canRetry: boolean;
  isBusy: boolean;
  onRenew: (subscription: Subscription) => void;
  onRetry: (subscription: Subscription) => void;
};

export function RenewalSection({
  subscription,
  canRenew,
  canRetry,
  isBusy,
  onRenew,
  onRetry,
}: RenewalSectionProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {canRenew ? (
        <Button
          size="sm"
          disabled={isBusy}
          onClick={() => onRenew(subscription)}
        >
          Renew Now
        </Button>
      ) : null}
      {canRetry ? (
        <Button
          size="sm"
          variant="outline"
          disabled={isBusy}
          onClick={() => onRetry(subscription)}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry Payment
        </Button>
      ) : null}
    </div>
  );
}
