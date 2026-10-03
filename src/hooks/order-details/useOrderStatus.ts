import { useMemo } from "react";
import type { Order } from "@/types/orders";
import {
  ORDER_STATUS_FLOW,
  RESTAURANT_PICKUP_STATUSES,
  isActiveStatus,
  isPickupStatus,
  hasValidCoordinates,
  normalizeOrderStatus,
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

    const norm = normalizeOrderStatus(order.status);
    const isPending = norm === "pending" || norm === "placed";
    const isDelivered = norm === "delivered" || norm === "completed";
    const isCancelled = norm === "cancelled";
    const isRejected = norm === "rejected";
    const isPickedUp = norm === "picked up" || norm === "picked_up";
    const isOutForDelivery =
      norm === "out for delivery" ||
      norm === "out_for_delivery" ||
      norm === "in transit" ||
      norm === "in_transit" ||
      norm === "on the way";

    let currentIndex = 0;
    if (isDelivered) {
      currentIndex = ORDER_STATUSES.length - 1; // 7 (Delivered)
    } else if (isPickedUp || isOutForDelivery) {
      currentIndex = 6; // Out for Delivery (completes Picked Up index 5)
    } else if (norm === "assigned") {
      currentIndex = 4;
    } else if (["ready", "ready for pickup", "ready_for_pickup"].includes(norm)) {
      currentIndex = 3;
    } else if (["preparing", "cooking", "in_prep", "in prep"].includes(norm)) {
      currentIndex = 2;
    } else if (norm === "accepted") {
      currentIndex = 1;
    } else {
      currentIndex = 0;
    }

    const isOrderActive = isActiveStatus(order.status) && !isDelivered;
    const showRestaurantMap =
      !isDelivered && !isCancelled && !isRejected && isPickupStatus(order.status);

    const estimatedDelivery =
      order.estimated_delivery ||
      order.estimated_time ||
      (isDelivered ? "Delivered" : "22–28 mins");

    const hasDeliveryLocation =
      !isDelivered &&
      hasValidCoordinates(
        order.delivery_partner?.latitude,
        order.delivery_partner?.longitude
      );

    const hasRestaurantLocation =
      !isDelivered &&
      hasValidCoordinates(
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

