import { AuthHttpError, authFetch, authJson } from "@/services/authFetch";
import {
  getRestaurantById as getPublicRestaurantById,
  getRestaurantBySlug as getPublicRestaurantBySlug,
  getRestaurants as getPublicRestaurants,
} from "@/services/restaurantService";

/** Public browse — no JWT required. */
export async function getRestaurants() {
  return getPublicRestaurants();
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
  return getPublicRestaurantById(id);
}

export async function updateRestaurant(id: string, data: any) {
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
