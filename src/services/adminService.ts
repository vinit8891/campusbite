import { AuthHttpError, authJson, publicFetch } from "@/services/authFetch";
import { asPaginated, type Paginated } from "@/lib/pagination";
import {
  type BackendRestaurant,
  getRestaurantById as getPublicRestaurantById,
  getRestaurants as getPublicRestaurants,
} from "@/services/restaurantService";

export type { BackendRestaurant, Paginated };
export { AuthHttpError };

export type AdminStats = {
  users: number;
  restaurant_owners: number;
  restaurants: number;
  delivery_partners: number;
  orders: number;
};

export type BackendHealth = {
  status: string;
  app_name?: string;
  environment?: string;
  database?: string;
  version?: string;
  uptime?: number;
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
  page?: number;
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

/** Public liveness probe — no JWT required. */
export async function getBackendHealth(): Promise<BackendHealth> {
  const res = await publicFetch("/health", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Unable to load backend health");
  }
  return res.json() as Promise<BackendHealth>;
}

export async function getAdminOrders(filters: AdminOrdersQuery = {}) {
  const data = await authJson<unknown>(
    withQuery("/orders/", {
      status: filters.status,
      payment_status: filters.payment_status,
      payment_method: filters.payment_method,
      q: filters.q?.trim() || undefined,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    }),
    ADMIN_JSON
  );
  return asPaginated<AdminOrder>(data);
}

export async function getAdminCustomers(q?: string, page = 1, limit = 20) {
  const data = await authJson<unknown>(
    withQuery("/admin/users/customers", {
      q: q?.trim() || undefined,
      page,
      limit,
    }),
    ADMIN_JSON
  );
  return asPaginated<AdminCustomer>(data);
}

export async function getAdminRestaurantOwners(
  q?: string,
  page = 1,
  limit = 20
) {
  const data = await authJson<unknown>(
    withQuery("/admin/users/restaurant-owners", {
      q: q?.trim() || undefined,
      page,
      limit,
    }),
    ADMIN_JSON
  );
  return asPaginated<AdminRestaurantOwner>(data);
}

export async function getAdminDeliveryPartners(
  q?: string,
  page = 1,
  limit = 20
) {
  const data = await authJson<unknown>(
    withQuery("/admin/users/delivery-partners", {
      q: q?.trim() || undefined,
      page,
      limit,
    }),
    ADMIN_JSON
  );
  return asPaginated<AdminDeliveryPartner>(data);
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
