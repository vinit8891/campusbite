export type AuthRole =
  | "customer"
  | "restaurant_owner"
  | "delivery_partner"
  | "admin";

export const AUTH_STORAGE_KEYS = {
  customerToken: "token",
  customerUser: "user",
  restaurantToken: "restaurantToken",
  restaurantOwner: "restaurantOwner",
  deliveryToken: "deliveryToken",
  deliveryPartner: "deliveryPartner",
  adminToken: "adminToken",
  adminUser: "adminUser",
} as const;

const LOGIN_PATHS: Record<AuthRole, string> = {
  customer: "/login",
  restaurant_owner: "/restaurant/login",
  delivery_partner: "/delivery/login",
  admin: "/admin/login",
};

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
      typeof window !== "undefined"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf-8");

    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getTokenForRole(role: AuthRole): string | null {
  if (typeof window === "undefined") return null;

  switch (role) {
    case "customer":
      return localStorage.getItem(AUTH_STORAGE_KEYS.customerToken);
    case "restaurant_owner":
      return localStorage.getItem(AUTH_STORAGE_KEYS.restaurantToken);
    case "delivery_partner":
      return localStorage.getItem(AUTH_STORAGE_KEYS.deliveryToken);
    case "admin":
      return localStorage.getItem(AUTH_STORAGE_KEYS.adminToken);
    default:
      return null;
  }
}

export function clearAuthForRole(role: AuthRole) {
  if (typeof window === "undefined") return;

  switch (role) {
    case "customer":
      localStorage.removeItem(AUTH_STORAGE_KEYS.customerToken);
      localStorage.removeItem(AUTH_STORAGE_KEYS.customerUser);
      break;
    case "restaurant_owner":
      localStorage.removeItem(AUTH_STORAGE_KEYS.restaurantToken);
      localStorage.removeItem(AUTH_STORAGE_KEYS.restaurantOwner);
      break;
    case "delivery_partner":
      localStorage.removeItem(AUTH_STORAGE_KEYS.deliveryToken);
      localStorage.removeItem(AUTH_STORAGE_KEYS.deliveryPartner);
      break;
    case "admin":
      localStorage.removeItem(AUTH_STORAGE_KEYS.adminToken);
      localStorage.removeItem(AUTH_STORAGE_KEYS.adminUser);
      break;
  }
}

export function getLoginPath(role: AuthRole) {
  return LOGIN_PATHS[role];
}

export function getRestaurantOwnerEmail(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.restaurantOwner);
    if (!raw) return null;

    const owner = JSON.parse(raw) as { email?: string };
    if (owner.email) return owner.email;

    const token = localStorage.getItem(AUTH_STORAGE_KEYS.restaurantToken);
    if (!token) return null;

    const payload = decodeJwtPayload(token);
    const email =
      (payload?.email as string | undefined) ||
      (payload?.sub as string | undefined);

    return email || null;
  } catch {
    return null;
  }
}

export type DeliveryPartnerSession = {
  id?: string;
  name: string;
  email?: string;
  phone: string;
  vehicle?: string;
  vehicle_number?: string;
};

export function getDeliveryPartnerSession(): DeliveryPartnerSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.deliveryPartner);
    if (!raw) return null;

    const partner = JSON.parse(raw) as DeliveryPartnerSession;
    if (!partner.phone) return null;

    return partner;
  } catch {
    return null;
  }
}

export function getCustomerPhone(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.customerUser);
    if (raw) {
      const user = JSON.parse(raw) as { phone?: string };
      if (user.phone) return String(user.phone);
    }

    const token = localStorage.getItem(AUTH_STORAGE_KEYS.customerToken);
    if (!token) return null;

    const payload = decodeJwtPayload(token);
    return payload?.phone ? String(payload.phone) : null;
  } catch {
    return null;
  }
}
