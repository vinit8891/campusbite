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

/** Normalizes order status strings to lowercase trimmed text */
export function normalizeOrderStatus(status?: string | null): string {
  return (status || "").toLowerCase().trim();
}

/** Robust canonical status normalizer matching backend canonicalize_status */
export function canonicalizeOrderStatus(status?: string | null): string {
  const s = (status || "").toLowerCase().replace(/[-_]/g, " ").trim();
  if (["accepted", "preparing", "cooking", "in_prep", "in prep"].includes(s)) {
    return "preparing";
  }
  if (["ready", "ready_for_pickup", "ready for pickup"].includes(s)) {
    return "ready";
  }
  if (
    [
      "out_for_delivery",
      "out for delivery",
      "picked_up",
      "picked up",
    ].includes(s)
  ) {
    return "out_for_delivery";
  }
  if (["completed", "delivered"].includes(s)) {
    return "delivered";
  }
  if (["cancelled", "rejected"].includes(s)) {
    return "cancelled";
  }
  return s;
}

/** Strict status buckets */
export const NEW_ORDER_STATUSES = ["pending"] as const;

export const COOKING_ORDER_STATUSES = [
  "accepted",
  "preparing",
  "cooking",
  "in_prep",
] as const;

export const READY_ORDER_STATUSES = [
  "ready",
  "ready_for_pickup",
  "ready for pickup",
] as const;

export const COMPLETED_INACTIVE_ORDER_STATUSES = [
  "delivered",
  "completed",
  "cancelled",
  "picked_up",
  "picked up",
  "out_for_delivery",
  "out for delivery",
  "rejected",
] as const;

/** Checks if an order status is in the New / Pending queue */
export function isNewOrder(status?: string | null): boolean {
  const s = normalizeOrderStatus(status);
  return s === "pending";
}

/** Checks if an order is actively cooking or in prep in the kitchen */
export function isCookingOrder(status?: string | null): boolean {
  const s = normalizeOrderStatus(status);
  return (
    COOKING_ORDER_STATUSES.includes(
      s as (typeof COOKING_ORDER_STATUSES)[number]
    ) ||
    COOKING_ORDER_STATUSES.includes(
      s.replace(/\s+/g, "_") as (typeof COOKING_ORDER_STATUSES)[number]
    )
  );
}

/** Checks if an order is packed and ready for pickup */
export function isReadyOrder(status?: string | null): boolean {
  const s = normalizeOrderStatus(status);
  return (
    READY_ORDER_STATUSES.includes(s as (typeof READY_ORDER_STATUSES)[number]) ||
    READY_ORDER_STATUSES.includes(
      s.replace(/\s+/g, "_") as (typeof READY_ORDER_STATUSES)[number]
    )
  );
}

/** Checks if an order is completed, delivered, picked up, out for delivery, or cancelled */
export function isCompletedOrInactiveOrder(status?: string | null): boolean {
  const s = normalizeOrderStatus(status);
  return (
    COMPLETED_INACTIVE_ORDER_STATUSES.includes(
      s as (typeof COMPLETED_INACTIVE_ORDER_STATUSES)[number]
    ) ||
    COMPLETED_INACTIVE_ORDER_STATUSES.includes(
      s.replace(/\s+/g, "_") as (typeof COMPLETED_INACTIVE_ORDER_STATUSES)[number]
    )
  );
}

/**
 * Safely parses an ISO date string, treating naive ISO strings without timezone offsets as UTC.
 */
export const parseDateSafe = (
  dateStr?: string | number | Date | null
): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === "number") return new Date(dateStr);
  const str = String(dateStr).trim();
  if (!str) return new Date();
  const hasTimezone = str.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(str);
  return new Date(hasTimezone ? str : `${str}Z`);
};

/** Checks if an order is older than maxAgeHours (default 24h) and thus stale / archived */
export function isOrderStale(
  createdAt?: string | number | Date | null,
  maxAgeHours = 24
): boolean {
  if (!createdAt) return false;
  try {
    const createdTime = parseDateSafe(createdAt).getTime();
    if (isNaN(createdTime)) return false;
    const now = Date.now();
    const ageHours = (now - createdTime) / (1000 * 60 * 60);
    return ageHours > maxAgeHours;
  } catch {
    return false;
  }
}

/** Checks if an order status is actively progressing (not Delivered, Cancelled, or Rejected). */
export function isActiveStatus(status?: string | null): boolean {
  if (!status) return false;
  const s = normalizeOrderStatus(status);
  const terminalLowercase = [
    "delivered",
    "completed",
    "cancelled",
    "rejected",
  ];
  return !terminalLowercase.includes(s);
}

/** Descriptive alias for active order status check. */
export const isActiveOrderStatus = isActiveStatus;

/** Checks if an order has reached a terminal completion or cancellation state. */
export function isTerminalStatus(status?: string | null): boolean {
  if (!status) return false;
  const s = normalizeOrderStatus(status);
  const terminalLowercase = [
    "delivered",
    "completed",
    "cancelled",
    "rejected",
  ];
  return terminalLowercase.includes(s);
}

/** Descriptive alias for terminal status check. */
export const isTerminalOrderStatus = isTerminalStatus;

/** Checks if an order is ready or being prepared for restaurant pickup. */
export function isPickupStatus(status?: string | null): boolean {
  if (!status) return false;
  const s = normalizeOrderStatus(status);
  return isCookingOrder(s) || isReadyOrder(s);
}

/** Returns the 0-based step index in the standard order progression, or -1 if unknown/terminal. */
export function getOrderStatusIndex(status?: string | null): number {
  if (!status) return -1;
  const s = normalizeOrderStatus(status);
  const flowLowercase = ORDER_STATUS_FLOW.map((item) =>
    item.toLowerCase().trim()
  );
  return flowLowercase.indexOf(s);
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
