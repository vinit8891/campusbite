import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware, config } from "@/middleware";

function createMockRequest(
  url: string,
  options?: {
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
  }
) {
  const req = new NextRequest(new URL(url, "http://localhost:3000"), {
    headers: options?.headers,
  });

  if (options?.cookies) {
    for (const [key, value] of Object.entries(options.cookies)) {
      req.cookies.set(key, value);
    }
  }

  return req;
}

describe("Next.js Edge Route Protection Middleware", () => {
  describe("Config & Matcher", () => {
    it("exports config matcher containing all required route patterns", () => {
      expect(config.matcher).toEqual([
        "/admin/:path*",
        "/restaurant/dashboard/:path*",
        "/delivery/dashboard/:path*",
        "/courier/:path*",
        "/checkout/:path*",
        "/my-orders/:path*",
        "/track-order/:path*",
        "/login",
        "/restaurant/login",
        "/delivery/login",
        "/courier/login",
        "/admin/login",
      ]);
    });
  });

  describe("Static and Internal Asset Bypassing", () => {
    it("bypasses _next internal assets", () => {
      const req = createMockRequest("http://localhost:3000/_next/static/chunks/main.js");
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("bypasses public api endpoints", () => {
      const req = createMockRequest("http://localhost:3000/api/health");
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("bypasses favicon and static files", () => {
      const req = createMockRequest("http://localhost:3000/favicon.ico");
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });
  });

  describe("Unauthenticated Access to Protected Routes (Forward Guard)", () => {
    it("redirects unauthenticated admin access to /admin/login", () => {
      const req = createMockRequest("http://localhost:3000/admin/orders");
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/admin/login");
    });

    it("redirects unauthenticated restaurant dashboard access to /restaurant/login", () => {
      const req = createMockRequest("http://localhost:3000/restaurant/dashboard/menu");
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/restaurant/login");
    });

    it("redirects unauthenticated delivery dashboard access to /delivery/login", () => {
      const req = createMockRequest("http://localhost:3000/delivery/dashboard/available-orders");
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/delivery/login");
    });

    it("redirects unauthenticated checkout access to /login with encoded redirect query", () => {
      const req = createMockRequest("http://localhost:3000/checkout");
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        "http://localhost:3000/login?redirect=%2Fcheckout"
      );
    });

    it("redirects unauthenticated my-orders access to /login with encoded redirect query", () => {
      const req = createMockRequest("http://localhost:3000/my-orders");
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        "http://localhost:3000/login?redirect=%2Fmy-orders"
      );
    });

    it("redirects unauthenticated track-order access to /login with encoded redirect query", () => {
      const req = createMockRequest("http://localhost:3000/track-order/order-456");
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        "http://localhost:3000/login?redirect=%2Ftrack-order%2Forder-456"
      );
    });

    it("allows unauthenticated access to login pages without redirect loop", () => {
      const adminLoginReq = createMockRequest("http://localhost:3000/admin/login");
      expect(middleware(adminLoginReq).headers.get("location")).toBeNull();

      const restLoginReq = createMockRequest("http://localhost:3000/restaurant/login");
      expect(middleware(restLoginReq).headers.get("location")).toBeNull();

      const delivLoginReq = createMockRequest("http://localhost:3000/delivery/login");
      expect(middleware(delivLoginReq).headers.get("location")).toBeNull();

      const custLoginReq = createMockRequest("http://localhost:3000/login");
      expect(middleware(custLoginReq).headers.get("location")).toBeNull();
    });
  });

  describe("Authenticated Access to Login Routes (Reverse Guard)", () => {
    it("redirects authenticated customer on /login to /restaurants", () => {
      const req = createMockRequest("http://localhost:3000/login", {
        cookies: { token: "valid-customer-jwt" },
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/restaurants");
    });

    it("redirects authenticated restaurant owner on /restaurant/login to /restaurant/dashboard", () => {
      const req = createMockRequest("http://localhost:3000/restaurant/login", {
        cookies: { restaurantToken: "valid-restaurant-jwt" },
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/restaurant/dashboard");
    });

    it("redirects authenticated delivery partner on /delivery/login to /delivery/dashboard", () => {
      const req = createMockRequest("http://localhost:3000/delivery/login", {
        cookies: { deliveryToken: "valid-delivery-jwt" },
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/delivery/dashboard");
    });

    it("redirects authenticated admin on /admin/login to /admin/orders", () => {
      const req = createMockRequest("http://localhost:3000/admin/login", {
        cookies: { adminToken: "valid-admin-jwt" },
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/admin/orders");
    });
  });

  describe("Authenticated Access to Protected Routes", () => {
    it("allows authenticated admin to access /admin/users", () => {
      const req = createMockRequest("http://localhost:3000/admin/users", {
        cookies: { adminToken: "valid-admin-jwt" },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("allows authenticated restaurant owner to access /restaurant/dashboard/orders", () => {
      const req = createMockRequest("http://localhost:3000/restaurant/dashboard/orders", {
        cookies: { restaurantToken: "valid-restaurant-jwt" },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("allows authenticated delivery partner to access /delivery/dashboard/my-deliveries", () => {
      const req = createMockRequest("http://localhost:3000/delivery/dashboard/my-deliveries", {
        cookies: { deliveryToken: "valid-delivery-jwt" },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("allows authenticated customer to access /checkout", () => {
      const req = createMockRequest("http://localhost:3000/checkout", {
        cookies: { token: "valid-customer-jwt" },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("supports fallback header authentication when cookie is absent", () => {
      const req = createMockRequest("http://localhost:3000/admin/users", {
        headers: { "x-admintoken": "valid-admin-token" },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });
  });

  describe("Unified cb_token & cb_role Cookie Handling", () => {
    const restaurantJwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvd25lckBjYW1wdXMuZWR1Iiwicm9sZSI6InJlc3RhdXJhbnRfb3duZXIifQ.mock-signature";
    const deliveryJwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwYXJ0bmVyQGNhbXB1cy5lZHUiLCJyb2xlIjoiZGVsaXZlcnlfcGFydG5lciJ9.mock-signature";
    const adminJwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBjYW1wdXMuZWR1Iiwicm9sZSI6ImFkbWluIn0.mock-signature";

    it("authenticates restaurant access with cb_token and cb_role=restaurant_owner", () => {
      const req = createMockRequest("http://localhost:3000/restaurant/dashboard/orders", {
        cookies: {
          cb_token: "opaque-or-jwt-token",
          cb_role: "restaurant_owner",
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("authenticates restaurant access with cb_token and cb_role=restaurant (alias)", () => {
      const req = createMockRequest("http://localhost:3000/restaurant/dashboard", {
        cookies: {
          cb_token: "opaque-or-jwt-token",
          cb_role: "restaurant",
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("authenticates restaurant access via JWT decoding when cb_role cookie is omitted", () => {
      const req = createMockRequest("http://localhost:3000/restaurant/dashboard/menu", {
        cookies: {
          cb_token: restaurantJwt,
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("authenticates delivery access with cb_token and cb_role=delivery_partner", () => {
      const req = createMockRequest("http://localhost:3000/delivery/dashboard/available-orders", {
        cookies: {
          cb_token: "opaque-or-jwt-token",
          cb_role: "delivery_partner",
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("authenticates delivery access with cb_token and cb_role=delivery (alias)", () => {
      const req = createMockRequest("http://localhost:3000/delivery/dashboard", {
        cookies: {
          cb_token: "opaque-or-jwt-token",
          cb_role: "delivery",
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("authenticates delivery access with cb_token and cb_role=courier (alias)", () => {
      const req = createMockRequest("http://localhost:3000/delivery/dashboard", {
        cookies: {
          cb_token: "opaque-or-jwt-token",
          cb_role: "courier",
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("authenticates delivery access with cb_token and cb_role=runner (alias)", () => {
      const req = createMockRequest("http://localhost:3000/delivery/dashboard", {
        cookies: {
          cb_token: "opaque-or-jwt-token",
          cb_role: "runner",
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("authenticates delivery access via JWT decoding when cb_role cookie is omitted", () => {
      const req = createMockRequest("http://localhost:3000/delivery/dashboard/history", {
        cookies: {
          cb_token: deliveryJwt,
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("authenticates admin access with cb_token and cb_role=admin", () => {
      const req = createMockRequest("http://localhost:3000/admin/restaurants", {
        cookies: {
          cb_token: "opaque-or-jwt-token",
          cb_role: "admin",
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("authenticates admin access via JWT decoding when cb_role cookie is omitted", () => {
      const req = createMockRequest("http://localhost:3000/admin/users", {
        cookies: {
          cb_token: adminJwt,
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("redirects authenticated restaurant user on /restaurant/login away using cb_token/cb_role", () => {
      const req = createMockRequest("http://localhost:3000/restaurant/login", {
        cookies: {
          cb_token: "valid-token",
          cb_role: "restaurant_owner",
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/restaurant/dashboard");
    });

    it("redirects authenticated delivery user on /delivery/login away using cb_token/cb_role", () => {
      const req = createMockRequest("http://localhost:3000/delivery/login", {
        cookies: {
          cb_token: "valid-token",
          cb_role: "delivery_partner",
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/delivery/dashboard");
    });

    it("redirects authenticated admin on /admin/login away using cb_token/cb_role", () => {
      const req = createMockRequest("http://localhost:3000/admin/login", {
        cookies: {
          cb_token: "valid-token",
          cb_role: "admin",
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/admin/orders");
    });

    it("allows customer with cb_token and cb_role=customer to access /checkout", () => {
      const req = createMockRequest("http://localhost:3000/checkout", {
        cookies: {
          cb_token: "valid-customer-token",
          cb_role: "customer",
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("allows customer with cb_token and cb_role=customer to access /my-orders", () => {
      const req = createMockRequest("http://localhost:3000/my-orders", {
        cookies: {
          cb_token: "valid-customer-token",
          cb_role: "customer",
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("redirects authenticated customer on /login?redirect=/checkout to /checkout", () => {
      const req = createMockRequest("http://localhost:3000/login?redirect=%2Fcheckout", {
        cookies: {
          cb_token: "valid-customer-token",
          cb_role: "customer",
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/checkout");
    });
  });
});


