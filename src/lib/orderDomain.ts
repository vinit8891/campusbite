/**
 * Shared order domain utilities, status sequences, and coordinate helpers.
 */

export const ORDER_STATUS_FLOW = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready for Pickup",
  "Assigned",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
] as const;

export const ORDER_STATUSES = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready for Pickup",
  "Assigned",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Rejected",
] as const;

export const TERMINAL_ORDER_STATUSES = [
  "Delivered",
  "Cancelled",
  "Rejected",
] as const;

export const RESTAURANT_PICKUP_STATUSES = [
  "Accepted",
  "Preparing",
  "Ready for Pickup",
] as const;

export const ACTIVE_ORDER_STATUSES = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready for Pickup",
  "Assigned",
  "Picked Up",
  "Out for Delivery",
] as const;

/** Checks if an order status is actively progressing (not Delivered, Cancelled, or Rejected). */
export function isActiveStatus(status?: string | null): boolean {
  if (!status) return false;
  return !TERMINAL_ORDER_STATUSES.includes(
    status as (typeof TERMINAL_ORDER_STATUSES)[number]
  );
}

/** Descriptive alias for active order status check. */
export const isActiveOrderStatus = isActiveStatus;

/** Checks if an order has reached a terminal completion or cancellation state. */
export function isTerminalStatus(status?: string | null): boolean {
  if (!status) return false;
  return TERMINAL_ORDER_STATUSES.includes(
    status as (typeof TERMINAL_ORDER_STATUSES)[number]
  );
}

/** Descriptive alias for terminal status check. */
export const isTerminalOrderStatus = isTerminalStatus;

/** Checks if an order is ready or being prepared for restaurant pickup. */
export function isPickupStatus(status?: string | null): boolean {
  if (!status) return false;
  return RESTAURANT_PICKUP_STATUSES.includes(
    status as (typeof RESTAURANT_PICKUP_STATUSES)[number]
  );
}

/** Returns the 0-based step index in the standard order progression, or -1 if unknown/terminal. */
export function getOrderStatusIndex(status?: string | null): number {
  if (!status) return -1;
  return ORDER_STATUS_FLOW.indexOf(
    status as (typeof ORDER_STATUS_FLOW)[number]
  );
}

/** Validates whether given latitude and longitude coordinates are finite numeric values. */
export function hasValidCoordinates(
  latitude?: number | null,
  longitude?: number | null
): boolean {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
  );
}
