"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { RestaurantCard } from "@/components/restaurant/RestaurantCard";
import PaginationControls from "@/components/ui/PaginationControls";
import { EmptyState } from "@/components/common";
import {
  BackendRestaurant,
  getRestaurantsPage,
} from "@/services/restaurantService";
import { ROUTES } from "@/lib/routes";
import { SortFilterBar, SortOption } from "@/components/restaurants/SortFilterBar";
import { useUserLocation, formatDistance } from "@/hooks/useUserLocation";

const categories = [
  "All",
  "Pizza",
  "Burger",
  "Biryani",
  "Healthy",
  "Desserts",
  "Drinks",
];

export default function RestaurantsClient() {
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "All";

  const [restaurants, setRestaurants] = useState<BackendRestaurant[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [draftQuery, setDraftQuery] = useState(initialQuery);

  const [selectedCategory, setSelectedCategory] =
    useState(initialCategory);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [currentSort, setCurrentSort] = useState<SortOption>("distance");
  const {
    campusLabel,
    isLocating,
    requestLocation,
    calculateDistance,
  } = useUserLocation();

  useEffect(() => {
    // Prompt for browser location on mount silently if supported
    if (typeof window !== "undefined" && navigator.geolocation) {
      requestLocation(false);
    }
  }, [requestLocation]);

  useEffect(() => {
    setQuery(initialQuery);
    setDraftQuery(initialQuery);
    setSelectedCategory(initialCategory);
    setPage(1);
  }, [initialQuery, initialCategory]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await getRestaurantsPage({
          page,
          limit: 20,
          q: query.trim() || undefined,
          category:
            selectedCategory !== "All"
              ? selectedCategory
              : undefined,
          include_menu: false,
        });

        if (!cancelled) {
          setRestaurants(data.items);
          setPages(data.pages);
          setTotal(data.total);
          setPage(data.page);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load restaurants."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [page, query, selectedCategory]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQuery(draftQuery.trim());
  }

  const visibleRestaurants = useMemo(() => {
    const list = restaurants.filter(
      (r) =>
        r.is_verified === true ||
        r.verification_status === "approved" ||
        r.verification_status === "APPROVED"
    );

    const withDistance = list.map((r) => {
      const dist = calculateDistance(r.latitude, r.longitude);
      return {
        ...r,
        computedDistanceKm: dist,
        distanceBadge: formatDistance(dist),
      };
    });

    return withDistance.sort((a, b) => {
      if (currentSort === "distance") {
        const distA = a.computedDistanceKm ?? 9999;
        const distB = b.computedDistanceKm ?? 9999;
        return distA - distB;
      }
      if (currentSort === "rating") {
        const ratingA = Number(a.rating) || 0;
        const ratingB = Number(b.rating) || 0;
        return ratingB - ratingA;
      }
      if (currentSort === "delivery_time" || currentSort === "fastest") {
        const timeA = parseInt(String(a.delivery_time || "30"), 10) || 30;
        const timeB = parseInt(String(b.delivery_time || "30"), 10) || 30;
        return timeA - timeB;
      }
      if (currentSort === "price" || currentSort === "price_asc") {
        const priceA = Number(a.min_order_amount ?? 0);
        const priceB = Number(b.min_order_amount ?? 0);
        return priceA - priceB;
      }
      return 0;
    });
  }, [restaurants, currentSort, calculateDistance]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="w-full max-w-md md:max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href={ROUTES.HOME}
            className="text-sm font-medium text-gray-500 hover:text-orange-600"
          >
            ← Back to Home
          </Link>


          <h1 className="mt-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Restaurants
          </h1>

          <p className="mt-2 text-gray-500">
            Browse live restaurants available on CampusBite.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="mb-5">
          <input
            type="search"
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder="Search by restaurant, cuisine, or email..."
            className="h-12 w-full rounded-xl border bg-white px-4 outline-none focus:border-orange-500"
          />
        </form>

        {/* Category filters */}
        <div className="mb-8 flex flex-wrap gap-3">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                setSelectedCategory(category);
                setPage(1);
              }}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                selectedCategory === category
                  ? "bg-orange-500 text-white"
                  : "border bg-white hover:bg-orange-50"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Modern Sort & Filter Bar with Geolocation */}
        <SortFilterBar
          currentSort={currentSort}
          onSortChange={setCurrentSort}
          userLocationName={campusLabel}
          onLocationClick={() => requestLocation(true)}
          userCampusLabel={campusLabel}
          isLocating={isLocating}
          onDetectLocation={() => requestLocation(true)}
        />

        {loading && (
          <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
            Loading restaurants...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-10 text-center text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && visibleRestaurants.length === 0 && (
          <EmptyState
            icon="🍽️"
            title="No restaurants found"
            description={
              query || selectedCategory !== "All"
                ? "Try a different search or category."
                : "No restaurants are available yet."
            }
          />
        )}

        {!loading && !error && visibleRestaurants.length > 0 && (
          <>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {visibleRestaurants.map((restaurant) => (
                <RestaurantCard
                  key={restaurant._id}
                  restaurant={restaurant}
                  distanceLabel={restaurant.distanceBadge}
                />
              ))}
            </div>

            <div className="mt-8">
              <PaginationControls
                page={page}
                pages={pages}
                total={total}
                disabled={loading}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}