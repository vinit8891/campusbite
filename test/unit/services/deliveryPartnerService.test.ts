import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateRiderEarnings,
  getRiderCashReconciliation,
  recordDeliveredOrderCash,
  remitRiderDues,
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
});
