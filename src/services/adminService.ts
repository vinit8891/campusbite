import { AuthHttpError, authJson } from "@/services/authFetch";
import {
  type BackendRestaurant,
  getRestaurantById as getPublicRestaurantById,
  getRestaurants as getPublicRestaurants,
} from "@/services/restaurantService";

export type { BackendRestaurant };
export { AuthHttpError };

export type AdminStats = {
  users: number;
  restaurant_owners: number;
  restaurants: number;
  delivery_partners: number;
  orders: number;
};

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

export type AdminRestaurantInput = {
  slug: string;
  name: string;
  email: string;
  cuisine: string;
  rating: number;
  delivery_time: string;
  distance: string;
  image: string;
  latitude: number;
  longitude: number;
};

const ADMIN_JSON = {
  role: "admin" as const,
  cache: "no-store" as RequestCache,
};

function withQuery(
  path: string,
  params: Record<string, string | number | undefined>
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export async function getAdminStats() {
  return authJson<AdminStats>("/admin/stats", ADMIN_JSON);
}

export async function getAdminOrders(filters: AdminOrdersQuery = {}) {
  return authJson<AdminOrder[]>(
    withQuery("/orders/", {
      status: filters.status,
      payment_status: filters.payment_status,
      payment_method: filters.payment_method,
      q: filters.q?.trim() || undefined,
      limit: filters.limit,
    }),
    ADMIN_JSON
  );
}

export async function getAdminCustomers(q?: string) {
  return authJson<AdminCustomer[]>(
    withQuery("/admin/users/customers", { q: q?.trim() || undefined }),
    ADMIN_JSON
  );
}

export async function getAdminRestaurantOwners(q?: string) {
  return authJson<AdminRestaurantOwner[]>(
    withQuery("/admin/users/restaurant-owners", {
      q: q?.trim() || undefined,
    }),
    ADMIN_JSON
  );
}

export async function getAdminDeliveryPartners(q?: string) {
  return authJson<AdminDeliveryPartner[]>(
    withQuery("/admin/users/delivery-partners", {
      q: q?.trim() || undefined,
    }),
    ADMIN_JSON
  );
}

/** Public browse — no JWT required. */
export async function getRestaurants() {
  return getPublicRestaurants();
}

export async function getRestaurantById(id: string) {
  return getPublicRestaurantById(id);
}

export async function addRestaurant(data: AdminRestaurantInput) {
  return authJson("/restaurants/", {
    ...ADMIN_JSON,
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRestaurant(
  id: string,
  data: AdminRestaurantInput
) {
  return authJson(`/restaurants/${id}`, {
    ...ADMIN_JSON,
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRestaurant(id: string) {
  return authJson(`/restaurants/${id}`, {
    ...ADMIN_JSON,
    method: "DELETE",
  });
}
