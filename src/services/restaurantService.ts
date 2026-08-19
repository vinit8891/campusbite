import { publicJson } from "@/services/authFetch";
import { asPaginated, type Paginated } from "@/lib/pagination";
import { withQuery } from "@/lib/formatters";
import type {
  BackendMenuItem,
  BackendRestaurant,
  RestaurantsQuery,
} from "@/types";

export type { BackendMenuItem, BackendRestaurant, RestaurantsQuery };


export async function getRestaurantsPage(
  filters: RestaurantsQuery = {}
): Promise<Paginated<BackendRestaurant>> {
  const path = withQuery("/restaurants/", {
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
    q: filters.q,
    category: filters.category,
    email: filters.email,
    slug: filters.slug,
    include_menu: filters.include_menu,
  });

  const data = await publicJson<unknown>(path, { cache: "no-store" });
  return asPaginated<BackendRestaurant>(data);
}

/**
 * Convenience: first page items (legacy callers).
 */
export async function getRestaurants(
  filters: RestaurantsQuery = {}
): Promise<BackendRestaurant[]> {
  const page = await getRestaurantsPage({
    page: filters.page ?? 1,
    limit: filters.limit ?? 50,
    q: filters.q,
    category: filters.category,
    email: filters.email,
    slug: filters.slug,
    include_menu: filters.include_menu,
  });

  return page.items;
}

export async function getRestaurantBySlug(
  slug: string
): Promise<BackendRestaurant | null> {
  const page = await getRestaurantsPage({
    slug,
    page: 1,
    limit: 1,
    include_menu: true,
  });

  return page.items[0] || null;
}

export async function getRestaurantById(
  id: string
): Promise<BackendRestaurant | null> {
  if (!id?.trim()) return null;

  try {
    return await publicJson<BackendRestaurant>(
      `/restaurants/${encodeURIComponent(id.trim())}?include_menu=true`,
      { cache: "no-store" }
    );
  } catch (err) {
    return null;
  }
}

export async function getRestaurantByEmail(
  email: string
): Promise<BackendRestaurant | null> {
  const page = await getRestaurantsPage({
    email,
    page: 1,
    limit: 1,
    include_menu: true,
  });

  return page.items[0] || null;
}

export type RegisterRestaurantOwnerInput = {
  owner_name: string;
  restaurant_name: string;
  email: string;
  phone: string;
  password: string;
  restaurant_type: string;
  address: string;
  city: string;
  pincode: string;
};

export async function registerRestaurantOwner(
  data: RegisterRestaurantOwnerInput
) {
  return publicJson<{ message?: string; restaurant_owner?: unknown }>(
    "/restaurant-owner/register",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}