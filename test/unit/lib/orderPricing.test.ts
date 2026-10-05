import { describe, it, expect } from "vitest";
import {
  calculateOrderPricing,
  MIN_DELIVERY_SUBTOTAL,
  SMALL_CART_THRESHOLD,
  PLATFORM_FEE_STANDARD,
  PLATFORM_FEE_SMALL_CART,
  RESTAURANT_COMMISSION_RATE,
  FOOD_GST_RATE,
  DELIVERY_FEE_HOSTEL_BATCH,
  DELIVERY_FEE_STANDARD,
} from "@/lib/orderPricing";
import {
  calculateCheckoutPricing,
  getCalibratedAppPrice,
  PLATFORM_FEE_STANDARD as ENGINE_PLATFORM_FEE_STANDARD,
  PLATFORM_FEE_SMALL_CART as ENGINE_PLATFORM_FEE_SMALL_CART,
  MIN_DELIVERY_SUBTOTAL as ENGINE_MIN_DELIVERY,
  SMALL_CART_THRESHOLD as ENGINE_SMALL_CART_THRESHOLD,
} from "@/lib/pricingEngine";

describe("orderPricing and pricingEngine thresholds & calculations", () => {
  it("exports canonical threshold and dynamic platform fee constants with correct values", () => {
    expect(MIN_DELIVERY_SUBTOTAL).toBe(35.0);
    expect(SMALL_CART_THRESHOLD).toBe(50.0);
    expect(PLATFORM_FEE_STANDARD).toBe(3.0);
    expect(PLATFORM_FEE_SMALL_CART).toBe(5.0);
    expect(ENGINE_MIN_DELIVERY).toBe(35.0);
    expect(ENGINE_SMALL_CART_THRESHOLD).toBe(50.0);
    expect(ENGINE_PLATFORM_FEE_STANDARD).toBe(3.0);
    expect(ENGINE_PLATFORM_FEE_SMALL_CART).toBe(5.0);
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
      expect(breakdown.platform_fee).toBe(5.0); // subtotal 20 < 50
      expect(breakdown.fee_name).toBe("Platform Tech Fee");
    });

    it("permits takeaway when cart is below ₹35 with dynamic ₹5 tech fee (< ₹50) and zero delivery fee", () => {
      const items = [{ price: 20, quantity: 1 }];
      const breakdown = calculateOrderPricing(items, "COUNTER_TAKEAWAY");

      expect(breakdown.food_subtotal).toBe(20.0);
      expect(breakdown.is_below_min_delivery).toBe(false);
      expect(breakdown.isBelowMinDelivery).toBe(false);
      expect(breakdown.min_delivery_error).toBeUndefined();
      expect(breakdown.delivery_fee).toBe(0.0);
      expect(breakdown.platform_fee).toBe(5.0); // subtotal 20 < 50
      expect(breakdown.fee_name).toBe("Platform Tech Fee");
      expect(breakdown.small_order_fee).toBe(0.0);
      // Food GST (5% of 20 = 1.00) + Subtotal (20) + Tech fee (5) = 26.00
      expect(breakdown.total_payable).toBe(26.0);
    });

    it("charges ₹5.00 Platform Tech Fee and zero separate small order surcharge when delivery cart is ₹35 to ₹49.99", () => {
      const items = [{ price: 35, quantity: 1 }];
      const breakdown = calculateOrderPricing(items, "HOSTEL_BATCH", 0, "COD");

      expect(breakdown.food_subtotal).toBe(35.0);
      expect(breakdown.is_below_min_delivery).toBe(false);
      expect(breakdown.small_order_fee).toBe(0.0);
      expect(breakdown.restaurant_gst).toBe(1.75); // 5% of 35
      expect(breakdown.delivery_fee).toBe(15.0);
      expect(breakdown.platform_fee).toBe(5.0); // ₹5 for small cart < 50
      // Total = 35 + 1.75 + 15 + 5 = 56.75
      expect(breakdown.total_payable).toBe(56.75);
    });

    it("charges ₹3.00 Platform Tech Fee when delivery cart reaches ₹50.00", () => {
      const items = [{ price: 50, quantity: 1 }];
      const breakdown = calculateOrderPricing(items, "HOSTEL_BATCH", 0, "COD");

      expect(breakdown.food_subtotal).toBe(50.0);
      expect(breakdown.is_below_min_delivery).toBe(false);
      expect(breakdown.small_order_fee).toBe(0.0);
      expect(breakdown.restaurant_gst).toBe(2.5); // 5% of 50
      expect(breakdown.delivery_fee).toBe(15.0);
      expect(breakdown.platform_fee).toBe(3.0); // ₹3 for cart >= 50
      // Total = 50 + 2.5 + 15 + 3 = 70.50
      expect(breakdown.total_payable).toBe(70.5);
    });

    it("calculates Veg Thali delivery vs takeaway exact totals dynamically", () => {
      const vegThali = [{ price: 98, quantity: 1 }];

      // 1. Delivery: ₹98 food + ₹4.90 GST + ₹15 delivery + ₹3 tech = ₹120.90
      const deliveryOrder = calculateOrderPricing(vegThali, "HOSTEL_BATCH", 0, "ONLINE");
      expect(deliveryOrder.food_subtotal).toBe(98.0);
      expect(deliveryOrder.restaurant_gst).toBe(4.90);
      expect(deliveryOrder.delivery_fee).toBe(15.0);
      expect(deliveryOrder.platform_fee).toBe(3.0);
      expect(deliveryOrder.small_order_fee).toBe(0.0);
      expect(deliveryOrder.total_payable).toBe(120.90);

      // 2. Takeaway: ₹98 food + ₹4.90 GST + ₹0 delivery + ₹3 tech = ₹105.90
      const takeawayOrder = calculateOrderPricing(vegThali, "COUNTER_TAKEAWAY", 0, "ONLINE");
      expect(takeawayOrder.food_subtotal).toBe(98.0);
      expect(takeawayOrder.restaurant_gst).toBe(4.90);
      expect(takeawayOrder.delivery_fee).toBe(0.0);
      expect(takeawayOrder.platform_fee).toBe(3.0);
      expect(takeawayOrder.small_order_fee).toBe(0.0);
      expect(takeawayOrder.total_payable).toBe(105.90);
    });

    it("verifies a ₹40 delivery order charges ₹5.00 Platform Tech Fee (total: ₹62.00)", () => {
      const items = [{ price: 40, quantity: 1 }];
      const breakdown = calculateOrderPricing(items, "HOSTEL_BATCH", 0, "ONLINE");

      expect(breakdown.food_subtotal).toBe(40.0);
      expect(breakdown.restaurant_gst).toBe(2.0); // 5% of 40
      expect(breakdown.delivery_fee).toBe(15.0);
      expect(breakdown.platform_fee).toBe(5.0); // 40 < 50
      expect(breakdown.small_order_fee).toBe(0.0);
      // Total = 40 + 2 + 15 + 5 = 62.00
      expect(breakdown.total_payable).toBe(62.0);
      // Commission 18% of 40 = 7.20
      expect(breakdown.commission_amount).toBe(7.2);
    });

    it("correctly includes tip and calculates net platform profit", () => {
      const items = [{ price: 40, quantity: 1 }];
      const tipAmount = 10.0;
      const breakdown = calculateOrderPricing(items, "HOSTEL_BATCH", tipAmount, "ONLINE");

      expect(breakdown.small_order_fee).toBe(0.0);
      expect(breakdown.tip_amount).toBe(10.0);
      expect(breakdown.platform_fee).toBe(5.0);
      // Total = 40 + 2.0 (gst) + 15 (del) + 5 (tech) + 10 (tip) = 72.00
      expect(breakdown.total_payable).toBe(72.0);
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
      expect(breakdown.platformTechFee).toBe(5.0); // 25 < 50
    });

    it("allows Counter Takeaway when subtotal is < ₹35 without restrictions", () => {
      const items = [{ id: "tea", name: "Tea", counterPrice: 20, quantity: 1 }];
      const breakdown = calculateCheckoutPricing(items, "COUNTER_TAKEAWAY");

      expect(breakdown.appSubtotal).toBe(25.0);
      expect(breakdown.isBelowMinDelivery).toBe(false);
      expect(breakdown.minDeliveryError).toBeUndefined();
      expect(breakdown.deliveryFee).toBe(0.0);
      expect(breakdown.platformTechFee).toBe(5.0); // 25 < 50
      expect(breakdown.smallOrderFee).toBe(0.0);
      expect(breakdown.totalStudentPayable).toBe(31.25); // 25 + 1.25 (gst) + 5 (tech)
    });

    it("charges ₹5 dynamic platform fee when subtotal is between ₹35 and ₹49.99", () => {
      // Counter item ₹30 -> Calibrated App Price = ceil(30 / 0.82) = 37
      const items = [{ id: "samosa", name: "Samosa", counterPrice: 30, quantity: 1 }];
      const breakdown = calculateCheckoutPricing(items, "HOSTEL_BATCH");

      expect(breakdown.appSubtotal).toBe(37.0);
      expect(breakdown.isBelowMinDelivery).toBe(false);
      expect(breakdown.smallOrderFee).toBe(0.0);
      expect(breakdown.platformTechFee).toBe(5.0);
      // gst = 5% of 37 = 1.85, delivery = 15, tech = 5
      // total = 37 + 1.85 + 5 + 15 = 58.85
      expect(breakdown.totalStudentPayable).toBe(58.85);
    });

    it("charges ₹3 dynamic platform fee when subtotal reaches ₹50.00", () => {
      // Counter item ₹41 -> Calibrated App Price = ceil(41 / 0.82) = 50
      const items = [{ id: "meal", name: "Meal", counterPrice: 41, quantity: 1 }];
      const breakdown = calculateCheckoutPricing(items, "HOSTEL_BATCH");

      expect(breakdown.appSubtotal).toBe(50.0);
      expect(breakdown.isBelowMinDelivery).toBe(false);
      expect(breakdown.smallOrderFee).toBe(0.0);
      expect(breakdown.platformTechFee).toBe(3.0);
      // gst = 5% of 50 = 2.50, delivery = 15, tech = 3
      // total = 50 + 2.50 + 3 + 15 = 70.50
      expect(breakdown.totalStudentPayable).toBe(70.5);
    });
  });
});
