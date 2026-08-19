import { describe, it, expect, beforeEach } from "vitest";
import {
  AUTH_STORAGE_KEYS,
  decodeJwtPayload,
  getTokenForRole,
  clearAuthForRole,
  getLoginPath,
  getRestaurantOwnerEmail,
  getDeliveryPartnerSession,
  getCustomerPhone,
} from "@/lib/authTokens";
import { ROUTES } from "@/lib/routes";

describe("authTokens utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("decodeJwtPayload", () => {
    it("decodes a valid JWT payload", () => {
      const token = "header.eyJlbWFpbCI6InVzZXJAdGVzdC5jb20iLCJzdWIiOiIxMjMifQ.signature";
      const payload = decodeJwtPayload(token);
      expect(payload).toEqual({ email: "user@test.com", sub: "123" });
    });

    it("returns null for malformed tokens or invalid json", () => {
      expect(decodeJwtPayload("invalid-token")).toBe(null);
      expect(decodeJwtPayload("")).toBe(null);
      expect(decodeJwtPayload("a.badbase64.c")).toBe(null);
    });
  });

  describe("getTokenForRole & clearAuthForRole", () => {
    it("manages customer tokens in localStorage", () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.customerToken, "token-123");
      localStorage.setItem(AUTH_STORAGE_KEYS.customerUser, JSON.stringify({ name: "Alice" }));

      expect(getTokenForRole("customer")).toBe("token-123");
      clearAuthForRole("customer");
      expect(getTokenForRole("customer")).toBe(null);
      expect(localStorage.getItem(AUTH_STORAGE_KEYS.customerUser)).toBe(null);
    });

    it("manages restaurant owner tokens", () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.restaurantToken, "rest-tok");
      localStorage.setItem(AUTH_STORAGE_KEYS.restaurantOwner, JSON.stringify({ name: "Chef" }));
      expect(getTokenForRole("restaurant_owner")).toBe("rest-tok");
      clearAuthForRole("restaurant_owner");
      expect(getTokenForRole("restaurant_owner")).toBe(null);
      expect(localStorage.getItem(AUTH_STORAGE_KEYS.restaurantOwner)).toBe(null);
    });

    it("manages delivery partner tokens", () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.deliveryToken, "del-tok");
      localStorage.setItem(AUTH_STORAGE_KEYS.deliveryPartner, JSON.stringify({ name: "Ramesh" }));
      expect(getTokenForRole("delivery_partner")).toBe("del-tok");
      clearAuthForRole("delivery_partner");
      expect(getTokenForRole("delivery_partner")).toBe(null);
      expect(localStorage.getItem(AUTH_STORAGE_KEYS.deliveryPartner)).toBe(null);
    });

    it("manages admin tokens", () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.adminToken, "adm-tok");
      localStorage.setItem(AUTH_STORAGE_KEYS.adminUser, JSON.stringify({ name: "Admin" }));
      expect(getTokenForRole("admin")).toBe("adm-tok");
      clearAuthForRole("admin");
      expect(getTokenForRole("admin")).toBe(null);
      expect(localStorage.getItem(AUTH_STORAGE_KEYS.adminUser)).toBe(null);
    });

    it("returns null for unknown role", () => {
      expect(getTokenForRole("unknown" as unknown as "customer")).toBe(null);
    });
  });

  describe("getLoginPath", () => {
    it("returns correct login paths for each role", () => {
      expect(getLoginPath("customer")).toBe(ROUTES.LOGIN);
      expect(getLoginPath("restaurant_owner")).toBe(ROUTES.RESTAURANT_LOGIN);
      expect(getLoginPath("delivery_partner")).toBe(ROUTES.DELIVERY_LOGIN);
      expect(getLoginPath("admin")).toBe(ROUTES.ADMIN_LOGIN);
    });
  });

  describe("getRestaurantOwnerEmail, getDeliveryPartnerSession, getCustomerPhone", () => {
    it("extracts owner email from stored owner object or JWT", () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.restaurantOwner, JSON.stringify({ email: "owner@food.com" }));
      expect(getRestaurantOwnerEmail()).toBe("owner@food.com");

      // Test fallback to token decode
      localStorage.setItem(AUTH_STORAGE_KEYS.restaurantOwner, JSON.stringify({ name: "Chef" }));
      localStorage.setItem(AUTH_STORAGE_KEYS.restaurantToken, "header.eyJlbWFpbCI6ImZyb210b2tlbkBmb29kLmNvbSJ9.sig");
      expect(getRestaurantOwnerEmail()).toBe("fromtoken@food.com");

      localStorage.clear();
      expect(getRestaurantOwnerEmail()).toBe(null);
    });

    it("extracts delivery partner session", () => {
      const session = { name: "Ramesh", phone: "9876543210", vehicle: "Bike" };
      localStorage.setItem(AUTH_STORAGE_KEYS.deliveryPartner, JSON.stringify(session));
      expect(getDeliveryPartnerSession()).toEqual(session);

      localStorage.setItem(AUTH_STORAGE_KEYS.deliveryPartner, JSON.stringify({ name: "Invalid" }));
      expect(getDeliveryPartnerSession()).toBe(null);

      localStorage.clear();
      expect(getDeliveryPartnerSession()).toBe(null);
    });

    it("extracts customer phone number", () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.customerUser, JSON.stringify({ phone: "9988776655" }));
      expect(getCustomerPhone()).toBe("9988776655");

      // Test fallback to token payload
      localStorage.removeItem(AUTH_STORAGE_KEYS.customerUser);
      localStorage.setItem(
        AUTH_STORAGE_KEYS.customerToken,
        "header.eyJzdWIiOiIxMjMiLCJwaG9uZSI6Ijk5ODg3NzY2NTUifQ.sig"
      );
      expect(getCustomerPhone()).toBe("9988776655");

      localStorage.clear();
      expect(getCustomerPhone()).toBe(null);
    });
  });
});
