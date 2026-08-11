/**
 * Legacy static restaurant helpers.
 * Customer discovery now uses src/services/restaurantService.ts (live API).
 * Kept temporarily so existing imports/tools do not break; do not use for new work.
 */
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
