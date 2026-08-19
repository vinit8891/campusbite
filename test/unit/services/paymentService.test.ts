import { describe, it, expect } from "vitest";
import {
  getRazorpayConfig,
  createRazorpayPayment,
  verifyRazorpayPayment,
} from "@/services/paymentService";

describe("paymentService", () => {
  it("getRazorpayConfig fetches public razorpay configuration", async () => {
    const config = await getRazorpayConfig();
    expect(config.key_id).toBe("rzp_test_123");
    expect(config.enabled).toBe(true);
  });

  it("createRazorpayPayment initiates order creation on server", async () => {
    const payment = await createRazorpayPayment("order-1", 250);
    expect(payment.razorpay_order_id).toBe("order_rzp_123");
    expect(payment.amount).toBe(25000);
  });

  it("verifyRazorpayPayment sends verification signature", async () => {
    const res = await verifyRazorpayPayment({
      order_id: "order-1",
      razorpay_order_id: "order_rzp_123",
      razorpay_payment_id: "pay_123",
      razorpay_signature: "sig_abc",
    });
    expect(res.success).toBe(true);
  });
});
