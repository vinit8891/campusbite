import { AuthHttpError, authFetch, authJson } from "@/services/authFetch";
import {
  type BackendRestaurant,
  getRestaurantById as getPublicRestaurantById,
  getRestaurantBySlug as getPublicRestaurantBySlug,
  getRestaurants as getPublicRestaurants,
} from "@/services/restaurantService";

export type { BackendRestaurant };

export type AdminStats = {
  users: number;
  restaurant_owners: number;
  restaurants: number;
  delivery_partners: number;
  orders: number;
};

export async function getAdminStats() {
  return authJson<AdminStats>("/admin/stats", {
    role: "admin",
    cache: "no-store",
  });
}

export type AdminOrder = {
  _id: string;
  customer_name?: string;
  customer_email?: string;
  restaurant_email?: string;
  restaurant_name?: string;
  status?: string;
  payment_method?: string;
  payment_status?: string;
  total?: number;
  created_at?: string;
};

export type AdminOrdersQuery = {
  status?: string;
  payment_status?: string;
  payment_method?: string;
  q?: string;
  limit?: number;
};

export async function getAdminOrders(filters: AdminOrdersQuery = {}) {
  const params = new URLSearchParams();

  if (filters.status) params.set("status", filters.status);
  if (filters.payment_status) {
    params.set("payment_status", filters.payment_status);
  }
  if (filters.payment_method) {
    params.set("payment_method", filters.payment_method);
  }
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  const path = query ? `/orders/?${query}` : "/orders/";

  return authJson<AdminOrder[]>(path, {
    role: "admin",
    cache: "no-store",
  });
}

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at?: string | null;
};

export type AdminRestaurantOwner = {
  id: string;
  name: string;
  email: string;
  restaurant: string;
};

export type AdminDeliveryPartner = {
  id: string;
  name: string;
  email: string;
  status: string;
};

export async function getAdminCustomers(q?: string) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  const query = params.toString();
  const path = query
    ? `/admin/users/customers?${query}`
    : "/admin/users/customers";

  return authJson<AdminCustomer[]>(path, {
    role: "admin",
    cache: "no-store",
  });
}

export async function getAdminRestaurantOwners(q?: string) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  const query = params.toString();
  const path = query
    ? `/admin/users/restaurant-owners?${query}`
    : "/admin/users/restaurant-owners";

  return authJson<AdminRestaurantOwner[]>(path, {
    role: "admin",
    cache: "no-store",
  });
}

export async function getAdminDeliveryPartners(q?: string) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  const query = params.toString();
  const path = query
    ? `/admin/users/delivery-partners?${query}`
    : "/admin/users/delivery-partners";

  return authJson<AdminDeliveryPartner[]>(path, {
    role: "admin",
    cache: "no-store",
  });
}

/** Public browse — no JWT required. */
export async function getRestaurants() {
  return getPublicRestaurants();
}

export async function addRestaurant(data: Record<string, unknown>) {
  return authJson("/restaurants/", {
    role: "admin",
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteRestaurant(id: string) {
  const res = await authFetch(`/restaurants/${id}`, {
    role: "admin",
    method: "DELETE",
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new AuthHttpError(
      res.status,
      typeof body?.detail === "string"
        ? body.detail
        : "Failed to delete restaurant"
    );
  }

  return body;
}

export async function getRestaurantById(id: string) {
  return getPublicRestaurantById(id);
}

export async function updateRestaurant(
  id: string,
  data: Record<string, unknown>
) {
  return authJson(`/restaurants/${id}`, {
    role: "admin",
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getRestaurantBySlug(slug: string) {
  return getPublicRestaurantBySlug(slug);
}

export { AuthHttpError };
