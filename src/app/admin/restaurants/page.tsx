"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import DeleteRestaurantButton from "@/components/admin/DeleteRestaurantButton";
import PaginationControls from "@/components/ui/PaginationControls";
import { Button } from "@/components/ui/button";
import {
  ROUTES,
  adminEditRestaurantPath,
} from "@/lib/routes";

import { AuthHttpError } from "@/services/adminService";
import {
  getRestaurantsPage,
  type BackendRestaurant,
} from "@/services/restaurantService";

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<BackendRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function loadRestaurants(nextPage = page) {
    setLoading(true);
    setError("");

    try {
      const data = await getRestaurantsPage({
        page: nextPage,
        limit: 20,
        include_menu: false,
      });
      setRestaurants(data.items);
      setPage(data.page);
      setPages(data.pages);
      setTotal(data.total);
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
        const data = await getRestaurantsPage({
          page: 1,
          limit: 20,
          include_menu: false,
        });
        if (cancelled) return;
        setRestaurants(data.items);
        setPage(data.page);
        setPages(data.pages);
        setTotal(data.total);
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
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <AdminPageHeader
        title="Restaurants"
        description="Manage CampusBite restaurant listings"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2"
              onClick={() => void loadRestaurants(page)}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </Button>
            <Link
              href={ROUTES.ADMIN_ADD_RESTAURANT}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-medium text-white hover:bg-orange-600"
            >
              <Plus size={16} />
              Add Restaurant
            </Link>
          </>
        }
      />

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <AdminTableSkeleton rows={5} columns={4} />
      ) : restaurants.length === 0 ? (
        <AdminEmptyState
          title="No restaurants yet"
          description="Add your first restaurant to get started."
          action={
            <Link
              href={ROUTES.ADMIN_ADD_RESTAURANT}
              className="inline-flex h-10 items-center rounded-lg bg-orange-500 px-5 text-sm font-medium text-white hover:bg-orange-600"
            >
              Add Restaurant
            </Link>
          }
        />
      ) : (
        <>
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
                          href={adminEditRestaurantPath(restaurant._id)}
                          className="inline-flex h-9 items-center rounded-lg bg-blue-500 px-4 text-sm text-white hover:bg-blue-600"
                        >
                          Edit
                        </Link>
                        <DeleteRestaurantButton
                          id={restaurant._id}
                          name={restaurant.name}
                          onDeleted={() => void loadRestaurants(page)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationControls
            page={page}
            pages={pages}
            total={total}
            disabled={loading}
            onPageChange={(next) => {
              setPage(next);
              void loadRestaurants(next);
            }}
          />
        </>
      )}
    </div>
  );
}
