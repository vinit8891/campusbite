import { authJson, publicJson } from "@/services/authFetch";
import { asPaginated, type Paginated } from "@/lib/pagination";
import { withQuery } from "@/lib/formatters";
import type { MenuItem, MenuQuery } from "@/types";

export type { MenuItem, MenuQuery };


export async function getRestaurantMenu(
  email: string,
  filters: MenuQuery = {}
): Promise<Paginated<MenuItem>> {
  const path = withQuery(`/menu/${encodeURIComponent(email)}`, {
    q: filters.q,
    category: filters.category,
    available: filters.available,
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
  });

  const data = await publicJson<unknown>(path, { cache: "no-store" });
  return asPaginated<MenuItem>(data);
}

export async function getMenuItemById(id: string): Promise<MenuItem> {
  return publicJson<MenuItem>(`/menu/item/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
}

export async function getMenuCategories(email: string): Promise<string[]> {
  const cats = new Set<string>();
  let nextPage = 1;
  let totalPages = 1;

  do {
    try {
      const page = await getRestaurantMenu(email, {
        page: nextPage,
        limit: 100,
      });
      for (const item of page.items) {
        if (item.category) cats.add(item.category);
      }
      totalPages = page.pages;
      nextPage += 1;
    } catch {
      break;
    }
  } while (nextPage <= totalPages);

  return Array.from(cats).sort();
}

export async function addMenuItem(data: Omit<MenuItem, "_id">) {
  return authJson<{ message: string; id: string }>("/menu/", {
    role: "restaurant_owner",
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMenuItem(
  id: string,
  data: Partial<MenuItem>
) {
  return authJson<{ message: string }>(`/menu/${encodeURIComponent(id)}`, {
    role: "restaurant_owner",
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMenuItem(id: string) {
  return authJson<{ message: string }>(
    `/menu/${encodeURIComponent(id)}`,
    {
      role: "restaurant_owner",
      method: "DELETE",
    }
  );
}
