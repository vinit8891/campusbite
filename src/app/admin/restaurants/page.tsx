"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import DeleteRestaurantButton from "@/components/admin/DeleteRestaurantButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AuthHttpError,
  getRestaurants,
  type BackendRestaurant,
} from "@/services/adminService";

function RestaurantsTableSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border bg-white p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((__, col) => (
            <Skeleton key={col} className="h-8 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<BackendRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRestaurants() {
    setLoading(true);
    setError("");

    try {
      const data = await getRestaurants();
      setRestaurants(data);
    } catch (err) {
      if (err instanceof AuthHttpError && err.status === 401) {
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : "Unable to load restaurants";
      setError(message);
      setRestaurants([]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await getRestaurants();
        if (cancelled) return;
        setRestaurants(data);
        setError("");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AuthHttpError && err.status === 401) {
          return;
        }
        const message =
          err instanceof Error
            ? err.message
            : "Unable to load restaurants";
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Restaurants</h1>
          <p className="mt-2 text-gray-500">
            Manage CampusBite restaurant listings
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadRestaurants()}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </Button>
          <Link
            href="/admin/add-restaurant"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-medium text-white hover:bg-orange-600"
          >
            <Plus size={16} />
            Add Restaurant
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <RestaurantsTableSkeleton />
      ) : restaurants.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white px-6 py-16 text-center">
          <p className="text-lg font-semibold text-gray-700">
            No restaurants yet
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Add your first restaurant to get started.
          </p>
          <Link
            href="/admin/add-restaurant"
            className="mt-6 inline-flex rounded-lg bg-orange-500 px-5 py-3 text-white hover:bg-orange-600"
          >
            Add Restaurant
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Cuisine</th>
                <th className="px-4 py-3 font-semibold">Rating</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((restaurant) => (
                <tr key={restaurant._id} className="border-t">
                  <td className="px-4 py-3 font-medium">
                    {restaurant.name}
                  </td>
                  <td className="px-4 py-3">
                    {restaurant.cuisine || "—"}
                  </td>
                  <td className="px-4 py-3">
                    ⭐ {restaurant.rating ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/edit-restaurant/${restaurant._id}`}
                        className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                      >
                        Edit
                      </Link>
                      <DeleteRestaurantButton
                        id={restaurant._id}
                        name={restaurant.name}
                        onDeleted={() => void loadRestaurants()}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
