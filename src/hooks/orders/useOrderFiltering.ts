import { useMemo, useState } from "react";
import type { FilterType, Order, SortType } from "@/types/orders";
import { isActiveStatus } from "@/lib/orderDomain";

export { isActiveStatus };

export const FILTER_BUTTONS: FilterType[] = [
  "All",
  "Active",
  "Delivered",
  "Cancelled",
];


export function useOrderFiltering(orders: Order[]) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("All");
  const [sort, setSort] = useState<SortType>("Newest");

  const hasActiveOrders = useMemo(
    () => orders.some((order) => isActiveStatus(order.status)),
    [orders]
  );

  const activeOrdersCount = useMemo(
    () => orders.filter((order) => isActiveStatus(order.status)).length,
    [orders]
  );

  const deliveredOrdersCount = useMemo(
    () => orders.filter((order) => order.status === "Delivered").length,
    [orders]
  );

  const cancelledOrdersCount = useMemo(
    () =>
      orders.filter((order) =>
        ["Cancelled", "Rejected"].includes(order.status)
      ).length,
    [orders]
  );

  const filterCounts = useMemo<Record<FilterType, number>>(
    () => ({
      All: orders.length,
      Active: activeOrdersCount,
      Delivered: deliveredOrdersCount,
      Cancelled: cancelledOrdersCount,
    }),
    [
      orders.length,
      activeOrdersCount,
      deliveredOrdersCount,
      cancelledOrdersCount,
    ]
  );

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = orders.filter((order) => {
      if (filter === "Active" && !isActiveStatus(order.status)) {
        return false;
      }

      if (filter === "Delivered" && order.status !== "Delivered") {
        return false;
      }

      if (
        filter === "Cancelled" &&
        !["Cancelled", "Rejected"].includes(order.status)
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const restaurantName = order.restaurant_name ?? "Campus Restaurant";
      const restaurantCuisine = order.restaurant_cuisine ?? "Campus Dining";
      const itemNames = order.items.map((item) => item.name).join(" ");

      const searchableText = [
        restaurantName,
        restaurantCuisine,
        order.restaurant_email,
        order._id,
        itemNames,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });

    return [...result].sort((a, b) => {
      switch (sort) {
        case "Oldest":
          return (
            new Date(a.created_at ?? 0).getTime() -
            new Date(b.created_at ?? 0).getTime()
          );

        case "Highest Amount":
          return b.total - a.total;

        case "Lowest Amount":
          return a.total - b.total;

        case "Newest":
        default:
          return (
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
          );
      }
    });
  }, [orders, search, filter, sort]);

  const resetFilters = () => {
    setSearch("");
    setFilter("All");
  };

  return {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filteredOrders,
    activeOrdersCount,
    deliveredOrdersCount,
    cancelledOrdersCount,
    filterCounts,
    hasActiveOrders,
    resetFilters,
  };
}
