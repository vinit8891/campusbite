"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock3, MapPin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  BackendRestaurant,
  getRestaurants,
} from "@/services/restaurantService";

export function PopularRestaurants() {
  const [restaurants, setRestaurants] = useState<BackendRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getRestaurants();
        if (!cancelled) {
          // Show a few top-rated live restaurants on the home page.
          const sorted = [...data].sort(
            (a, b) => Number(b.rating || 0) - Number(a.rating || 0)
          );
          setRestaurants(sorted.slice(0, 6));
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Unable to load popular restaurants.");
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
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Popular Restaurants</h2>
          <p className="mt-2 text-gray-500">
            Discover restaurants near your campus — live from CampusBite.
          </p>
        </div>

        <Link
          href="/restaurants"
          className="text-sm font-semibold text-orange-600 hover:underline"
        >
          View all →
        </Link>
      </div>

      {loading && (
        <div className="rounded-2xl border bg-white p-10 text-center text-gray-500">
          Loading restaurants...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-10 text-center text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && restaurants.length === 0 && (
        <div className="rounded-2xl border bg-white p-10 text-center text-gray-500">
          No restaurants available yet.
        </div>
      )}

      {!loading && !error && restaurants.length > 0 && (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant) => (
            <div
              key={restaurant._id}
              className="overflow-hidden rounded-3xl border bg-white shadow-md transition duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="relative h-56 bg-gray-100">
                {restaurant.image ? (
                  <Image
                    src={restaurant.image}
                    alt={restaurant.name}
                    fill
                    className="object-cover"
                    unoptimized={restaurant.image.startsWith("http")}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl">
                    🍽️
                  </div>
                )}
              </div>

              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-bold">{restaurant.name}</h3>
                  <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-sm text-green-700">
                    <Star className="h-4 w-4 fill-current" />
                    {restaurant.rating ?? "—"}
                  </div>
                </div>

                <p className="text-gray-500">
                  {restaurant.cuisine || "Restaurant"}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock3 className="h-4 w-4" />
                    {restaurant.delivery_time || "25-35 min"}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {restaurant.distance || "Nearby"}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link href={`/restaurants/${restaurant.slug}`}>
                    <Button>View Menu</Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
