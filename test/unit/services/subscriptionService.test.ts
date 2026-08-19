import { describe, it, expect } from "vitest";
import {
  getMySubscriptions,
  getSubscriptionSummary,
  getMySubscriptionPayments,
} from "@/services/subscriptionService";

describe("subscriptionService", () => {
  it("getMySubscriptions fetches active customer subscriptions", async () => {
    const subscriptions = await getMySubscriptions();
    expect(Array.isArray(subscriptions)).toBe(true);
    expect(subscriptions.length).toBe(1);
    expect(subscriptions[0].meal_type).toBe("Lunch");
  });

  it("getSubscriptionSummary fetches customer dashboard overview metrics", async () => {
    const summary = await getSubscriptionSummary();
    expect(summary).toBeDefined();
    expect(summary.today_meal).toBeDefined();
  });

  it("getMySubscriptionPayments fetches payment history", async () => {
    const payments = await getMySubscriptionPayments();
    expect(payments.items).toEqual([]);
    expect(payments.total).toBe(0);
  });
});
