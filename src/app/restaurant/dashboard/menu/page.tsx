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

  const inStockCount = menu.filter((item) => item.available !== false).length;
  const soldOutCount = menu.filter((item) => item.available === false).length;
  const totalCount = total || menu.length;

  return (
    <main className="space-y-4 sm:space-y-6">
      {/* =========================================================
          1. COMPACT STICKY MOBILE HEADER (< md)
      ========================================================= */}
      <div className="sticky top-0 z-30 -mx-4 -mt-2 px-4 py-2.5 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-2xs md:hidden flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black text-stone-900 tracking-tight">
            Menu
          </h1>
          <span className="flex items-center px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-bold text-xs border border-stone-200/80">
            {totalCount} {totalCount === 1 ? "item" : "items"}
          </span>
        </div>

        <Link
          href={ROUTES.RESTAURANT_MENU_ADD}
          className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1 shadow-xs active:scale-95 transition-all shrink-0"
        >
          <Plus size={14} />
          <span>Add Food</span>
        </Link>
      </div>

      {/* =========================================================
          2. DESKTOP TITLE & ADD BUTTON (md+)
      ========================================================= */}
      <div className="hidden md:flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Restaurant Menu
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Search, filter, and manage your food items
          </p>
        </div>

        <Link
          href={ROUTES.RESTAURANT_MENU_ADD}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-600 px-5 text-sm font-bold text-white hover:bg-orange-700 shadow-sm transition-all"
        >
          <Plus size={16} />
          <span>Add Food</span>
        </Link>
      </div>

      {/* =========================================================
          3. FILTER BAR
      ========================================================= */}
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
        inStockCount={inStockCount}
        soldOutCount={soldOutCount}
        totalCount={totalCount}
      />

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <MenuSkeleton />
      ) : menu.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center shadow-2xs">
          <span className="text-4xl mb-2" role="img" aria-label="Menu empty">
            🍽️
          </span>
          <h2 className="text-xl font-extrabold text-stone-900 mt-2">
            No menu items found
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-stone-500 max-w-sm mx-auto">
            Try clearing filters or search terms, or add your first food item.
          </p>
          <Link
            href={ROUTES.RESTAURANT_MENU_ADD}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-600 px-6 text-sm font-bold text-white hover:bg-orange-700 shadow-sm transition-all"
          >
            <Plus size={16} />
            <span>Add Food</span>
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
