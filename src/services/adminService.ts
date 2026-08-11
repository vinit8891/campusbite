import { AuthHttpError, authFetch, authJson, publicFetch } from "@/services/authFetch";

export async function getRestaurants() {
  const res = await publicFetch("/restaurants/", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch restaurants");
  }

  return res.json();
}

export async function addRestaurant(data: any) {
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

  return res.json();
}

export async function getRestaurantById(id: string) {
  const restaurants = await getRestaurants();
  return restaurants.find((restaurant: any) => restaurant._id === id);
}

export async function updateRestaurant(id: string, data: any) {
  return authJson(`/restaurants/${id}`, {
    role: "admin",
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getRestaurantBySlug(slug: string) {
  const restaurants = await getRestaurants();

  return restaurants.find(
    (restaurant: any) => restaurant.slug === slug
  );
}

export { AuthHttpError };
