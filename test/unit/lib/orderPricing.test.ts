import { describe, it, expect } from "vitest";
import {
  calculateOrderPricing,
  MIN_DELIVERY_SUBTOTAL,
  SMALL_ORDER_THRESHOLD,
  SMALL_ORDER_FEE,
  RESTAURANT_COMMISSION_RATE,
  FOOD_GST_RATE,
  DELIVERY_FEE_HOSTEL_BATCH,
  DELIVERY_FEE_STANDARD,
} from "@/lib/orderPricing";
import {
  calculateCheckoutPricing,
  getCalibratedAppPrice,
  MIN_DELIVERY_SUBTOTAL as ENGINE_MIN_DELIVERY,
  SMALL_ORDER_THRESHOLD as ENGINE_SMALL_ORDER_THRESHOLD,
  SMALL_ORDER_FEE as ENGINE_SMALL_ORDER_FEE,
} from "@/lib/pricingEngine";

describe("orderPricing and pricingEngine thresholds & calculations", () => {
  it("exports canonical threshold constants with correct values", () => {
    expect(MIN_DELIVERY_SUBTOTAL).toBe(35.0);
    expect(SMALL_ORDER_THRESHOLD).toBe(50.0);
    expect(SMALL_ORDER_FEE).toBe(5.0);
    expect(ENGINE_MIN_DELIVERY).toBe(35.0);
    expect(ENGINE_SMALL_ORDER_THRESHOLD).toBe(50.0);
    expect(ENGINE_SMALL_ORDER_FEE).toBe(5.0);
  });

  describe("calculateOrderPricing", () => {
    it("blocks delivery checkout when cart subtotal is below ₹35", () => {
      // Single item with price ₹20
      const items = [{ price: 20, quantity: 1 }];
      const breakdown = calculateOrderPricing(items, "HOSTEL_BATCH");

      expect(breakdown.food_subtotal).toBe(20.0);
      expect(breakdown.is_below_min_delivery).toBe(true);
      expect(breakdown.isBelowMinDelivery).toBe(true);
      expect(breakdown.min_delivery_error).toBe(
        "Minimum cart for hostel delivery is ₹35.00. Add items or switch to Counter Takeaway."
      );
      expect(breakdown.minDeliveryError).toBe(
        "Minimum cart for hostel delivery is ₹35.00. Add items or switch to Counter Takeaway."
      );
      expect(breakdown.small_order_fee).toBe(0.0);
    });

    it("permits takeaway when cart is below ₹35 without surcharge fees", () => {
      const items = [{ price: 20, quantity: 1 }];
      const breakdown = calculateOrderPricing(items, "COUNTER_TAKEAWAY");

      expect(breakdown.food_subtotal).toBe(20.0);
      expect(breakdown.is_below_min_delivery).toBe(false);
      expect(breakdown.isBelowMinDelivery).toBe(false);
      expect(breakdown.min_delivery_error).toBeUndefined();
      expect(breakdown.delivery_fee).toBe(0.0);
      expect(breakdown.platform_fee).toBe(3.0);
      expect(breakdown.small_order_fee).toBe(0.0);
      // Food GST (5% of 20 = 1.00) + Subtotal (20) + Tech fee (3) = 24.00
      expect(breakdown.total_payable).toBe(24.0);
    });

    it("applies ₹5 small order fee when delivery cart is ₹35 to ₹49.99", () => {
      const items = [{ price: 35, quantity: 1 }];
      const breakdown = calculateOrderPricing(items, "HOSTEL_BATCH", 0, "COD");

      expect(breakdown.food_subtotal).toBe(35.0);
      expect(breakdown.is_below_min_delivery).toBe(false);
      expect(breakdown.small_order_fee).toBe(5.0);
      expect(breakdown.restaurant_gst).toBe(1.75); // 5% of 35
      expect(breakdown.delivery_fee).toBe(15.0);
      expect(breakdown.platform_fee).toBe(3.0); // <= 100 subtotal
      // Total = 35 + 1.75 + 15 + 3 + 5 = 59.75
      expect(breakdown.total_payable).toBe(59.75);
    });

    it("removes ₹5 small order fee when delivery cart reaches ₹50.00", () => {
      const items = [{ price: 50, quantity: 1 }];
      const breakdown = calculateOrderPricing(items, "HOSTEL_BATCH", 0, "COD");

      expect(breakdown.food_subtotal).toBe(50.0);
      expect(breakdown.is_below_min_delivery).toBe(false);
      expect(breakdown.small_order_fee).toBe(0.0);
      expect(breakdown.restaurant_gst).toBe(2.5); // 5% of 50
      expect(breakdown.delivery_fee).toBe(15.0);
      expect(breakdown.platform_fee).toBe(3.0);
      // Total = 50 + 2.5 + 15 + 3 + 0 = 70.50
      expect(breakdown.total_payable).toBe(70.5);
    });

    it("correctly includes tip and calculates net platform profit with small order surcharge", () => {
      const items = [{ price: 40, quantity: 1 }];
      const tipAmount = 10.0;
      const breakdown = calculateOrderPricing(items, "HOSTEL_BATCH", tipAmount, "ONLINE");

      expect(breakdown.small_order_fee).toBe(5.0);
      expect(breakdown.tip_amount).toBe(10.0);
      // Total = 40 + 2.0 (gst) + 15 (del) + 3 (tech) + 5 (small order) + 10 (tip) = 75.00
      expect(breakdown.total_payable).toBe(75.0);
      // Commission 18% of 40 = 7.20
      expect(breakdown.commission_amount).toBe(7.2);
    });
  });

  describe("calculateCheckoutPricing (pricingEngine)", () => {
    it("flags isBelowMinDelivery for delivery mode when calibrated subtotal is < ₹35", () => {
      // Counter item ₹20 -> Calibrated App Price = ceil(20 / 0.82) = 25
      const items = [{ id: "tea", name: "Tea", counterPrice: 20, quantity: 1 }];
      const breakdown = calculateCheckoutPricing(items, "HOSTEL_BATCH");

      expect(breakdown.appSubtotal).toBe(25.0);
      expect(breakdown.isBelowMinDelivery).toBe(true);
      expect(breakdown.minDeliveryError).toBe(
        "Minimum cart for hostel delivery is ₹35.00. Add items or switch to Counter Takeaway."
      );
      expect(breakdown.smallOrderFee).toBe(0.0);
    });

    it("allows Counter Takeaway when subtotal is < ₹35 without restrictions", () => {
      const items = [{ id: "tea", name: "Tea", counterPrice: 20, quantity: 1 }];
      const breakdown = calculateCheckoutPricing(items, "COUNTER_TAKEAWAY");

      expect(breakdown.appSubtotal).toBe(25.0);
      expect(breakdown.isBelowMinDelivery).toBe(false);
      expect(breakdown.minDeliveryError).toBeUndefined();
      expect(breakdown.deliveryFee).toBe(0.0);
      expect(breakdown.platformTechFee).toBe(3.0);
      expect(breakdown.smallOrderFee).toBe(0.0);
      expect(breakdown.totalStudentPayable).toBe(29.25); // 25 + 1.25 (gst) + 3 (tech)
    });

    it("applies ₹5 small order surcharge when subtotal is between ₹35 and ₹49.99", () => {
      // Counter item ₹30 -> Calibrated App Price = ceil(30 / 0.82) = 37
      const items = [{ id: "samosa", name: "Samosa", counterPrice: 30, quantity: 1 }];
      const breakdown = calculateCheckoutPricing(items, "HOSTEL_BATCH");

      expect(breakdown.appSubtotal).toBe(37.0);
      expect(breakdown.isBelowMinDelivery).toBe(false);
      expect(breakdown.smallOrderFee).toBe(5.0);
      // gst = 5% of 37 = 1.85, delivery = 15, tech = 5, small_order = 5
      // total = 37 + 1.85 + 5 + 15 + 5 = 63.85
      expect(breakdown.totalStudentPayable).toBe(63.85);
    });

    it("waives ₹5 small order surcharge when subtotal reaches ₹50.00", () => {
      // Counter item ₹41 -> Calibrated App Price = ceil(41 / 0.82) = 50
      const items = [{ id: "meal", name: "Meal", counterPrice: 41, quantity: 1 }];
      const breakdown = calculateCheckoutPricing(items, "HOSTEL_BATCH");

      expect(breakdown.appSubtotal).toBe(50.0);
      expect(breakdown.isBelowMinDelivery).toBe(false);
      expect(breakdown.smallOrderFee).toBe(0.0);
      // gst = 5% of 50 = 2.50, delivery = 15, tech = 5, small_order = 0
      // total = 50 + 2.50 + 5 + 15 + 0 = 72.50
      expect(breakdown.totalStudentPayable).toBe(72.5);
    });
  });
});
