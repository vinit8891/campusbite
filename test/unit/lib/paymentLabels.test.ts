import { describe, it, expect } from "vitest";
import {
  COD_PAYMENT_METHOD,
  ONLINE_PAYMENT_METHOD,
  isCodPayment,
  isOnlinePayment,
  formatPaymentMethod,
  formatPaymentStatus,
  isPaymentPaid,
  isPaymentFailed,
} from "@/lib/paymentLabels";

describe("paymentLabels utilities", () => {
  it("exports payment method constants", () => {
    expect(COD_PAYMENT_METHOD).toBe("cod");
    expect(ONLINE_PAYMENT_METHOD).toBe("online");
  });

  describe("isCodPayment & isOnlinePayment", () => {
    it("identifies COD variations", () => {
      expect(isCodPayment("cod")).toBe(true);
      expect(isCodPayment("COD")).toBe(true);
      expect(isCodPayment("cash_on_delivery")).toBe(true);
      expect(isCodPayment("cash on delivery")).toBe(true);
      expect(isCodPayment("")).toBe(true); // default fallback is true
      expect(isCodPayment(null)).toBe(true);
    });

    it("identifies online payment variations", () => {
      expect(isOnlinePayment("online")).toBe(true);
      expect(isOnlinePayment("ONLINE_PAYMENT")).toBe(true);
      expect(isOnlinePayment("razorpay")).toBe(true);
      expect(isOnlinePayment("upi")).toBe(true);
      expect(isOnlinePayment("card")).toBe(true);
      expect(isOnlinePayment("cod")).toBe(false);
      expect(isOnlinePayment(null)).toBe(false);
    });
  });

  describe("formatPaymentMethod", () => {
    it("formats human-readable labels", () => {
      expect(formatPaymentMethod("online")).toBe("Online Payment");
      expect(formatPaymentMethod("razorpay")).toBe("Online Payment");
      expect(formatPaymentMethod("cod")).toBe("Cash on Delivery (COD)");
      expect(formatPaymentMethod(null)).toBe("Cash on Delivery (COD)");
    });
  });

  describe("formatPaymentStatus", () => {
    it("formats COD payment statuses correctly", () => {
      expect(formatPaymentStatus("pending", "cod")).toBe("Pending — pay on delivery");
      expect(formatPaymentStatus("paid", "cod")).toBe("Paid (Cash)");
      expect(formatPaymentStatus("completed", "cod")).toBe("Paid (Cash)");
      expect(formatPaymentStatus("pending", "cod", "delivered")).toBe("Paid (Cash)");
      expect(formatPaymentStatus("pending", "cod", "Out for Delivery")).toBe("Pending — pay on delivery");
    });

    it("formats online gateway payment statuses correctly", () => {
      expect(formatPaymentStatus("paid", "online")).toBe("Paid");
      expect(formatPaymentStatus("processing", "online")).toBe("Processing");
      expect(formatPaymentStatus("failed", "online")).toBe("Failed");
      expect(formatPaymentStatus("cancelled", "online")).toBe("Cancelled");
      expect(formatPaymentStatus("refunded", "online")).toBe("Refunded");
      expect(formatPaymentStatus("partially_refunded", "online")).toBe("Partially refunded");
      expect(formatPaymentStatus("custom", "online")).toBe("custom");
    });
  });

  describe("isPaymentPaid & isPaymentFailed", () => {
    it("detects paid state", () => {
      expect(isPaymentPaid("paid")).toBe(true);
      expect(isPaymentPaid("PAID ")).toBe(true);
      expect(isPaymentPaid("pending")).toBe(false);
      expect(isPaymentPaid(null)).toBe(false);
    });

    it("detects failed state", () => {
      expect(isPaymentFailed("failed")).toBe(true);
      expect(isPaymentFailed("payment_failed")).toBe(true);
      expect(isPaymentFailed("cancelled")).toBe(true);
      expect(isPaymentFailed("paid")).toBe(false);
      expect(isPaymentFailed(null)).toBe(false);
    });
  });
});
