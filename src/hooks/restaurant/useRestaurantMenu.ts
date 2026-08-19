"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import { ROUTES } from "@/lib/routes";
import { AuthHttpError } from "@/services/authFetch";
import {
  type MenuItem,
  type MenuQuery,
  getMenuCategories,
  getRestaurantMenu,
  updateMenuItem,
  deleteMenuItem,
} from "@/services/menuService";

export function useRestaurantMenu() {
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
    if (allCategories.length) return allCategories;
    const set = new Set<string>();
    for (const item of menu) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set).sort();
  }, [allCategories, menu]);

  function currentFilters(
    overrides: Partial<MenuQuery> & {
      availability?: string;
      q?: string;
      category?: string;
      page?: number;
    } = {}
  ): MenuQuery {
    const latest = filtersRef.current;
    const nextAvailability = overrides.availability ?? latest.availability;
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
    try {
      const cats = await getMenuCategories(email);
      setAllCategories(cats);
    } catch {
      setAllCategories([]);
    }
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
        router.replace(ROUTES.RESTAURANT_LOGIN);
        return;
      }
      if (options.refreshCategories) await loadCategories(email);
      const data = await getRestaurantMenu(email, filters);
      setMenu(data.items);
      setPage(data.page);
      setPages(data.pages);
      setTotal(data.total);
      setError("");
    } catch (err) {
      console.error("Failed to fetch menu:", err);
      setError(err instanceof Error ? err.message : "Unable to load menu.");
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
          router.replace(ROUTES.RESTAURANT_LOGIN);
          return;
        }
        await loadCategories(email);
        if (cancelled) return;
        const data = await getRestaurantMenu(email, currentFilters({ page: 1 }));
        if (cancelled) return;
        setMenu(data.items);
        setPage(data.page);
        setPages(data.pages);
        setTotal(data.total);
        setError("");
      } catch {
        if (!cancelled) setError("Unable to load menu.");
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
    const itemId = item._id || String(item.id || "");
    try {
      setUpdatingId(itemId);
      const email = getRestaurantOwnerEmail();
      if (!email) {
        router.replace(ROUTES.RESTAURANT_LOGIN);
        return;
      }
      await updateMenuItem(itemId, {
        restaurant_email: email,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        category: item.category,
        image: item.image,
        available: !item.available,
      });
      setMenu((prev) =>
        prev.map((m) => (m._id === item._id ? { ...m, available: !m.available } : m))
      );
      toast.success(!item.available ? "Item marked available" : "Item marked unavailable");
    } catch (err) {
      if (err instanceof AuthHttpError && err.status === 401) return;
      toast.error(err instanceof Error ? err.message : "Unable to update availability.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteItem(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteMenuItem(id);
      toast.success("Food deleted successfully");
      await fetchMenu(currentFilters(), { refreshCategories: true });
    } catch (err) {
      if (err instanceof AuthHttpError && err.status === 401) return;
      toast.error(err instanceof Error ? err.message : "Unable to delete item.");
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    void fetchMenu(currentFilters({ page: 1 }), { showLoading: true });
  }

  return {
    menu,
    categories,
    loading,
    updatingId,
    error,
    page,
    pages,
    total,
    q,
    setQ,
    category,
    setCategory,
    availability,
    setAvailability,
    setPage,
    handleSearchSubmit,
    fetchMenu,
    currentFilters,
    toggleAvailability,
    deleteItem,
  };
}
