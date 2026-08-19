import { useMemo } from "react";
import {
  categorizeSubscriptions,
  type Subscription,
} from "@/services/subscriptionService";

export function useSubscriptionGroups(items: Subscription[]) {
  return useMemo(() => categorizeSubscriptions(items), [items]);
}
