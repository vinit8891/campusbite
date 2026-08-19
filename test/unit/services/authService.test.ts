import { describe, it, expect } from "vitest";
import {
  loginCustomer,
  registerCustomer,
} from "@/services/authService";

describe("authService", () => {
  it("loginCustomer sends credentials and receives access token", async () => {
    const res = await loginCustomer({ email: "student@campus.edu", password: "password123" });
    expect(res.access_token).toBe("mock-customer-token");
    expect(res.token_type).toBe("bearer");
  });

  it("registerCustomer sends payload and receives message", async () => {
    const res = await registerCustomer({
      full_name: "Alice Smith",
      email: "alice@campus.edu",
      phone: "9876543210",
      password: "password123",
    });
    expect(res.message).toBe("Customer registered successfully");
  });
});
