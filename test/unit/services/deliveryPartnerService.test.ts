import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateRiderEarnings,
  getRiderCashReconciliation,
  canClaimOrders,
  recordDeliveredOrderCash,
  remitRiderDues,
  MAX_UNREMITTED_CASH_LIMIT,
} from "@/services/deliveryPartnerService";
import { RIDER_BASE_PAYOUT } from "@/lib/orderPricing";

describe("deliveryPartnerService rider earnings and CIH calculations", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("calculateRiderEarnings", () => {
    it("returns flat RIDER_BASE_PAYOUT (₹20.00) when no tip is provided", () => {
      const earnings = calculateRiderEarnings({
        total: 150,
        delivery_fee: 40,
      });
      expect(earnings).toBe(20.0);
    });

    it("adds customer tips to the flat ₹20 payout", () => {
      const earnings = calculateRiderEarnings({
        total: 250,
        delivery_fee: 15,
        tip_amount: 15,
      });
      expect(earnings).toBe(35.0);
    });

    it("ignores legacy delivery_fee multipliers (e.g. 0.85)", () => {
      // Regardless of delivery_fee being ₹15 or ₹40, rider receives ₹20 flat
      const batchOrder = calculateRiderEarnings({ delivery_fee: 15 });
      const standardOrder = calculateRiderEarnings({ delivery_fee: 40 });
      expect(batchOrder).toBe(20.0);
      expect(standardOrder).toBe(20.0);
    });
  });

  describe("getRiderCashReconciliation", () => {
    it("returns zero balances by default when storage is empty", () => {
      const recon = getRiderCashReconciliation("9998887770");
      expect(recon.cash_in_hand).toBe(0);
      expect(recon.total_payout_earned).toBe(0);
      expect(recon.net_cash_due).toBe(0);
    });

    it("computes net_cash_due accurately from stored state and enforces Math.max(0, ...)", () => {
      localStorage.setItem(
        "cb_cih_9998887770",
        JSON.stringify({
          total_cod_collected: 500,
          total_payout_earned: 200,
          total_remitted: 100,
        })
      );

      const recon = getRiderCashReconciliation("9998887770");
      // cash_in_hand = 500 - 100 = 400
      expect(recon.cash_in_hand).toBe(400);
      expect(recon.total_payout_earned).toBe(200);
      // net_cash_due = Math.max(0, 500 - 200 - 100) = 200
      expect(recon.net_cash_due).toBe(200);
    });

    it("eliminates stale fractional legacy payout (e.g. 12.75 from 15*0.85) and enforces ₹20 flat", () => {
      const phone = "9998887770";
      // Simulate stale legacy cache with 12.75
      localStorage.setItem(
        `cb_cih_${phone}`,
        JSON.stringify({
          cash_in_hand: 0,
          total_payout_earned: 12.75,
          net_cash_due: 0,
          completed_deliveries: 1,
        })
      );

      const recon = getRiderCashReconciliation(phone);
      // 1 completed delivery must be exactly ₹20.00, not ₹12.75
      expect(recon.total_payout_earned).toBe(20.0);
    });

    it("dynamically recalculates wages from delivered runs and overwrites cache", () => {
      const phone = "9998887770";
      localStorage.setItem(
        `cb_my_deliveries_${phone}`,
        JSON.stringify([
          { _id: "ord-1", status: "Delivered", total: 180, payment_method: "COD", tip_amount: 5 },
          { _id: "ord-2", status: "Delivered", total: 120, payment_method: "ONLINE" },
          { _id: "ord-3", status: "Assigned", total: 90, payment_method: "COD" }, // not delivered yet
        ])
      );

      const recon = getRiderCashReconciliation(phone);
      // 2 delivered runs = 2 * 20 + 5 tip = 45
      expect(recon.completed_deliveries).toBe(2);
      expect(recon.total_payout_earned).toBe(45.0);
      // COD collected = 180 from ord-1
      expect(recon.cash_in_hand).toBe(180.0);
      // net_cash_due = Math.max(0, 180 - 45) = 135
      expect(recon.net_cash_due).toBe(135.0);
    });

    it("never returns negative net_cash_due when wages exceed collected cash", () => {
      localStorage.setItem(
        "cb_cih_9998887770",
        JSON.stringify({
          total_cod_collected: 100,
          total_payout_earned: 300,
          total_remitted: 0,
        })
      );

      const recon = getRiderCashReconciliation("9998887770");
      expect(recon.net_cash_due).toBe(0);
    });
  });

  describe("recordDeliveredOrderCash", () => {
    it("accumulates COD order cash and awards ₹20 flat payout", () => {
      const phone = "9876543210";
      const order = {
        total: 180,
        payment_method: "COD",
        tip_amount: 10,
      };

      const recon = recordDeliveredOrderCash(order, phone);
      expect(recon.cash_in_hand).toBe(180);
      // Payout = 20 base + 10 tip = 30
      expect(recon.total_payout_earned).toBe(30);
      // Net due = Math.max(0, 180 - 30) = 150
      expect(recon.net_cash_due).toBe(150);
      expect(recon.completed_deliveries).toBe(1);
    });

    it("does not increase cash_in_hand for online prepaid orders but credits ₹20 wage", () => {
      const phone = "9876543210";
      const order = {
        total: 220,
        payment_method: "ONLINE",
      };

      const recon = recordDeliveredOrderCash(order, phone);
      expect(recon.cash_in_hand).toBe(0);
      expect(recon.total_payout_earned).toBe(20);
      // Net due is Math.max(0, 0 - 20) = 0
      expect(recon.net_cash_due).toBe(0);
      expect(recon.completed_deliveries).toBe(1);
    });
  });

  describe("remitRiderDues", () => {
    it("deducts remittance from dues and updates cash_in_hand", () => {
      const phone = "9876543210";

      // 1. Deliver 2 COD orders of ₹200 each (total ₹400 cash, ₹40 wages -> ₹360 dues)
      recordDeliveredOrderCash({ total: 200, payment_method: "COD" }, phone);
      const afterTwo = recordDeliveredOrderCash(
        { total: 200, payment_method: "COD" },
        phone
      );
      expect(afterTwo.cash_in_hand).toBe(400);
      expect(afterTwo.total_payout_earned).toBe(40);
      expect(afterTwo.net_cash_due).toBe(360);

      // 2. Remit ₹200
      const afterRemit = remitRiderDues(phone, 200);
      expect(afterRemit.cash_in_hand).toBe(200);
      expect(afterRemit.total_remitted).toBe(200);
      // net_cash_due = Math.max(0, 400 - 40 - 200) = 160
      expect(afterRemit.net_cash_due).toBe(160);

      // 3. Remit remaining ₹160
      const cleared = remitRiderDues(phone, 160);
      expect(cleared.cash_in_hand).toBe(40);
      expect(cleared.total_remitted).toBe(360);
      // net_cash_due = Math.max(0, 400 - 40 - 360) = 0
      expect(cleared.net_cash_due).toBe(0);
    });
  });

  describe("₹500 Courier Cash-in-Hand (CIH) Hard Lockout", () => {
    it("exports canonical MAX_UNREMITTED_CASH_LIMIT as ₹500.00", () => {
      expect(MAX_UNREMITTED_CASH_LIMIT).toBe(500.0);
    });

    it("allows rider with ₹480 dues to claim orders (NOT locked out)", () => {
      const phone = "9111222333";
      localStorage.setItem(
        `cb_cih_${phone}`,
        JSON.stringify({
          total_cod_collected: 500,
          total_payout_earned: 20,
          net_cash_due: 480,
          completed_deliveries: 1,
        })
      );

      const recon = getRiderCashReconciliation(phone);
      expect(recon.net_cash_due).toBe(480.0);
      expect(recon.isLocked).toBe(false);
      expect(recon.is_locked).toBe(false);
      expect(recon.excess_amount).toBe(0);
      expect(recon.lockout_reason).toBeUndefined();

      const claimCheck = canClaimOrders(phone);
      expect(claimCheck.allowed).toBe(true);
      expect(claimCheck.reason).toBeUndefined();
    });

    it("locks out rider with ₹500 dues and order claim returns false", () => {
      const phone = "9222333444";
      localStorage.setItem(
        `cb_cih_${phone}`,
        JSON.stringify({
          total_cod_collected: 540,
          total_payout_earned: 40,
          net_cash_due: 500,
          completed_deliveries: 2,
        })
      );

      const recon = getRiderCashReconciliation(phone);
      expect(recon.net_cash_due).toBe(500.0);
      expect(recon.isLocked).toBe(true);
      expect(recon.is_locked).toBe(true);
      expect(recon.lockout_reason).toBe(
        "Cash-in-Hand limit of ₹500 exceeded. Remit pending cash via UPI to unlock order claiming."
      );
      expect(recon.excess_amount).toBe(0);

      const claimCheck = canClaimOrders(phone);
      expect(claimCheck.allowed).toBe(false);
      expect(claimCheck.reason).toBe(
        "Cash-in-Hand limit of ₹500 exceeded. Remit pending cash via UPI to unlock order claiming."
      );
    });

    it("calculates excess_amount when dues exceed ₹500", () => {
      const phone = "9333444555";
      localStorage.setItem(
        `cb_cih_${phone}`,
        JSON.stringify({
          total_cod_collected: 600,
          total_payout_earned: 20,
          net_cash_due: 580,
          completed_deliveries: 1,
        })
      );

      const recon = getRiderCashReconciliation(phone);
      expect(recon.net_cash_due).toBe(580.0);
      expect(recon.isLocked).toBe(true);
      expect(recon.excess_amount).toBe(80.0);
    });

    it("restores active claim permissions upon partial remittance reducing dues below ₹500", () => {
      const phone = "9444555666";

      // Rider delivers ₹540 COD with ₹40 earnings -> ₹500 net dues -> locked
      recordDeliveredOrderCash({ total: 270, payment_method: "COD" }, phone);
      const lockedRecon = recordDeliveredOrderCash(
        { total: 270, payment_method: "COD" },
        phone
      );
      expect(lockedRecon.net_cash_due).toBe(500.0);
      expect(lockedRecon.isLocked).toBe(true);
      expect(canClaimOrders(phone).allowed).toBe(false);

      // Rider remits partial amount ₹100 via UPI (UTR ref)
      const afterPartialRemit = remitRiderDues(phone, 100, "UTR123456789");
      expect(afterPartialRemit.net_cash_due).toBe(400.0);
      expect(afterPartialRemit.isLocked).toBe(false);
      expect(afterPartialRemit.is_locked).toBe(false);
      expect(afterPartialRemit.excess_amount).toBe(0);

      // Verify active claim permissions are immediately restored
      const restoredCheck = canClaimOrders(phone);
      expect(restoredCheck.allowed).toBe(true);
      expect(restoredCheck.reason).toBeUndefined();
    });
  });
});
