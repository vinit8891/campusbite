import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROUTES } from "@/lib/routes";

const TOKEN_KEYS = {
  customer: "token",
  restaurant: "restaurantToken",
  delivery: "deliveryToken",
  admin: "adminToken",
} as const;

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

  const customerToken = getToken(request, TOKEN_KEYS.customer);
  const restaurantToken = getToken(request, TOKEN_KEYS.restaurant);
  const deliveryToken = getToken(request, TOKEN_KEYS.delivery);
  const adminToken = getToken(request, TOKEN_KEYS.admin);

  // 1. Reverse Guards: Redirect authenticated users away from role login pages
  if (pathname === ROUTES.LOGIN && customerToken) {
    return NextResponse.redirect(new URL(ROUTES.RESTAURANTS, request.url));
  }

  if (pathname === ROUTES.RESTAURANT_LOGIN && restaurantToken) {
    return NextResponse.redirect(
      new URL(ROUTES.RESTAURANT_DASHBOARD, request.url)
    );
  }

  if (pathname === ROUTES.DELIVERY_LOGIN && deliveryToken) {
    return NextResponse.redirect(
      new URL(ROUTES.DELIVERY_DASHBOARD, request.url)
    );
  }

  if (pathname === ROUTES.ADMIN_LOGIN && adminToken) {
    return NextResponse.redirect(new URL(ROUTES.ADMIN_ORDERS, request.url));
  }

  // 2. Forward Guards: Protect private routes from unauthenticated access
  if (pathname.startsWith(ROUTES.ADMIN) && pathname !== ROUTES.ADMIN_LOGIN) {
    if (!adminToken) {
      return NextResponse.redirect(new URL(ROUTES.ADMIN_LOGIN, request.url));
    }
  }

  if (pathname.startsWith(ROUTES.RESTAURANT_DASHBOARD)) {
    if (!restaurantToken) {
      return NextResponse.redirect(
        new URL(ROUTES.RESTAURANT_LOGIN, request.url)
      );
    }
  }

  if (pathname.startsWith(ROUTES.DELIVERY_DASHBOARD)) {
    if (!deliveryToken) {
      return NextResponse.redirect(new URL(ROUTES.DELIVERY_LOGIN, request.url));
    }
  }

  const isCustomerProtectedRoute =
    pathname.startsWith(ROUTES.CHECKOUT) ||
    pathname.startsWith(ROUTES.MY_ORDERS) ||
    pathname.startsWith("/track-order");

  if (isCustomerProtectedRoute) {
    if (!customerToken) {
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
