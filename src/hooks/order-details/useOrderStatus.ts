import { useMemo } from "react";
import type { Order } from "@/types/orders";
import {
  ORDER_STATUS_FLOW,
  RESTAURANT_PICKUP_STATUSES,
  isActiveStatus,
  isPickupStatus,
  hasValidCoordinates,
} from "@/lib/orderDomain";

export const ORDER_STATUSES = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready for Pickup",
  "Assigned",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
];

export { RESTAURANT_PICKUP_STATUSES };

export function useOrderStatus(order: Order | null) {
  return useMemo(() => {
    if (!order) {
      return {
        isOrderActive: false,
        currentIndex: -1,
        isPending: false,
        isDelivered: false,
        isCancelled: false,
        isRejected: false,
        isPickedUp: false,
        isOutForDelivery: false,
        showRestaurantMap: false,
        estimatedDelivery: "22–28 mins",
        hasDeliveryLocation: false,
        hasRestaurantLocation: false,
      };
    }

    const currentIndex = ORDER_STATUS_FLOW.indexOf(
      order.status as (typeof ORDER_STATUS_FLOW)[number]
    );
    const isPending = order.status === "Pending";
    const isDelivered = order.status === "Delivered";
    const isCancelled = order.status === "Cancelled";
    const isRejected = order.status === "Rejected";
    const isPickedUp = order.status === "Picked Up";
    const isOutForDelivery = order.status === "Out for Delivery";

    const isOrderActive = isActiveStatus(order.status);
    const showRestaurantMap = isPickupStatus(order.status);

    const estimatedDelivery =
      order.estimated_delivery ||
      order.estimated_time ||
      "22–28 mins";

    const hasDeliveryLocation = hasValidCoordinates(
      order.delivery_partner?.latitude,
      order.delivery_partner?.longitude
    );

    const hasRestaurantLocation = hasValidCoordinates(
      order.restaurant_latitude,
      order.restaurant_longitude
    );

    return {
      isOrderActive,
      currentIndex,
      isPending,
      isDelivered,
      isCancelled,
      isRejected,
      isPickedUp,
      isOutForDelivery,
      showRestaurantMap,
      estimatedDelivery,
      hasDeliveryLocation,
      hasRestaurantLocation,
    };
  }, [order]);
}
