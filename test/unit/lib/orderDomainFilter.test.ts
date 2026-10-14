import { describe, it, expect } from "vitest";
import {
  isCustomerActiveOrder,
  isRestaurantActiveOrder,
  isOnlinePaymentPaid,
  isCancelledOrRejected,
  isOrderPaymentConfirmed,
} from "@/lib/orderDomain";

describe("orderDomain order filtering functions", () => {
  describe("isOnlinePaymentPaid", () => {
    it("returns true for paid, completed, and paid_online regardless of case", () => {
      expect(isOnlinePaymentPaid("paid")).toBe(true);
      expect(isOnlinePaymentPaid("PAID")).toBe(true);
      expect(isOnlinePaymentPaid("Paid")).toBe(true);
      expect(isOnlinePaymentPaid("completed")).toBe(true);
      expect(isOnlinePaymentPaid("COMPLETED")).toBe(true);
      expect(isOnlinePaymentPaid("paid_online")).toBe(true);
    });

    it("returns false for processing, pending, failed, or empty statuses", () => {
      expect(isOnlinePaymentPaid("processing")).toBe(false);
      expect(isOnlinePaymentPaid("Processing")).toBe(false);
      expect(isOnlinePaymentPaid("pending")).toBe(false);
      expect(isOnlinePaymentPaid("waiting for online payment confirmation")).toBe(false);
      expect(isOnlinePaymentPaid("failed")).toBe(false);
      expect(isOnlinePaymentPaid("cancelled")).toBe(false);
      expect(isOnlinePaymentPaid("")).toBe(false);
      expect(isOnlinePaymentPaid(null)).toBe(false);
      expect(isOnlinePaymentPaid(undefined)).toBe(false);
    });
  });

  describe("isCancelledOrRejected", () => {
    it("returns true for Cancelled and Rejected case-insensitively", () => {
      expect(isCancelledOrRejected("Cancelled")).toBe(true);
      expect(isCancelledOrRejected("CANCELLED")).toBe(true);
      expect(isCancelledOrRejected("cancelled")).toBe(true);
      expect(isCancelledOrRejected("Rejected")).toBe(true);
      expect(isCancelledOrRejected("rejected")).toBe(true);
    });

    it("returns false for active or delivered statuses", () => {
      expect(isCancelledOrRejected("Pending")).toBe(false);
      expect(isCancelledOrRejected("Preparing")).toBe(false);
      expect(isCancelledOrRejected("Ready for Pickup")).toBe(false);
      expect(isCancelledOrRejected("Delivered")).toBe(false);
    });
  });

  describe("isOrderPaymentConfirmed", () => {
    it("allows COD orders regardless of payment_status", () => {
      expect(isOrderPaymentConfirmed("cod", "pending")).toBe(true);
      expect(isOrderPaymentConfirmed("cash_on_delivery", "pending")).toBe(true);
      expect(isOrderPaymentConfirmed(undefined, "pending")).toBe(true);
    });

    it("requires PAID or COMPLETED for online payment methods", () => {
      expect(isOrderPaymentConfirmed("online", "paid")).toBe(true);
      expect(isOrderPaymentConfirmed("online", "completed")).toBe(true);
      expect(isOrderPaymentConfirmed("upi", "PAID")).toBe(true);
      expect(isOrderPaymentConfirmed("online", "processing")).toBe(false);
      expect(isOrderPaymentConfirmed("online", "pending")).toBe(false);
      expect(isOrderPaymentConfirmed("online", "waiting for confirmation")).toBe(false);
      expect(isOrderPaymentConfirmed("online", "failed")).toBe(false);
    });
  });

  describe("isCustomerActiveOrder", () => {
    it("returns true for active COD orders", () => {
      expect(
        isCustomerActiveOrder({
          status: "Accepted",
          payment_method: "cod",
          payment_status: "pending",
        })
      ).toBe(true);
      expect(
        isCustomerActiveOrder({
          status: "Preparing",
          payment_method: "cod",
          payment_status: "pending",
        })
      ).toBe(true);
    });

    it("returns true for active online orders when paid or completed", () => {
      expect(
        isCustomerActiveOrder({
          status: "Preparing",
          payment_method: "online",
          payment_status: "paid",
        })
      ).toBe(true);
      expect(
        isCustomerActiveOrder({
          status: "Accepted",
          payment_method: "online",
          payment_status: "completed",
        })
      ).toBe(true);
    });

    it("filters out unpaid processing online orders", () => {
      expect(
        isCustomerActiveOrder({
          status: "Pending",
          payment_method: "online",
          payment_status: "processing",
        })
      ).toBe(false);
      expect(
        isCustomerActiveOrder({
          status: "Pending",
          payment_method: "online",
          payment_status: "pending",
        })
      ).toBe(false);
      expect(
        isCustomerActiveOrder({
          status: "Pending",
          payment_method: "online",
          payment_status: "waiting for online payment confirmation",
        })
      ).toBe(false);
    });

    it("completely excludes CANCELLED and Rejected orders", () => {
      expect(
        isCustomerActiveOrder({
          status: "Cancelled",
          payment_method: "cod",
          payment_status: "pending",
        })
      ).toBe(false);
      expect(
        isCustomerActiveOrder({
          status: "CANCELLED",
          payment_method: "online",
          payment_status: "paid",
        })
      ).toBe(false);
      expect(
        isCustomerActiveOrder({
          status: "Rejected",
          payment_method: "online",
          payment_status: "paid",
        })
      ).toBe(false);
    });

    it("excludes terminal Delivered orders", () => {
      expect(
        isCustomerActiveOrder({
          status: "Delivered",
          payment_method: "online",
          payment_status: "paid",
        })
      ).toBe(false);
    });
  });

  describe("isRestaurantActiveOrder", () => {
    it("returns true for active prep COD orders and paid online orders", () => {
      expect(
        isRestaurantActiveOrder({
          status: "Pending",
          payment_method: "cod",
          created_at: new Date().toISOString(),
        })
      ).toBe(true);
      expect(
        isRestaurantActiveOrder({
          status: "Preparing",
          payment_method: "online",
          payment_status: "paid",
          created_at: new Date().toISOString(),
        })
      ).toBe(true);
      expect(
        isRestaurantActiveOrder({
          status: "Ready for Pickup",
          payment_method: "online",
          payment_status: "completed",
          created_at: new Date().toISOString(),
        })
      ).toBe(true);
    });

    it("completely excludes CANCELLED orders from restaurant active prep list", () => {
      expect(
        isRestaurantActiveOrder({
          status: "Cancelled",
          payment_method: "cod",
          created_at: new Date().toISOString(),
        })
      ).toBe(false);
      expect(
        isRestaurantActiveOrder({
          status: "CANCELLED",
          payment_method: "online",
          payment_status: "paid",
          created_at: new Date().toISOString(),
        })
      ).toBe(false);
    });

    it("excludes unpaid processing online orders from restaurant active prep list", () => {
      expect(
        isRestaurantActiveOrder({
          status: "Pending",
          payment_method: "online",
          payment_status: "processing",
          created_at: new Date().toISOString(),
        })
      ).toBe(false);
      expect(
        isRestaurantActiveOrder({
          status: "Pending",
          payment_method: "online",
          payment_status: "pending",
          created_at: new Date().toISOString(),
        })
      ).toBe(false);
      expect(
        isRestaurantActiveOrder({
          status: "Preparing",
          payment_method: "online",
          payment_status: "waiting for online payment confirmation",
          created_at: new Date().toISOString(),
        })
      ).toBe(false);
    });

    it("excludes stale orders (> 24 hours)", () => {
      const staleDate = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
      expect(
        isRestaurantActiveOrder({
          status: "Pending",
          payment_method: "cod",
          created_at: staleDate,
        })
      ).toBe(false);
    });
  });
});
