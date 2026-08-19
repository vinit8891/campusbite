"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PaginationControls from "@/components/ui/PaginationControls";
import { ROUTES } from "@/lib/routes";
import { useRestaurantMenu } from "@/hooks/restaurant/useRestaurantMenu";
import { MenuFilterBar } from "@/components/restaurant/MenuFilterBar";
import { MenuTableView } from "@/components/restaurant/MenuTableView";
import { MenuCardGrid } from "@/components/restaurant/MenuCardGrid";

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
  const {
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
  } = useRestaurantMenu();

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
          href={ROUTES.RESTAURANT_MENU_ADD}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700"
        >
          <Plus size={16} />
          Add Food
        </Link>
      </div>

      <MenuFilterBar
        q={q}
        setQ={setQ}
        category={category}
        setCategory={setCategory}
        categories={categories}
        availability={availability}
        setAvailability={setAvailability}
        loading={loading}
        onSearchSubmit={handleSearchSubmit}
        onCategoryChange={(next) => {
          setCategory(next);
          setPage(1);
          void fetchMenu(currentFilters({ category: next, page: 1 }), {
            showLoading: true,
          });
        }}
        onAvailabilityChange={(next) => {
          setAvailability(next);
          setPage(1);
          void fetchMenu(currentFilters({ availability: next, page: 1 }), {
            showLoading: true,
          });
        }}
      />

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
            href={ROUTES.RESTAURANT_MENU_ADD}
            className="mt-6 inline-flex h-10 items-center rounded-lg bg-orange-600 px-5 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Add Food
          </Link>
        </div>
      ) : (
        <>
          <MenuTableView
            menu={menu}
            updatingId={updatingId}
            onToggleAvailability={(item) => void toggleAvailability(item)}
            onDeleteItem={(id, name) => void deleteItem(id, name)}
          />

          <MenuCardGrid
            menu={menu}
            updatingId={updatingId}
            onToggleAvailability={(item) => void toggleAvailability(item)}
            onDeleteItem={(id, name) => void deleteItem(id, name)}
          />

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
