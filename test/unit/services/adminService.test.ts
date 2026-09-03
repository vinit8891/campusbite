import { describe, it, expect } from "vitest";
import {
  getAdminStats,
  getAdminAnalytics,
  deleteUser,
  getBackendHealth,
} from "@/services/adminService";

describe("adminService", () => {
  it("getAdminStats fetches administrative metrics", async () => {
    const stats = await getAdminStats();
    expect(stats.users).toBe(120);
    expect(stats.restaurants).toBe(12);
    expect(stats.orders).toBe(540);
  });

  it("getAdminAnalytics fetches platform financial metrics", async () => {
    const analytics = await getAdminAnalytics();
    expect(analytics.total_revenue).toBe(65400.0);
    expect(analytics.platform_earnings).toBe(5800.0);
    expect(analytics.total_orders).toBe(540);
    expect(analytics.restaurant_settlements).toBe(48000.0);
    expect(analytics.courier_payouts).toBe(8100.0);
    expect(analytics.gst_pool).toBe(3500.0);
    expect(analytics.average_order_value).toBe(121.11);
  });

  it("deleteUser sends delete request with user id and optional role", async () => {
    const res = await deleteUser("user_123", "customers");
    expect(res.success).toBe(true);
    expect(res.message).toBe("User deleted successfully");
  });

  it("getBackendHealth performs unauthenticated health check", async () => {
    const health = await getBackendHealth();
    expect(health.status).toBe("ok");
    expect(health.app_name).toBe("CampusBite");
  });
});
