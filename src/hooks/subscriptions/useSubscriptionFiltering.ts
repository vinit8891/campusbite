import { useMemo, useState } from "react";
import type { Subscription } from "@/services/subscriptionService";

export type SubscriptionFilterTab = "all" | "active" | "upcoming" | "history";

export function useSubscriptionFiltering(items: Subscription[]) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<SubscriptionFilterTab>("all");

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!q) return true;
      const searchable = [
        item.plan_name,
        item.meal_type,
        item.subscription_type,
        item.restaurant_email,
        item.subscription_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [items, search]);

  return {
    search,
    setSearch,
    tab,
    setTab,
    filteredItems,
  };
}
