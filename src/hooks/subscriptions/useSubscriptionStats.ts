import { useMemo } from "react";
import type { Subscription } from "@/services/subscriptionService";
import {
  isSubscriptionActive,
  isSubscriptionPaused,
  isSubscriptionExpired,
  isSubscriptionCancelled,
} from "@/lib/subscriptionDomain";

export function useSubscriptionStats(items: Subscription[]) {
  return useMemo(() => {
    const activeCount = items.filter((sub) =>
      isSubscriptionActive(sub.status)
    ).length;
    const pausedCount = items.filter((sub) =>
      isSubscriptionPaused(sub.status)
    ).length;
    const expiredCount = items.filter(
      (sub) =>
        isSubscriptionExpired(sub.status) ||
        isSubscriptionCancelled(sub.status)
    ).length;

    return {
      totalCount: items.length,
      activeCount,
      pausedCount,
      expiredCount,
    };
  }, [items]);
}
