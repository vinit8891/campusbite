import { describe, it, expect } from "vitest";
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUSES,
  TERMINAL_ORDER_STATUSES,
  RESTAURANT_PICKUP_STATUSES,
  ACTIVE_ORDER_STATUSES,
  isActiveStatus,
  isActiveOrderStatus,
  isTerminalStatus,
  isTerminalOrderStatus,
  isPickupStatus,
  getOrderStatusIndex,
  hasValidCoordinates,
} from "@/lib/orderDomain";

describe("orderDomain utilities", () => {
  it("exports status constant arrays correctly", () => {
    expect(ORDER_STATUS_FLOW.length).toBe(8);
    expect(ORDER_STATUSES.length).toBe(10);
    expect(TERMINAL_ORDER_STATUSES).toEqual(["Delivered", "Cancelled", "Rejected"]);
    expect(RESTAURANT_PICKUP_STATUSES).toEqual(["Accepted", "Preparing", "Ready for Pickup"]);
    expect(ACTIVE_ORDER_STATUSES.length).toBe(7);
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
