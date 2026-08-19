import { describe, it, expect } from "vitest";
import { getRestaurants, getRestaurantById } from "@/services/restaurantService";

describe("restaurantService", () => {
  it("getRestaurants fetches restaurant array", async () => {
    const restaurants = await getRestaurants();
    expect(Array.isArray(restaurants)).toBe(true);
    expect(restaurants.length).toBe(1);
    expect(restaurants[0].name).toBe("Campus Diner");
  });

  it("getRestaurantById fetches single restaurant with menu", async () => {
    const restaurant = await getRestaurantById("rest-1");
    expect(restaurant).not.toBeNull();
    expect(restaurant?.name).toBe("Campus Diner");
    expect(restaurant?.menu?.length).toBe(1);
    expect(restaurant?.menu?.[0].name).toBe("Paneer Butter Masala");
  });
});
