import { restaurants } from "@/data/restaurants";
import { Restaurant } from "@/types";

export const restaurantService = {
  getAll(): Restaurant[] {
    return restaurants;
  },

  getBySlug(slug: string): Restaurant | undefined {
    return restaurants.find(
      (restaurant) => restaurant.slug === slug
    );
  },
};