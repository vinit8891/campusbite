import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  calculateOrderPricing,
  calculateRiderPayout,
  calculateBatchRiderEarnings,
  MIN_DELIVERY_SUBTOTAL,
  PLATFORM_FEE_STANDARD,
  PLATFORM_FEE_SMALL_CART,
  DELIVERY_FEE_HOSTEL_BATCH,
  RIDER_BASE_PAYOUT,
  RIDER_BATCH_ADDON_PAYOUT,
} from "@/lib/orderPricing";
import {
  recordDeliveredOrderCash,
  getRiderCashReconciliation,
  canClaimOrders,
  remitRiderDues,
  MAX_UNREMITTED_CASH_LIMIT,
} from "@/services/deliveryPartnerService";

describe("End-to-End Financial & Operational Smoke Test Suite (Frontend)", () => {
  const TEST_COURIER_PHONE = "9876543210";

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Scenario 1: Cart Minimum & Takeaway Exemption", () => {
    it("asserts subtotal < ₹35 on delivery sets isBelowMinDelivery: true and blocks delivery checkout", () => {
      // Single tea / snack at ₹30.00 (< ₹35.00)
      const cartItems = [{ price: 30.0, quantity: 1 }];
      const breakdown = calculateOrderPricing(cartItems, "HOSTEL_BATCH", 0, "COD");

      expect(breakdown.food_subtotal).toBe(30.0);
      expect(breakdown.food_subtotal).toBeLessThan(MIN_DELIVERY_SUBTOTAL);
      expect(breakdown.is_below_min_delivery).toBe(true);
      expect(breakdown.isBelowMinDelivery).toBe(true);
      expect(breakdown.min_delivery_error).toBeDefined();
      expect(breakdown.min_delivery_error).toContain("Minimum cart for hostel delivery is ₹35.00");
      expect(breakdown.minDeliveryError).toContain("Minimum cart for hostel delivery is ₹35.00");
      expect(breakdown.delivery_fee).toBe(DELIVERY_FEE_HOSTEL_BATCH);
    });

    it("asserts switching the same cart to COUNTER_TAKEAWAY removes the barrier and allows checkout", () => {
      // Same ₹30.00 cart switched to Counter Takeaway
      const cartItems = [{ price: 30.0, quantity: 1 }];
      const breakdown = calculateOrderPricing(cartItems, "COUNTER_TAKEAWAY", 0, "COD");

      expect(breakdown.food_subtotal).toBe(30.0);
      expect(breakdown.is_below_min_delivery).toBe(false);
      expect(breakdown.isBelowMinDelivery).toBe(false);
      expect(breakdown.min_delivery_error).toBeUndefined();
      expect(breakdown.minDeliveryError).toBeUndefined();
      expect(breakdown.delivery_fee).toBe(0.0);
      expect(breakdown.restaurant_gst).toBe(1.5); // 5% of 30
      expect(breakdown.platform_fee).toBe(PLATFORM_FEE_SMALL_CART); // ₹5.00
      expect(breakdown.total_payable).toBe(36.5); // 30 + 1.5 + 5
    });
  });

  describe("Scenario 2: Dynamic Platform Tech Fee Tiering", () => {
    it("asserts cart with subtotal ₹42 on delivery charges dynamic Platform Tech Fee = ₹5.00 (Total: ₹64.10)", () => {
      // Subtotal ₹42 (< ₹50 threshold)
      const cartItems = [{ price: 42.0, quantity: 1 }];
      const breakdown = calculateOrderPricing(cartItems, "HOSTEL_BATCH", 0, "ONLINE");

      expect(breakdown.food_subtotal).toBe(42.0);
      expect(breakdown.platform_fee).toBe(PLATFORM_FEE_SMALL_CART); // ₹5.00
      expect(breakdown.restaurant_gst).toBe(2.1); // 5% of 42
      expect(breakdown.delivery_fee).toBe(15.0);
      expect(breakdown.total_payable).toBe(64.1); // 42 + 2.10 + 15 + 5 = 64.10
    });

    it("asserts cart with subtotal ₹98 on delivery charges dynamic Platform Tech Fee = ₹3.00 (Total: ₹120.90)", () => {
      // Subtotal ₹98 (>= ₹50 threshold)
      const cartItems = [{ price: 98.0, quantity: 1 }];
      const breakdown = calculateOrderPricing(cartItems, "HOSTEL_BATCH", 0, "ONLINE");

      expect(breakdown.food_subtotal).toBe(98.0);
      expect(breakdown.platform_fee).toBe(PLATFORM_FEE_STANDARD); // ₹3.00
      expect(breakdown.restaurant_gst).toBe(4.9); // 5% of 98
      expect(breakdown.delivery_fee).toBe(15.0);
      expect(breakdown.total_payable).toBe(120.9); // 98 + 4.90 + 15 + 3 = 120.90
    });
  });

  describe("Scenario 3: Doorstep UPI Settlement vs Cash CIH Cap", () => {
    it("asserts completing a ₹120.90 COD order via CAMPUSBITE_QR_UPI leaves courier collected_cod_cash at ₹0.00 and credits ₹20 wage", () => {
      const recon = recordDeliveredOrderCash(
        {
          total: 120.9,
          payment_method: "COD",
          collection_mode: "upi",
        },
        TEST_COURIER_PHONE,
        "upi"
      );

      // Direct digital UPI QR collection prevents physical cash accumulation
      expect(recon.total_cod_collected).toBe(0.0);
      expect(recon.cash_in_hand).toBe(0.0);
      expect(recon.total_payout_earned).toBe(RIDER_BASE_PAYOUT); // ₹20.00
      expect(recon.net_cash_due).toBe(0.0);
      expect(recon.isLocked).toBe(false);
      expect(recon.is_locked).toBe(false);

      const claimStatus = canClaimOrders(TEST_COURIER_PHONE);
      expect(claimStatus.canClaim).toBe(true);
      expect(claimStatus.isLocked).toBe(false);
    });

    it("asserts completing multiple orders via PHYSICAL_CASH accumulates CIH until reaching ₹500, which sets is_locked: true and blocks order claiming", () => {
      // Deliver 5 orders of ₹120.90 in cash
      // Cash collected: 5 * 120.90 = 604.50
      // Wages earned: 5 * 20.00 = 100.00
      // Net cash due: 604.50 - 100.00 = 504.50 (>= 500.00 limit)
      let currentRecon = getRiderCashReconciliation(TEST_COURIER_PHONE);

      for (let i = 1; i <= 5; i++) {
        currentRecon = recordDeliveredOrderCash(
          {
            total: 120.9,
            payment_method: "COD",
            collection_mode: "cash",
          },
          TEST_COURIER_PHONE,
          "cash"
        );
      }

      expect(currentRecon.total_cod_collected).toBe(604.5);
      expect(currentRecon.total_payout_earned).toBe(100.0);
      expect(currentRecon.net_cash_due).toBe(504.5);
      expect(currentRecon.isLocked).toBe(true);
      expect(currentRecon.is_locked).toBe(true);
      expect(currentRecon.lockout_reason).toContain("Cash-in-Hand limit of ₹500 exceeded");
      expect(currentRecon.excess_amount).toBe(4.5);

      const claimCheck = canClaimOrders(TEST_COURIER_PHONE);
      expect(claimCheck.canClaim).toBe(false);
      expect(claimCheck.allowed).toBe(false);
      expect(claimCheck.isLocked).toBe(true);
      expect(claimCheck.excess_amount).toBe(4.5);

      // Remit dues to unlock courier
      const updatedRecon = remitRiderDues(TEST_COURIER_PHONE, 504.5);
      expect(updatedRecon.net_cash_due).toBe(0.0);
      expect(updatedRecon.isLocked).toBe(false);
      expect(canClaimOrders(TEST_COURIER_PHONE).canClaim).toBe(true);
    });
  });

  describe("Scenario 4: Multi-Drop Batch Wage Calibration", () => {
    it("asserts a 2-order batch to the same hostel credits exactly ₹30.00 (₹20 base + ₹10 add-on) and delivery pool is 100% self-funding", () => {
      // Order 1 (Base Drop): ₹20.00
      const drop1Wage = calculateRiderPayout(false, 0);
      expect(drop1Wage).toBe(RIDER_BASE_PAYOUT); // ₹20.00

      // Order 2 (Batch Add-on Drop): ₹10.00
      const drop2Wage = calculateRiderPayout(true, 0);
      expect(drop2Wage).toBe(RIDER_BATCH_ADDON_PAYOUT); // ₹10.00

      // Combined 2-order batch payout: ₹20 + ₹10 = ₹30.00
      const totalBatchPayout = calculateBatchRiderEarnings(2, 0);
      expect(totalBatchPayout).toBe(30.0);

      // Self-funding pool economics:
      // Delivery fees collected: 2 * ₹15 = ₹30.00
      // Courier wages paid: ₹30.00
      const deliveryFeesCollected = 2 * DELIVERY_FEE_HOSTEL_BATCH;
      const deliveryPoolDifferential = deliveryFeesCollected - totalBatchPayout;
      expect(deliveryFeesCollected).toBe(30.0);
      expect(deliveryPoolDifferential).toBe(0.0); // 100% Self-funding!
    });

    it("asserts a 3-order batch credits ₹40.00 and generates a +₹5.00 delivery pool surplus", () => {
      // Combined 3-order batch payout: ₹20 + 2 * ₹10 = ₹40.00
      const totalBatchPayout = calculateBatchRiderEarnings(3, 0);
      expect(totalBatchPayout).toBe(40.0);

      // Delivery fees collected: 3 * ₹15 = ₹45.00
      // Courier wages paid: ₹40.00
      // Pool surplus: ₹45 - ₹40 = +₹5.00
      const deliveryFeesCollected = 3 * DELIVERY_FEE_HOSTEL_BATCH;
      const deliveryPoolSurplus = deliveryFeesCollected - totalBatchPayout;
      expect(deliveryFeesCollected).toBe(45.0);
      expect(deliveryPoolSurplus).toBe(5.0);
    });

    it("aggregates completed batch orders in localStorage with exact ₹20 base and ₹10 add-on tracking", () => {
      const batchId = "BATCH_TAGORE_CLUSTER_99";
      const deliveredBatchOrders = [
        {
          _id: "batch-ord-1",
          status: "Delivered",
          total: 100.0,
          payment_method: "COD",
          batch_id: batchId,
          is_batch_addon: false,
        },
        {
          _id: "batch-ord-2",
          status: "Delivered",
          total: 150.0,
          payment_method: "COD",
          batch_id: batchId,
          is_batch_addon: true,
        },
      ];

      localStorage.setItem(
        `cb_my_deliveries_${TEST_COURIER_PHONE}`,
        JSON.stringify(deliveredBatchOrders)
      );

      const recon = getRiderCashReconciliation(TEST_COURIER_PHONE);
      expect(recon.completed_deliveries).toBe(2);
      expect(recon.total_payout_earned).toBe(30.0); // ₹20 base + ₹10 add-on
      expect(recon.total_cod_collected).toBe(250.0);
      expect(recon.net_cash_due).toBe(220.0); // 250 - 30 = 220.00
    });
  });
});
