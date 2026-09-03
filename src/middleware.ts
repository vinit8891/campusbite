import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROUTES } from "@/lib/routes";

const TOKEN_KEYS = {
  customer: "token",
  restaurant: "restaurantToken",
  delivery: "deliveryToken",
  admin: "adminToken",
} as const;

export function decodeJwtPayload(
  token: string
): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );

    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf-8");

    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getToken(request: NextRequest, key: string): string | undefined {
  return (
    request.cookies.get(key)?.value ||
    request.headers.get(`x-${key.toLowerCase()}`) ||
    request.headers.get(key) ||
    (key === "token"
      ? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
      : undefined) ||
    undefined
  );
}

function isRestaurantRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return (
    normalized === "restaurant" ||
    normalized === "restaurant_owner" ||
    normalized === "owner"
  );
}

function isDeliveryRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return (
    normalized === "delivery" ||
    normalized === "delivery_partner" ||
    normalized === "driver"
  );
}

function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return normalized === "admin" || normalized === "superadmin";
}

function isCustomerRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return normalized === "customer";
}

function hasRestaurantAuth(request: NextRequest): boolean {
  const specificToken = getToken(request, TOKEN_KEYS.restaurant);
  if (specificToken) return true;

  const cbToken = request.cookies.get("cb_token")?.value;
  const cbRole = request.cookies.get("cb_role")?.value;

  if (cbToken) {
    if (isRestaurantRole(cbRole)) return true;
    const payload = decodeJwtPayload(cbToken);
    if (payload && isRestaurantRole(payload.role as string | undefined)) {
      return true;
    }
  }

  const generalToken = getToken(request, TOKEN_KEYS.customer);
  if (generalToken) {
    if (isRestaurantRole(cbRole)) return true;
    const payload = decodeJwtPayload(generalToken);
    if (payload && isRestaurantRole(payload.role as string | undefined)) {
      return true;
    }
  }

  return false;
}

function hasDeliveryAuth(request: NextRequest): boolean {
  const specificToken = getToken(request, TOKEN_KEYS.delivery);
  if (specificToken) return true;

  const cbToken = request.cookies.get("cb_token")?.value;
  const cbRole = request.cookies.get("cb_role")?.value;

  if (cbToken) {
    if (isDeliveryRole(cbRole)) return true;
    const payload = decodeJwtPayload(cbToken);
    if (payload && isDeliveryRole(payload.role as string | undefined)) {
      return true;
    }
  }

  const generalToken = getToken(request, TOKEN_KEYS.customer);
  if (generalToken) {
    if (isDeliveryRole(cbRole)) return true;
    const payload = decodeJwtPayload(generalToken);
    if (payload && isDeliveryRole(payload.role as string | undefined)) {
      return true;
    }
  }

  return false;
}

function hasAdminAuth(request: NextRequest): boolean {
  const specificToken = getToken(request, TOKEN_KEYS.admin);
  if (specificToken) return true;

  const cbToken = request.cookies.get("cb_token")?.value;
  const cbRole = request.cookies.get("cb_role")?.value;

  if (cbToken) {
    if (isAdminRole(cbRole)) return true;
    const payload = decodeJwtPayload(cbToken);
    if (payload && isAdminRole(payload.role as string | undefined)) {
      return true;
    }
  }

  const generalToken = getToken(request, TOKEN_KEYS.customer);
  if (generalToken) {
    if (isAdminRole(cbRole)) return true;
    const payload = decodeJwtPayload(generalToken);
    if (payload && isAdminRole(payload.role as string | undefined)) {
      return true;
    }
  }

  return false;
}

function hasCustomerAuth(request: NextRequest): boolean {
  const specificToken = getToken(request, TOKEN_KEYS.customer);
  const cbToken = request.cookies.get("cb_token")?.value;
  const cbRole = request.cookies.get("cb_role")?.value;

  if (specificToken) {
    if (
      isRestaurantRole(cbRole) ||
      isDeliveryRole(cbRole) ||
      isAdminRole(cbRole)
    ) {
      return false;
    }
    const payload = decodeJwtPayload(specificToken);
    if (payload?.role && !isCustomerRole(payload.role as string)) {
      return false;
    }
    return true;
  }

  if (cbToken) {
    if (isCustomerRole(cbRole)) return true;
    const payload = decodeJwtPayload(cbToken);
    if (payload && isCustomerRole(payload.role as string | undefined)) {
      return true;
    }
    if (
      !cbRole &&
      (!payload?.role || isCustomerRole(payload?.role as string))
    ) {
      return true;
    }
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Explicitly bypass Next.js internals, static assets, and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    /\.(.*)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const isCustomer = hasCustomerAuth(request);
  const isRestaurant = hasRestaurantAuth(request);
  const isDelivery = hasDeliveryAuth(request);
  const isAdmin = hasAdminAuth(request);

  // 1. Reverse Guards: Redirect authenticated users away from role login pages
  if (pathname === ROUTES.LOGIN && isCustomer) {
    return NextResponse.redirect(new URL(ROUTES.RESTAURANTS, request.url));
  }

  if (pathname === ROUTES.RESTAURANT_LOGIN && isRestaurant) {
    return NextResponse.redirect(
      new URL(ROUTES.RESTAURANT_DASHBOARD, request.url)
    );
  }

  if (pathname === ROUTES.DELIVERY_LOGIN && isDelivery) {
    return NextResponse.redirect(
      new URL(ROUTES.DELIVERY_DASHBOARD, request.url)
    );
  }

  if (pathname === ROUTES.ADMIN_LOGIN && isAdmin) {
    return NextResponse.redirect(new URL(ROUTES.ADMIN_ORDERS, request.url));
  }

  // 2. Forward Guards: Protect private routes from unauthenticated access
  if (pathname.startsWith(ROUTES.ADMIN) && pathname !== ROUTES.ADMIN_LOGIN) {
    if (!isAdmin) {
      return NextResponse.redirect(new URL(ROUTES.ADMIN_LOGIN, request.url));
    }
  }

  if (pathname.startsWith(ROUTES.RESTAURANT_DASHBOARD)) {
    if (!isRestaurant) {
      return NextResponse.redirect(
        new URL(ROUTES.RESTAURANT_LOGIN, request.url)
      );
    }
  }

  if (pathname.startsWith(ROUTES.DELIVERY_DASHBOARD)) {
    if (!isDelivery) {
      return NextResponse.redirect(new URL(ROUTES.DELIVERY_LOGIN, request.url));
    }
  }

  const isCustomerProtectedRoute =
    pathname.startsWith(ROUTES.CHECKOUT) ||
    pathname.startsWith(ROUTES.MY_ORDERS) ||
    pathname.startsWith("/track-order");

  if (isCustomerProtectedRoute) {
    if (!isCustomer) {
      const redirectUrl = new URL(
        `${ROUTES.LOGIN}?redirect=${encodeURIComponent(pathname)}`,
        request.url
      );
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/restaurant/dashboard/:path*",
    "/delivery/dashboard/:path*",
    "/checkout/:path*",
    "/my-orders/:path*",
    "/track-order/:path*",
    "/login",
    "/restaurant/login",
    "/delivery/login",
    "/admin/login",
  ],
};

