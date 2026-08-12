"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import PaginationControls from "@/components/ui/PaginationControls";
import { asPaginated } from "@/lib/pagination";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import { AuthHttpError, authJson, publicFetch } from "@/services/authFetch";

type MenuItem = {
  _id: string;
  restaurant_email: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  available: boolean;
  bestseller?: boolean;
  is_bestseller?: boolean;
  best_seller?: boolean;
};

type MenuQuery = {
  category?: string;
  available?: boolean;
  q?: string;
  page?: number;
  limit?: number;
};

const selectClassName =
  "h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function isBestseller(item: MenuItem) {
  return Boolean(item.bestseller || item.is_bestseller || item.best_seller);
}

function MenuSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-80 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function MenuPage() {
  const router = useRouter();

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState("");

  const filtersRef = useRef({ q, category, availability, page });

  useEffect(() => {
    filtersRef.current = { q, category, availability, page };
  }, [q, category, availability, page]);

  const categories = useMemo(() => {
    const fromFilter = allCategories.length
      ? allCategories
      : Array.from(
          new Set(menu.map((item) => item.category).filter(Boolean))
        ).sort();
    return fromFilter;
  }, [allCategories, menu]);

  function buildPath(filters: MenuQuery) {
    const email = getRestaurantOwnerEmail();
    if (!email) return null;

    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.available !== undefined) {
      params.set("available", String(filters.available));
    }
    if (filters.q?.trim()) params.set("q", filters.q.trim());
    params.set("page", String(filters.page ?? 1));
    params.set("limit", String(filters.limit ?? 20));

    return `/menu/${encodeURIComponent(email)}?${params.toString()}`;
  }

  function currentFilters(overrides: Partial<MenuQuery> & {
    availability?: string;
    q?: string;
    category?: string;
    page?: number;
  } = {}): MenuQuery {
    const latest = filtersRef.current;
    const nextAvailability =
      overrides.availability ?? latest.availability;
    const available =
      nextAvailability === "true"
        ? true
        : nextAvailability === "false"
          ? false
          : undefined;

    return {
      q: (overrides.q ?? latest.q).trim() || undefined,
      category: (overrides.category ?? latest.category) || undefined,
      available,
      page: overrides.page ?? latest.page,
      limit: 20,
    };
  }

  async function loadCategories(email: string) {
    const cats = new Set<string>();
    let nextPage = 1;
    let totalPages = 1;

    do {
      const catsRes = await publicFetch(
        `/menu/${encodeURIComponent(email)}?page=${nextPage}&limit=100`,
        { cache: "no-store" }
      );
      if (!catsRes.ok) break;
      const data = asPaginated<MenuItem>(await catsRes.json());
      for (const item of data.items) {
        if (item.category) cats.add(item.category);
      }
      totalPages = data.pages;
      nextPage += 1;
    } while (nextPage <= totalPages);

    setAllCategories(Array.from(cats).sort());
  }

  async function fetchMenu(
    filters: MenuQuery = currentFilters(),
    options: { showLoading?: boolean; refreshCategories?: boolean } = {}
  ) {
    if (options.showLoading) setLoading(true);

    try {
      const email = getRestaurantOwnerEmail();
      if (!email) {
        setError("Restaurant owner email not found. Please log in again.");
        router.replace("/restaurant/login");
        return;
      }

      if (options.refreshCategories) {
        await loadCategories(email);
      }

      const path = buildPath(filters);
      if (!path) return;

      const res = await publicFetch(path, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Unable to load menu.");
      }

      const data = asPaginated<MenuItem>(await res.json());
      setMenu(data.items);
      setPage(data.page);
      setPages(data.pages);
      setTotal(data.total);
      setError("");
    } catch (err) {
      console.error("Failed to fetch menu:", err);
      setError(
        err instanceof Error ? err.message : "Unable to load menu."
      );
      setMenu([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const email = getRestaurantOwnerEmail();
        if (!email) {
          setError("Restaurant owner email not found. Please log in again.");
          router.replace("/restaurant/login");
          return;
        }

        await loadCategories(email);
        if (cancelled) return;

        const path = buildPath(currentFilters({ page: 1 }));
        if (!path) return;
        const res = await publicFetch(path, { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to load menu.");
        const data = asPaginated<MenuItem>(await res.json());
        if (cancelled) return;

        setMenu(data.items);
        setPage(data.page);
        setPages(data.pages);
        setTotal(data.total);
        setError("");
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch menu:", err);
        setError("Unable to load menu.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initialLoad();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function toggleAvailability(item: MenuItem) {
    try {
      setUpdatingId(item._id);

      const email = getRestaurantOwnerEmail();
      if (!email) {
        router.replace("/restaurant/login");
        return;
      }

      await authJson(`/menu/${item._id}`, {
        role: "restaurant_owner",
        method: "PUT",
        body: JSON.stringify({
          restaurant_email: email,
          name: item.name,
          description: item.description,
          price: Number(item.price),
          category: item.category,
          image: item.image,
          available: !item.available,
        }),
      });

      setMenu((prev) =>
        prev.map((menuItem) =>
          menuItem._id === item._id
            ? { ...menuItem, available: !menuItem.available }
            : menuItem
        )
      );
      toast.success(
        !item.available ? "Item marked available" : "Item marked unavailable"
      );
    } catch (err) {
      console.error("Availability Update Error:", err);
      if (err instanceof AuthHttpError && err.status === 401) return;
      toast.error(
        err instanceof Error
          ? err.message
          : "Unable to update availability."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteItem(id: string, name: string) {
    const confirmDelete = window.confirm(
      `Delete "${name}"? This cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      await authJson(`/menu/${id}`, {
        role: "restaurant_owner",
        method: "DELETE",
      });
      toast.success("Food deleted successfully");
      await fetchMenu(currentFilters(), { refreshCategories: true });
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) return;
      toast.error(
        err instanceof Error ? err.message : "Unable to delete item."
      );
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    void fetchMenu(currentFilters({ page: 1 }), { showLoading: true });
  }

  function renderItem(item: MenuItem) {
    return (
      <div
        key={item._id}
        className="overflow-hidden rounded-2xl border bg-white shadow-sm"
      >
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image || "/images/restaurants/default.jpg"}
            alt={item.name}
            className="h-48 w-full object-cover"
          />
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                item.available
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {item.available ? "Available" : "Unavailable"}
            </span>
            {isBestseller(item) && (
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                Bestseller
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div>
            <h2 className="text-xl font-bold">{item.name}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-gray-500">
              {item.description}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-bold text-orange-600">
              ₹{Number(item.price).toFixed(2)}
            </p>
            <p className="rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium">
              {item.category || "—"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void toggleAvailability(item)}
            disabled={updatingId === item._id}
            className={`w-full rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
              item.available
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {updatingId === item._id
              ? "Updating..."
              : item.available
                ? "Turn Off"
                : "Make Available"}
          </button>

          <div className="flex gap-3">
            <Button
              type="button"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={() =>
                router.push(`/restaurant/dashboard/menu/edit/${item._id}`)
              }
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-red-200 bg-red-600 text-white hover:bg-red-700 hover:text-white"
              onClick={() => void deleteItem(item._id, item.name)}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Restaurant Menu</h1>
          <p className="mt-2 text-gray-500">
            Search, filter, and manage your food items
          </p>
        </div>

        <Link
          href="/restaurant/dashboard/menu/add"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700"
        >
          <Plus size={16} />
          Add Food
        </Link>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="relative xl:col-span-2">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by item name…"
            className="h-10 pl-9"
          />
        </div>

        <select
          value={category}
          onChange={(e) => {
            const next = e.target.value;
            setCategory(next);
            setPage(1);
            void fetchMenu(currentFilters({ category: next, page: 1 }), {
              showLoading: true,
            });
          }}
          className={selectClassName}
          aria-label="Category"
        >
          <option value="">All categories</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={availability}
            onChange={(e) => {
              const next = e.target.value;
              setAvailability(next);
              setPage(1);
              void fetchMenu(currentFilters({ availability: next, page: 1 }), {
                showLoading: true,
              });
            }}
            className={selectClassName}
            aria-label="Availability"
          >
            <option value="">All availability</option>
            <option value="true">Available</option>
            <option value="false">Unavailable</option>
          </select>

          <Button
            type="submit"
            variant="outline"
            className="h-10 shrink-0 gap-2"
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </Button>
        </div>
      </form>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <MenuSkeleton />
      ) : menu.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold">No menu items found</h2>
          <p className="mt-3 text-gray-500">
            Try clearing filters, or add your first food item.
          </p>
          <Link
            href="/restaurant/dashboard/menu/add"
            className="mt-6 inline-flex h-10 items-center rounded-lg bg-orange-600 px-5 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Add Food
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop-ish denser table for large screens */}
          <div className="hidden overflow-x-auto rounded-2xl border bg-white xl:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Availability</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {menu.map((item) => (
                  <tr key={item._id} className="border-t align-middle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image || "/images/restaurants/default.jpg"}
                          alt={item.name}
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{item.name}</span>
                            {isBestseller(item) && (
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                                Bestseller
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-1 text-xs text-gray-500">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{item.category || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-orange-600">
                      ₹{Number(item.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                            item.available
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.available ? "Available" : "Unavailable"}
                        </span>
                        <button
                          type="button"
                          onClick={() => void toggleAvailability(item)}
                          disabled={updatingId === item._id}
                          className="w-fit text-left text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                        >
                          {updatingId === item._id
                            ? "Updating..."
                            : "Toggle"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() =>
                            router.push(
                              `/restaurant/dashboard/menu/edit/${item._id}`
                            )
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() =>
                            void deleteItem(item._id, item.name)
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:hidden">
            {menu.map((item) => renderItem(item))}
          </div>

          <PaginationControls
            page={page}
            pages={pages}
            total={total}
            disabled={loading}
            onPageChange={(next) => {
              setPage(next);
              void fetchMenu(currentFilters({ page: next }), {
                showLoading: true,
              });
            }}
          />
        </>
      )}
    </main>
  );
}
