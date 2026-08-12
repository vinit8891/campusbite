import { publicFetch } from "@/services/authFetch";

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

export async function getRestaurants(): Promise<BackendRestaurant[]> {
  const res = await publicFetch("/restaurants/", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch restaurants");
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getRestaurantBySlug(
  slug: string
): Promise<BackendRestaurant | null> {
  const restaurants = await getRestaurants();
  return (
    restaurants.find((restaurant) => restaurant.slug === slug) || null
  );
}

export async function getRestaurantById(
  id: string
): Promise<BackendRestaurant | null> {
  const restaurants = await getRestaurants();
  return (
    restaurants.find((restaurant) => restaurant._id === id) || null
  );
}

export async function getRestaurantByEmail(
  email: string
): Promise<BackendRestaurant | null> {
  const restaurants = await getRestaurants();
  const normalized = email.trim().toLowerCase();
  return (
    restaurants.find(
      (restaurant) =>
        (restaurant.email || "").trim().toLowerCase() === normalized
    ) || null
  );
}
