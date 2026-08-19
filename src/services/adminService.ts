import { AuthHttpError, authJson, publicJson } from "@/services/authFetch";
import { asPaginated, type Paginated } from "@/lib/pagination";
import { withQuery } from "@/lib/formatters";
import {
  getRestaurantById as getPublicRestaurantById,
  getRestaurants as getPublicRestaurants,
} from "@/services/restaurantService";
import type {
  BackendRestaurant,
  AdminStats,
  BackendHealth,
  AdminOrder,
  AdminOrdersQuery,
  AdminCustomer,
  AdminRestaurantOwner,
  AdminDeliveryPartner,
  AdminRestaurantInput,
} from "@/types";

export type {
  BackendRestaurant,
  Paginated,
  AdminStats,
  BackendHealth,
  AdminOrder,
  AdminOrdersQuery,
  AdminCustomer,
  AdminRestaurantOwner,
  AdminDeliveryPartner,
  AdminRestaurantInput,
};
export { AuthHttpError };

const ADMIN_JSON = {
  role: "admin" as const,
  cache: "no-store" as RequestCache,
};


export async function getAdminStats() {
  return authJson<AdminStats>("/admin/stats", ADMIN_JSON);
}

/** Public liveness probe — no JWT required. */
export async function getBackendHealth(): Promise<BackendHealth> {
  return publicJson<BackendHealth>("/health", { cache: "no-store" });
}

export async function getAdminHealth() {
  return authJson<{ status: string; ok: boolean }>("/admin/health", ADMIN_JSON);
}

export async function getAdminOrders(filters: AdminOrdersQuery = {}) {
  const path = withQuery("/orders/", {
    status: filters.status,
    payment_status: filters.payment_status,
    payment_method: filters.payment_method,
    q: filters.q,
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
  });

  const data = await authJson<unknown>(path, ADMIN_JSON);
  return asPaginated<AdminOrder>(data);
}

export async function getAdminCustomers(q?: string, page = 1, limit = 20) {
  const path = withQuery("/admin/users/customers", {
    q,
    page,
    limit,
  });

  const data = await authJson<unknown>(path, ADMIN_JSON);
  return asPaginated<AdminCustomer>(data);
}

export async function getAdminRestaurantOwners(
  q?: string,
  page = 1,
  limit = 20
) {
  const path = withQuery("/admin/users/restaurant-owners", {
    q,
    page,
    limit,
  });

  const data = await authJson<unknown>(path, ADMIN_JSON);
  return asPaginated<AdminRestaurantOwner>(data);
}

export async function getAdminDeliveryPartners(
  q?: string,
  page = 1,
  limit = 20
) {
  const path = withQuery("/admin/users/delivery-partners", {
    q,
    page,
    limit,
  });

  const data = await authJson<unknown>(path, ADMIN_JSON);
  return asPaginated<AdminDeliveryPartner>(data);
}

/** Re-exported for backwards compatibility */
export {
  getRestaurants,
  getRestaurantById,
} from "@/services/restaurantService";


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
  return authJson(`/restaurants/${encodeURIComponent(id)}`, {
    ...ADMIN_JSON,
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRestaurant(id: string) {
  return authJson(`/restaurants/${encodeURIComponent(id)}`, {
    ...ADMIN_JSON,
    method: "DELETE",
  });
}
