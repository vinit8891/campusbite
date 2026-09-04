"use client";

import Link from "next/link";
import React, { memo, useEffect, useState, useMemo } from "react";
import { Sparkles, Utensils, Zap, Moon, Flame, Leaf } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CardSkeleton, EmptyState } from "@/components/common";
import { RestaurantCard } from "@/components/restaurant/RestaurantCard";
import {
  BackendRestaurant,
  getRestaurants,
} from "@/services/restaurantService";
import { ROUTES } from "@/lib/routes";

export type FilterChipId = "all" | "under99" | "latenight" | "mess" | "pureveg";

export interface FilterChip {
  id: FilterChipId;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const CATEGORY_CHIPS: FilterChip[] = [
  { id: "all", label: "All Eateries" },
  { id: "under99", label: "⚡ Under ₹99" },
  { id: "latenight", label: "🌙 Late Night Cravings" },
  { id: "mess", label: "🍲 Mess Specials" },
  { id: "pureveg", label: "🌱 Pure Veg" },
];

function PopularRestaurantsComponent() {
  const [restaurants, setRestaurants] = useState<BackendRestaurant[]>([]);
  const [activeChip, setActiveChip] = useState<FilterChipId>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await getRestaurants({ limit: 12 });
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

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRestaurants = useMemo(() => {
    if (activeChip === "all") return restaurants;

    return restaurants.filter((r) => {
      const text = `${r.name || ""} ${r.cuisine || ""} ${r.description || ""}`.toLowerCase();

      switch (activeChip) {
        case "under99":
          return (
            text.includes("budget") ||
            text.includes("fast food") ||
            text.includes("snack") ||
            text.includes("canteen") ||
            text.includes("dhaba") ||
            text.includes("street") ||
            text.includes("chai") ||
            text.includes("roll")
          );
        case "latenight":
          return (
            text.includes("burger") ||
            text.includes("pizza") ||
            text.includes("fast food") ||
            text.includes("biryani") ||
            text.includes("roll") ||
            text.includes("chinese") ||
            text.includes("night")
          );
        case "mess":
          return (
            text.includes("mess") ||
            text.includes("thali") ||
            text.includes("north indian") ||
            text.includes("south indian") ||
            text.includes("indian") ||
            text.includes("home")
          );
        case "pureveg":
          return (
            text.includes("pure veg") ||
            text.includes("veg") ||
            text.includes("jain") ||
            text.includes("south indian") ||
            text.includes("marwadi") ||
            text.includes("gujarati")
          );
        default:
          return true;
      }
    });
  }, [restaurants, activeChip]);

  return (
    <section
      id="popular-restaurants"
      className="mx-auto max-w-7xl px-6 py-16"
    >
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Popular Restaurants
          </h2>

          <p className="mt-2 text-gray-500">
            Discover restaurants near your campus — live from CampusBite.
          </p>
        </div>

        <Link
          href={ROUTES.RESTAURANTS}
          className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
        >
          View all eateries →
        </Link>
      </div>

      {/* Quick Campus Category Filter Chips */}
      <div
        data-testid="campus-category-chips"
        className="flex items-center gap-2.5 overflow-x-auto pb-4 pt-1 mb-8 scrollbar-none snap-x"
        aria-label="Quick Campus Filters"
      >
        {CATEGORY_CHIPS.map((chip) => {
          const isActive = activeChip === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveChip(chip.id)}
              className={`snap-start shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 border cursor-pointer ${
                isActive
                  ? "bg-orange-600 text-white border-orange-600 shadow-sm ring-2 ring-orange-500/20"
                  : "bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50/50"
              }`}
              aria-pressed={isActive}
            >
              {chip.label}
            </button>
          );
        })}
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

      {!loading && !error && filteredRestaurants.length === 0 && (
        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-xs">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            No eateries matched this filter
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Try choosing a different category or explore all campus eateries.
          </p>
          <Button
            variant="outline"
            onClick={() => setActiveChip("all")}
            className="border-orange-200 text-orange-600 hover:bg-orange-50"
          >
            Reset Filters
          </Button>
        </div>
      )}

      {!loading && !error && filteredRestaurants.length > 0 && (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredRestaurants.map((restaurant) => (
            <RestaurantCard key={restaurant._id} restaurant={restaurant} />
          ))}
        </div>
      )}
    </section>
  );
}

export const PopularRestaurants = memo(PopularRestaurantsComponent);
export default PopularRestaurants;