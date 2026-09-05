import { describe, it, expect } from "vitest";
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUSES,
  TERMINAL_ORDER_STATUSES,
  RESTAURANT_PICKUP_STATUSES,
  ACTIVE_ORDER_STATUSES,
  normalizeOrderStatus,
  isNewOrder,
  isCookingOrder,
  isReadyOrder,
  isCompletedOrInactiveOrder,
  isOrderStale,
  isActiveStatus,
  isActiveOrderStatus,
  isTerminalStatus,
  isTerminalOrderStatus,
  isPickupStatus,
  getOrderStatusIndex,
  hasValidCoordinates,
  parseDateSafe,
  canonicalizeOrderStatus,
} from "@/lib/orderDomain";

describe("orderDomain utilities", () => {
  describe("canonicalizeOrderStatus", () => {
    it("canonicalizes cooking and preparing aliases to preparing", () => {
      expect(canonicalizeOrderStatus("Accepted")).toBe("preparing");
      expect(canonicalizeOrderStatus("Preparing")).toBe("preparing");
      expect(canonicalizeOrderStatus("cooking")).toBe("preparing");
      expect(canonicalizeOrderStatus("in_prep")).toBe("preparing");
      expect(canonicalizeOrderStatus("in prep")).toBe("preparing");
    });

    it("canonicalizes ready variations to ready", () => {
      expect(canonicalizeOrderStatus("Ready")).toBe("ready");
      expect(canonicalizeOrderStatus("ready_for_pickup")).toBe("ready");
      expect(canonicalizeOrderStatus("Ready for Pickup")).toBe("ready");
    });

    it("canonicalizes delivery and terminal variations", () => {
      expect(canonicalizeOrderStatus("Picked Up")).toBe("out_for_delivery");
      expect(canonicalizeOrderStatus("out_for_delivery")).toBe("out_for_delivery");
      expect(canonicalizeOrderStatus("Delivered")).toBe("delivered");
      expect(canonicalizeOrderStatus("completed")).toBe("delivered");
      expect(canonicalizeOrderStatus("Cancelled")).toBe("cancelled");
      expect(canonicalizeOrderStatus("Rejected")).toBe("cancelled");
    });
  });

  describe("parseDateSafe", () => {
    it("parses date with explicit Z timezone", () => {
      const parsed = parseDateSafe("2026-09-05T12:00:00Z");
      expect(parsed.toISOString()).toBe("2026-09-05T12:00:00.000Z");
    });

    it("parses naive ISO string without timezone as UTC", () => {
      const parsed = parseDateSafe("2026-09-05T12:00:00");
      expect(parsed.toISOString()).toBe("2026-09-05T12:00:00.000Z");
    });

    it("parses date with timezone offset correctly", () => {
      const parsed = parseDateSafe("2026-09-05T17:30:00+05:30");
      expect(parsed.toISOString()).toBe("2026-09-05T12:00:00.000Z");
    });

    it("handles null, undefined, or empty gracefully", () => {
      expect(parseDateSafe(null)).toBeInstanceOf(Date);
      expect(parseDateSafe(undefined)).toBeInstanceOf(Date);
      expect(parseDateSafe("")).toBeInstanceOf(Date);
    });
  });
  it("exports status constant arrays correctly", () => {
    expect(ORDER_STATUS_FLOW.length).toBe(8);
    expect(ORDER_STATUSES.length).toBe(10);
    expect(TERMINAL_ORDER_STATUSES).toEqual(["Delivered", "Cancelled", "Rejected"]);
    expect(RESTAURANT_PICKUP_STATUSES).toEqual(["Accepted", "Preparing", "Ready for Pickup"]);
    expect(ACTIVE_ORDER_STATUSES.length).toBe(7);
  });

  describe("normalizeOrderStatus & status buckets", () => {
    it("normalizes order status strings", () => {
      expect(normalizeOrderStatus("  Pending  ")).toBe("pending");
      expect(normalizeOrderStatus("READY_FOR_PICKUP")).toBe("ready_for_pickup");
      expect(normalizeOrderStatus(null)).toBe("");
      expect(normalizeOrderStatus(undefined)).toBe("");
    });

    it("evaluates isNewOrder strictly for pending", () => {
      expect(isNewOrder("Pending")).toBe(true);
      expect(isNewOrder("pending")).toBe(true);
      expect(isNewOrder("Accepted")).toBe(false);
      expect(isNewOrder("Delivered")).toBe(false);
      expect(isNewOrder(null)).toBe(false);
    });

    it("evaluates isCookingOrder for cooking and preparing variations", () => {
      expect(isCookingOrder("Accepted")).toBe(true);
      expect(isCookingOrder("preparing")).toBe(true);
      expect(isCookingOrder("Cooking")).toBe(true);
      expect(isCookingOrder("in_prep")).toBe(true);
      expect(isCookingOrder("in prep")).toBe(true);
      expect(isCookingOrder("Pending")).toBe(false);
      expect(isCookingOrder("Ready")).toBe(false);
      expect(isCookingOrder("Delivered")).toBe(false);
      expect(isCookingOrder("out_for_delivery")).toBe(false);
    });

    it("evaluates isReadyOrder for ready variations", () => {
      expect(isReadyOrder("Ready for Pickup")).toBe(true);
      expect(isReadyOrder("ready_for_pickup")).toBe(true);
      expect(isReadyOrder("Ready")).toBe(true);
      expect(isReadyOrder("ready")).toBe(true);
      expect(isReadyOrder("Cooking")).toBe(false);
      expect(isReadyOrder("Delivered")).toBe(false);
      expect(isReadyOrder(null)).toBe(false);
    });

    it("evaluates isCompletedOrInactiveOrder strictly", () => {
      expect(isCompletedOrInactiveOrder("Delivered")).toBe(true);
      expect(isCompletedOrInactiveOrder("delivered")).toBe(true);
      expect(isCompletedOrInactiveOrder("Cancelled")).toBe(true);
      expect(isCompletedOrInactiveOrder("Picked Up")).toBe(true);
      expect(isCompletedOrInactiveOrder("picked_up")).toBe(true);
      expect(isCompletedOrInactiveOrder("Out for Delivery")).toBe(true);
      expect(isCompletedOrInactiveOrder("out_for_delivery")).toBe(true);
      expect(isCompletedOrInactiveOrder("Rejected")).toBe(true);
      expect(isCompletedOrInactiveOrder("Preparing")).toBe(false);
      expect(isCompletedOrInactiveOrder("Pending")).toBe(false);
    });

    it("evaluates isOrderStale based on timestamp", () => {
      const freshDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      const staleDate = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(); // 26 hours ago
      expect(isOrderStale(freshDate)).toBe(false);
      expect(isOrderStale(staleDate)).toBe(true);
      expect(isOrderStale(null)).toBe(false);
      expect(isOrderStale("invalid-date")).toBe(false);
    });
  });

  describe("isActiveStatus & isActiveOrderStatus", () => {
    it("returns false for undefined, null, or empty string", () => {
      expect(isActiveStatus()).toBe(false);
      expect(isActiveStatus(null)).toBe(false);
      expect(isActiveStatus("")).toBe(false);
      expect(isActiveOrderStatus(null)).toBe(false);
    });

    it("returns true for non-terminal active statuses", () => {
      expect(isActiveStatus("Pending")).toBe(true);
      expect(isActiveStatus("Accepted")).toBe(true);
      expect(isActiveStatus("Preparing")).toBe(true);
      expect(isActiveStatus("Out for Delivery")).toBe(true);
      expect(isActiveOrderStatus("Picked Up")).toBe(true);
    });

    it("returns false for terminal statuses", () => {
      expect(isActiveStatus("Delivered")).toBe(false);
      expect(isActiveStatus("Cancelled")).toBe(false);
      expect(isActiveStatus("Rejected")).toBe(false);
      expect(isActiveOrderStatus("Delivered")).toBe(false);
    });
  });

  describe("isTerminalStatus & isTerminalOrderStatus", () => {
    it("returns false for undefined or null", () => {
      expect(isTerminalStatus()).toBe(false);
      expect(isTerminalStatus(null)).toBe(false);
      expect(isTerminalOrderStatus("")).toBe(false);
    });

    it("returns true for Delivered, Cancelled, and Rejected", () => {
      expect(isTerminalStatus("Delivered")).toBe(true);
      expect(isTerminalStatus("Cancelled")).toBe(true);
      expect(isTerminalStatus("Rejected")).toBe(true);
      expect(isTerminalOrderStatus("Delivered")).toBe(true);
    });

    it("returns false for active progressing statuses", () => {
      expect(isTerminalStatus("Pending")).toBe(false);
      expect(isTerminalStatus("Accepted")).toBe(false);
      expect(isTerminalStatus("Out for Delivery")).toBe(false);
    });
  });

  describe("isPickupStatus", () => {
    it("returns true only for Accepted, Preparing, Ready for Pickup", () => {
      expect(isPickupStatus("Accepted")).toBe(true);
      expect(isPickupStatus("Preparing")).toBe(true);
      expect(isPickupStatus("Ready for Pickup")).toBe(true);
      expect(isPickupStatus("Pending")).toBe(false);
      expect(isPickupStatus("Delivered")).toBe(false);
      expect(isPickupStatus(null)).toBe(false);
    });
  });

  describe("getOrderStatusIndex", () => {
    it("returns correct 0-based index in the flow", () => {
      expect(getOrderStatusIndex("Pending")).toBe(0);
      expect(getOrderStatusIndex("Accepted")).toBe(1);
      expect(getOrderStatusIndex("Preparing")).toBe(2);
      expect(getOrderStatusIndex("Ready for Pickup")).toBe(3);
      expect(getOrderStatusIndex("Delivered")).toBe(7);
    });

    it("returns -1 for unknown or null status", () => {
      expect(getOrderStatusIndex(null)).toBe(-1);
      expect(getOrderStatusIndex("Cancelled")).toBe(-1);
      expect(getOrderStatusIndex("Unknown")).toBe(-1);
    });
  });

  describe("hasValidCoordinates", () => {
    it("returns true for valid finite numeric coordinates", () => {
      expect(hasValidCoordinates(18.5204, 73.8567)).toBe(true);
      expect(hasValidCoordinates(0, 0)).toBe(true);
      expect(hasValidCoordinates(-33.8688, 151.2093)).toBe(true);
    });

    it("returns false for null, undefined, or NaN coordinates", () => {
      expect(hasValidCoordinates(null, 73.85)).toBe(false);
      expect(hasValidCoordinates(18.52, undefined)).toBe(false);
      expect(hasValidCoordinates(NaN, 73.85)).toBe(false);
      expect(hasValidCoordinates(18.52, Infinity)).toBe(false);
      expect(hasValidCoordinates()).toBe(false);
    });
  });
});
