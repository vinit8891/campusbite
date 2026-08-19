import { describe, it, expect } from "vitest";
import { getAdminStats, getBackendHealth } from "@/services/adminService";

describe("adminService", () => {
  it("getAdminStats fetches administrative metrics", async () => {
    const stats = await getAdminStats();
    expect(stats.users).toBe(120);
    expect(stats.restaurants).toBe(12);
    expect(stats.orders).toBe(540);
  });

  it("getBackendHealth performs unauthenticated health check", async () => {
    const health = await getBackendHealth();
    expect(health.status).toBe("ok");
    expect(health.app_name).toBe("CampusBite");
  });
});
