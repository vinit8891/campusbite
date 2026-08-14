import { publicFetch } from "@/services/authFetch";
import { asPaginated, type Paginated } from "@/lib/pagination";

export type BackendMenuItem = {
  _id: string;
  restaurant_email?: string;
  name: string;
  description?: string;
  image: string;
  price: number;
  category?: string;
  available?: boolean;
};

export type BackendRestaurant = {
  _id: string;
  slug: string;
  name: string;
  email: string;
  cuisine?: string;
  rating?: number;
  delivery_time?: string;
  distance?: string;
  image: string;
  description?: string;
  address?: string;
  phone?: string;
  opening_hours?: string;
  closing_hours?: string;
  latitude?: number;
  longitude?: number;
  menu?: BackendMenuItem[];
};

export type RestaurantsQuery = {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  email?: string;
  slug?: string;
  include_menu?: boolean;
};

function withQuery(path: string, params: RestaurantsQuery) {
  const search = new URLSearchParams();

  if (params.page) {
    search.set("page", String(params.page));
  }

  if (params.limit) {
    search.set("limit", String(params.limit));
  }

  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  if (params.category?.trim()) {
    search.set("category", params.category.trim());
  }

  if (params.email?.trim()) {
    search.set("email", params.email.trim());
  }

  if (params.slug?.trim()) {
    search.set("slug", params.slug.trim());
  }

  if (params.include_menu === false) {
    search.set("include_menu", "false");
  }

  const query = search.toString();

  return query ? `${path}?${query}` : path;
}

export async function getRestaurantsPage(
  filters: RestaurantsQuery = {}
): Promise<Paginated<BackendRestaurant>> {
  const res = await publicFetch(
    withQuery("/restaurants/", {
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      q: filters.q,
      category: filters.category,
      email: filters.email,
      slug: filters.slug,
      include_menu: filters.include_menu,
    }),
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch restaurants");
  }

  return asPaginated<BackendRestaurant>(await res.json());
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
  const restaurants = await getRestaurants({
    limit: 100,
    include_menu: true,
  });

  return (
    restaurants.find((restaurant) => restaurant._id === id) || null
  );
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