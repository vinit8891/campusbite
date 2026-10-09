import { describe, it, expect } from "vitest";
import {
  SUBSCRIPTION_STATUSES,
  isSubscriptionActive,
  isSubscriptionPaused,
  isSubscriptionCancelled,
  isSubscriptionExpired,
  monthKey,
  formatMonthTitle,
  buildCalendarDays,
  calculateWeeklyPlanPrice,
} from "@/lib/subscriptionDomain";

describe("subscriptionDomain utilities", () => {
  it("exports SUBSCRIPTION_STATUSES correctly", () => {
    expect(SUBSCRIPTION_STATUSES).toEqual(["active", "paused", "expired", "cancelled"]);
  });

  describe("status checks", () => {
    it("isSubscriptionActive checks active status", () => {
      expect(isSubscriptionActive("active")).toBe(true);
      expect(isSubscriptionActive("paused")).toBe(false);
      expect(isSubscriptionActive(null)).toBe(false);
    });

    it("isSubscriptionPaused checks paused status", () => {
      expect(isSubscriptionPaused("paused")).toBe(true);
      expect(isSubscriptionPaused("active")).toBe(false);
      expect(isSubscriptionPaused(undefined)).toBe(false);
    });

    it("isSubscriptionCancelled checks cancelled status", () => {
      expect(isSubscriptionCancelled("cancelled")).toBe(true);
      expect(isSubscriptionCancelled("active")).toBe(false);
    });

    it("isSubscriptionExpired checks expired status and date boundaries", () => {
      expect(isSubscriptionExpired("expired")).toBe(true);
      expect(isSubscriptionExpired("active", "2026-08-01", "2026-08-15")).toBe(true);
      expect(isSubscriptionExpired("active", "2026-08-30", "2026-08-15")).toBe(false);
      expect(isSubscriptionExpired("active", null, "2026-08-15")).toBe(false);
      expect(isSubscriptionExpired("active")).toBe(false);
    });
  });

  describe("monthKey", () => {
    it("formats Date to YYYY-MM string correctly", () => {
      const date = new Date(2026, 7, 19); // August 19, 2026 (0-indexed month)
      expect(monthKey(date)).toBe("2026-08");
    });
  });

  describe("formatMonthTitle", () => {
    it("formats YYYY-MM to human-readable month title", () => {
      const title = formatMonthTitle("2026-08");
      expect(title).toContain("August");
      expect(title).toContain("2026");
    });
  });

  describe("buildCalendarDays", () => {
    it("builds correct number of cells including offset for month", () => {
      const cells = buildCalendarDays("2026-08");
      // August has 31 days
      const daysWithData = cells.filter((c) => c.day !== null);
      expect(daysWithData.length).toBe(31);
      expect(daysWithData[0].date).toBe("2026-08-01");
      expect(daysWithData[30].date).toBe("2026-08-31");
    });
  });

  describe("calculateWeeklyPlanPrice pricing engine", () => {
    it("calculates weekly dine-in single meal pricing with platform fee", () => {
      const result = calculateWeeklyPlanPrice({
        planType: "WEEKLY",
        mealType: "lunch",
        deliveryPreference: "DINE_IN",
        baseMealPrice: 80.0,
      });

      expect(result.validityDays).toBe(7);
      expect(result.mealsCount).toBe(7);
      expect(result.baseMealPrice).toBe(80.0);
      expect(result.foodSubtotal).toBe(560.0);
      expect(result.deliveryAddon).toBe(0.0);
      expect(result.platformFee).toBe(25.0);
      expect(result.totalPrice).toBe(585.0);
      expect(result.dailyCost).toBeCloseTo(585 / 7, 2);
    });

    it("calculates weekly hostel lobby delivery pricing with strictly positive delivery addon and platform fee", () => {
      const result = calculateWeeklyPlanPrice({
        planType: "WEEKLY",
        mealType: "lunch",
        deliveryPreference: "HOSTEL_LOBBY_DELIVERY",
        baseMealPrice: 80.0,
      });

      expect(result.validityDays).toBe(7);
      expect(result.mealsCount).toBe(7);
      expect(result.foodSubtotal).toBe(560.0);
      expect(result.deliveryAddon).toBe(105.0); // 7 * 15
      expect(result.deliveryAddon).toBeGreaterThan(0);
      expect(result.platformFee).toBe(25.0);
      expect(result.platformFee).toBeGreaterThan(0);
      expect(result.totalPrice).toBe(690.0);
    });

    it("calculates weekly dual-meal (both lunch & dinner) hostel delivery pricing", () => {
      const result = calculateWeeklyPlanPrice({
        planType: "WEEKLY",
        mealType: "combo",
        deliveryPreference: "HOSTEL_LOBBY_DELIVERY",
        baseMealPrice: 80.0,
      });

      expect(result.validityDays).toBe(7);
      expect(result.mealsCount).toBe(14); // 7 days * 2 meals
      expect(result.foodSubtotal).toBe(1120.0); // 14 * 80
      expect(result.deliveryAddon).toBe(210.0); // 14 * 15
      expect(result.platformFee).toBe(25.0);
      expect(result.totalPrice).toBe(1355.0);
    });

    it("calculates monthly hostel lobby delivery pricing", () => {
      const result = calculateWeeklyPlanPrice({
        planType: "MONTHLY",
        mealType: "lunch",
        deliveryPreference: "HOSTEL_LOBBY_DELIVERY",
        baseMealPrice: 80.0,
      });

      expect(result.validityDays).toBe(30);
      expect(result.mealsCount).toBe(30);
      expect(result.foodSubtotal).toBe(2400.0);
      expect(result.deliveryAddon).toBe(450.0); // 30 * 15
      expect(result.platformFee).toBe(75.0);
      expect(result.totalPrice).toBe(2925.0);
    });
  });
});
