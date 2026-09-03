"use client";

import Image from "next/image";
import Link from "next/link";
import React, { memo, useEffect, useState } from "react";
import { Clock3, MapPin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CardSkeleton, EmptyState } from "@/components/common";
import { RestaurantCard } from "@/components/restaurant/RestaurantCard";
import {
  BackendRestaurant,
  getRestaurants,
} from "@/services/restaurantService";
import { ROUTES } from "@/lib/routes";

function PopularRestaurantsComponent() {
  const [restaurants, setRestaurants] = useState<BackendRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await getRestaurants({ limit: 6 });
        if (!cancelled) {
          setRestaurants(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load restaurants"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="popular-restaurants"
      className="mx-auto max-w-7xl px-6 py-20"
    >
      <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold">Popular Restaurants</h2>

          <p className="mt-2 text-gray-500">
            Discover restaurants near your campus — live from CampusBite.
          </p>
        </div>

        <Link
          href={ROUTES.RESTAURANTS}
          className="text-sm font-semibold text-orange-600 hover:underline"
        >
          View all →
        </Link>
      </div>

      {loading && (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      )}

      {!loading && error && (
        <EmptyState
          icon="⚠️"
          title="Unable to load restaurants"
          description={error}
        />
      )}

      {!loading && !error && restaurants.length === 0 && (
        <EmptyState
          icon="🍽️"
          title="No restaurants available yet"
          description="Check back soon as new campus eateries are joining."
          actionHref={ROUTES.RESTAURANTS}
          actionLabel="Explore all eateries"
        />
      )}

      {!loading && !error && restaurants.length > 0 && (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant) => (
            <RestaurantCard key={restaurant._id} restaurant={restaurant} />
          ))}
        </div>
      )}
    </section>
  );
}

export const PopularRestaurants = memo(PopularRestaurantsComponent);
export default PopularRestaurants;