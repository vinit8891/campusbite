"use client";

import { useMemo, useState } from "react";
import MenuCard from "@/components/menu/MenuCard";

type MenuItem = {
  _id: string;
  name: string;
  description?: string;
  image: string;
  price: number;
  available?: boolean;
  category?: string;
  isVeg?: boolean;
  type?: string;
};

type Restaurant = {
  _id?: string;
  email: string;
  name: string;
};

type RestaurantMenuProps = {
  restaurant: Restaurant;
  groupedMenu: Record<string, MenuItem[]>;
  totalItems: number;
};

type FilterType = "all" | "available" | "veg" | "nonveg";
type SortType = "default" | "price-low" | "price-high" | "name";

export default function RestaurantMenu({
  restaurant,
  groupedMenu,
  totalItems,
}: RestaurantMenuProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("default");

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();

    return Object.entries(groupedMenu)
      .map(([category, originalItems]) => {
        let items = [...originalItems];

        // Search filter
        if (term) {
          items = items.filter((item) => {
            return (
              item.name.toLowerCase().includes(term) ||
              (item.description ?? "").toLowerCase().includes(term)
            );
          });
        }

        // Availability / Veg / Non-Veg filters
        if (filter === "available") {
          items = items.filter((item) => item.available !== false);
        }

        if (filter === "veg") {
          items = items.filter(
            (item) =>
              item.isVeg === true ||
              item.type?.toLowerCase() === "veg"
          );
        }

        if (filter === "nonveg") {
          items = items.filter(
            (item) =>
              item.isVeg === false ||
              item.type?.toLowerCase() === "nonveg"
          );
        }

        // Sorting
        items.sort((a, b) => {
          if (sort === "price-low") {
            return a.price - b.price;
          }

          if (sort === "price-high") {
            return b.price - a.price;
          }

          if (sort === "name") {
            return a.name.localeCompare(b.name);
          }

          return 0;
        });

        return {
          category,
          items,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [groupedMenu, search, filter, sort]);

  const resultCount = filteredGroups.reduce(
    (sum, group) => sum + group.items.length,
    0
  );

  const iconMap: Record<string, string> = {
    Pizza: "🍕",
    Pasta: "🍝",
    Burger: "🍔",
    Rice: "🍚",
    Drinks: "🥤",
    Dessert: "🍰",
    Coffee: "☕",
    Sandwich: "🥪",
    Meals: "🍽️",
  };

  const filterButtonClass = (value: FilterType) =>
    `rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
      filter === value
        ? "border-orange-500 bg-orange-500 text-white shadow-md"
        : "border-gray-200 bg-white text-gray-700 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600"
    }`;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Menu Header */}
      <div className="mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Menu</h2>

          <p className="mt-1 text-gray-500">
            {totalItems} Dishes • {Object.keys(groupedMenu).length} Categories
          </p>
        </div>
      </div>

      {totalItems > 0 ? (
        <>
          {/* Premium Sticky Category Navigation */}
          <div className="sticky top-20 z-30 mb-8">
            <div className="overflow-x-auto rounded-full bg-white/90 px-3 py-3 shadow-lg backdrop-blur-md">
              <div className="flex w-max gap-3">
                {filteredGroups.map((group) => {
                  const category = group.category;

                  return (
                    <a
                      key={category}
                      href={`#category-${category
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                      className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600 hover:shadow-md"
                    >
                      <span>{iconMap[category] ?? "🍽️"}</span>
                      {category}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Filters + Sort */}
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={filterButtonClass("all")}
              >
                All
              </button>

              <button
                type="button"
                onClick={() => setFilter("available")}
                className={filterButtonClass("available")}
              >
                Available
              </button>

              <button
                type="button"
                onClick={() => setFilter("veg")}
                disabled
                title="Veg information is not available yet"
                className="cursor-not-allowed rounded-full border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400"
              >
                Veg
              </button>

              <button
                type="button"
                onClick={() => setFilter("nonveg")}
                disabled
                title="Veg/Non-Veg information is not available yet"
                className="cursor-not-allowed rounded-full border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400"
              >
                Non-Veg
              </button>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-3">
              <label
                htmlFor="menu-sort"
                className="text-sm font-medium text-gray-600"
              >
                Sort:
              </label>

              <select
                id="menu-sort"
                value={sort}
                onChange={(e) =>
                  setSort(e.target.value as SortType)
                }
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              >
                <option value="default">Recommended</option>

                <option value="price-low">
                  Price: Low to High
                </option>

                <option value="price-high">
                  Price: High to Low
                </option>

                <option value="name">
                  A–Z
                </option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                🔍
              </span>

              <input
                type="search"
                placeholder="Search dishes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          {/* Search / Filter Result Count */}
          {(search || filter !== "all") && (
            <p className="mb-6 text-sm text-gray-500">
              {resultCount}{" "}
              {resultCount === 1 ? "result" : "results"}
              {search && <> for "{search}"</>}
            </p>
          )}

          {/* Filtered Menu */}
          {filteredGroups.length > 0 ? (
            <div className="space-y-20">
              {filteredGroups.map(({ category, items }) => (
                <section
                  key={category}
                  id={`category-${category
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                  className="scroll-mt-32"
                >
                  {/* Category Heading */}
                  <div className="mb-8 flex items-end justify-between border-b border-gray-200 pb-3">
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                        {category}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {items.length}{" "}
                        {items.length === 1 ? "Dish" : "Dishes"}
                      </p>
                    </div>
                  </div>

                  {/* Menu Cards */}
                  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((item) => (
                      <div
                        key={item._id}
                        className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                      >
                        <MenuCard
                          item={{
                            _id: item._id,
                            name: item.name,
                            description: item.description,
                            image: item.image,
                            price: item.price,
                            available: item.available,
                          }}
                          restaurant={{
                            id: restaurant._id,
                            email: restaurant.email,
                            name: restaurant.name,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            /* No Search / Filter Results */
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-3xl">
                🍽️
              </div>

              <h3 className="mt-5 text-xl font-bold text-gray-900">
                No dishes found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-gray-500">
                Try another search term or change your filters.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                  setSort("default");
                }}
                className="mt-5 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-orange-600"
              >
                Clear Filters
              </button>
            </div>
          )}
        </>
      ) : (
        /* Empty Menu */
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-3xl">
            🍽️
          </div>

          <h3 className="mt-5 text-xl font-bold text-gray-900">
            Menu Coming Soon
          </h3>

          <p className="mx-auto mt-2 max-w-md text-gray-500">
            This restaurant has not added any menu items yet. Please check
            back soon.
          </p>
        </div>
      )}
    </section>
  );
}