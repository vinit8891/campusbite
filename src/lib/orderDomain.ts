import { isOnlinePayment } from "./paymentLabels";

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
  const s = normalizeOrderStatus(status).replace(/[-_]/g, " ");
  if (s === "pending" || s === "placed") return 0;
  if (s === "accepted") return 1;
  if (["preparing", "cooking", "in prep"].includes(s)) return 2;
  if (["ready", "ready for pickup"].includes(s)) return 3;
  if (s === "assigned") return 4;
  if (["picked up", "out for delivery", "in transit", "on the way"].includes(s)) return 6;
  if (s === "delivered" || s === "completed") return 7;
  return -1;
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

/** Checks if an order status is Cancelled or Rejected (case-insensitive). */
export function isCancelledOrRejected(status?: string | null): boolean {
  if (!status) return false;
  const s = normalizeOrderStatus(status);
  return s === "cancelled" || s === "rejected";
}

/** Checks if an online payment has completed successfully ('paid', 'completed', or 'paid_online'). */
export function isOnlinePaymentPaid(paymentStatus?: string | null): boolean {
  if (!paymentStatus) return false;
  const s = paymentStatus.trim().toLowerCase();
  return s === "paid" || s === "completed" || s === "paid_online";
}

/**
 * Validates that an order's payment is confirmed:
 * - If online: MUST be 'paid' or 'completed' (not pending, processing, failed, or waiting confirmation).
 * - If COD (cash on delivery): payment happens at delivery, so considered confirmed for prep.
 */
export function isOrderPaymentConfirmed(
  paymentMethod?: string | null,
  paymentStatus?: string | null
): boolean {
  if (isOnlinePayment(paymentMethod)) {
    return isOnlinePaymentPaid(paymentStatus);
  }
  return true;
}

/**
 * Checks if an order is active for the customer portal:
 * - Order is not terminal (Delivered, Completed, Cancelled, Rejected)
 * - If online payment: payment must be PAID or COMPLETED (unpaid processing orders are filtered out)
 */
export function isCustomerActiveOrder(order?: {
  status?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
} | null): boolean {
  if (!order || !order.status) return false;
  if (!isActiveStatus(order.status) || isCancelledOrRejected(order.status)) {
    return false;
  }
  return isOrderPaymentConfirmed(order.payment_method, order.payment_status);
}

/**
 * Checks if an order belongs in the restaurant's active KDS prep queue and partner dashboard list:
 * - Must NOT be Cancelled or Rejected
 * - Must NOT be Delivered or Completed
 * - If online payment: MUST be PAID or COMPLETED (no Processing or Waiting confirmation orders)
 * - Must not be stale (> 24 hours old)
 * - Status must be in active prep lifecycle: New (Pending), Cooking (Preparing), or Ready for Pickup
 */
export function isRestaurantActiveOrder(order?: {
  status?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  created_at?: string | number | Date | null;
} | null): boolean {
  if (!order || !order.status) return false;
  if (isCancelledOrRejected(order.status) || isCompletedOrInactiveOrder(order.status)) {
    return false;
  }
  if (!isOrderPaymentConfirmed(order.payment_method, order.payment_status)) {
    return false;
  }
  const s = normalizeOrderStatus(order.status);
  const isValidPrepStatus = isNewOrder(s) || isCookingOrder(s) || isReadyOrder(s);
  return isValidPrepStatus && !isOrderStale(order.created_at);
}

