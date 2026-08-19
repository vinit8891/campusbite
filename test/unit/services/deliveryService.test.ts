import { describe, it, expect } from "vitest";
import {
  getAvailableOrders,
  getMyDeliveries,
  getOrderOTP,
} from "@/services/deliveryService";

describe("deliveryService", () => {
  it("getAvailableOrders fetches available pickup orders", async () => {
    const res = await getAvailableOrders();
    expect(res.items.length).toBe(1);
    expect(res.items[0].status).toBe("Ready for Pickup");
  });

  it("getMyDeliveries fetches active deliveries for partner phone", async () => {
    const deliveries = await getMyDeliveries("9876543210");
    expect(Array.isArray(deliveries)).toBe(true);
    expect(deliveries.length).toBe(1);
  });

  it("getOrderOTP fetches OTP for order", async () => {
    const otp = await getOrderOTP("order-1");
    expect(otp.otp).toBe(4567);
    expect(otp.verified).toBe(false);
  });

  it("getOrderOTP throws error if orderId is missing", async () => {
    await expect(getOrderOTP("")).rejects.toThrow("Invalid Order ID");
  });
});
