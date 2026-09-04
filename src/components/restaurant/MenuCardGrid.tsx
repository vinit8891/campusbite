"use client";

import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isBestseller } from "@/lib/menuDomain";
import { menuEditPath } from "@/lib/routes";
import type { MenuItem } from "@/types";

type MenuCardGridProps = {
  menu: MenuItem[];
  updatingId: string | null;
  onToggleAvailability: (item: MenuItem) => void;
  onDeleteItem: (id: string, name: string) => void;
};

export function MenuCardGrid({
  menu,
  updatingId,
  onToggleAvailability,
  onDeleteItem,
}: MenuCardGridProps) {
  const router = useRouter();

  return (
    <div className="space-y-3 md:space-y-0 md:grid md:gap-5 md:grid-cols-2 lg:grid-cols-3 xl:hidden">
      {menu.map((item) => {
        const isVeg = item.isVeg === true || item.type?.toLowerCase() === "veg";
        const isNonVeg =
          item.isVeg === false ||
          item.type?.toLowerCase() === "nonveg" ||
          item.type?.toLowerCase() === "non-veg";

        return (
          <div key={item._id || String(item.id || "")}>
            {/* =========================================================
                1. COMPACT HORIZONTAL MOBILE CARD (< md)
            ========================================================= */}
            <div className="md:hidden flex items-center gap-3 p-3 rounded-2xl border border-stone-200/90 bg-white shadow-xs hover:shadow-sm transition-all">
              {/* Left: 72×72px Thumbnail + Bestseller Badge */}
              <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-stone-100 border border-stone-200/70">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image || "/images/restaurants/default.jpg"}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
                {isBestseller(item) && (
                  <span
                    className="absolute top-1 left-1 bg-amber-500/90 text-white text-[9px] font-black px-1 rounded-md shadow-xs"
                    title="Bestseller"
                  >
                    🔥
                  </span>
                )}
              </div>

              {/* Center: Info */}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  {isVeg && (
                    <span
                      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-xs border border-emerald-600 p-0.5 shrink-0"
                      title="Vegetarian"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    </span>
                  )}
                  {isNonVeg && (
                    <span
                      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-xs border border-rose-600 p-0.5 shrink-0"
                      title="Non-Vegetarian"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                    </span>
                  )}
                  <h3 className="text-[15px] font-extrabold text-stone-900 truncate">
                    {item.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-black text-orange-600">
                    ₹{Number(item.price).toFixed(2)}
                  </span>
                  {item.category && (
                    <>
                      <span className="text-stone-300">•</span>
                      <span className="text-[11px] font-semibold text-stone-500 truncate">
                        {item.category}
                      </span>
                    </>
                  )}
                </div>

                {/* Quick Action Icons: Edit & Delete */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(menuEditPath(item._id || String(item.id || "")))
                    }
                    className="text-[11px] font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-stone-100 transition-colors cursor-pointer"
                    aria-label={`Edit ${item.name}`}
                  >
                    <Pencil size={11} className="text-stone-400" />
                    <span>Edit</span>
                  </button>
                  <span className="text-stone-300">•</span>
                  <button
                    type="button"
                    onClick={() =>
                      void onDeleteItem(
                        item._id || String(item.id || ""),
                        item.name
                      )
                    }
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 size={11} className="text-rose-400" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Right: 1-Tap Stock Switch */}
              <div className="shrink-0 flex flex-col items-end justify-center">
                <button
                  type="button"
                  onClick={() => void onToggleAvailability(item)}
                  disabled={updatingId === item._id}
                  className={`h-9 px-2.5 rounded-xl text-xs font-extrabold shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    item.available
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                      : "bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100"
                  }`}
                  aria-label={
                    item.available
                      ? "In Stock (Tap to Pause)"
                      : "Sold Out (Rush Hour)"
                  }
                >
                  {updatingId === item._id ? (
                    <span className="text-[11px]">Updating…</span>
                  ) : item.available ? (
                    <span>✅ In Stock</span>
                  ) : (
                    <span>❌ Sold Out</span>
                  )}
                </button>
              </div>
            </div>

            {/* =========================================================
                2. DESKTOP GRID CARD (md+)
            ========================================================= */}
            <div className="hidden md:flex flex-col justify-between overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-xs transition-all hover:shadow-md h-full">
              <div>
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image || "/images/restaurants/default.jpg"}
                    alt={item.name}
                    className="h-48 w-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold shadow-xs ${
                        item.available
                          ? "bg-emerald-100/95 text-emerald-800 border border-emerald-300"
                          : "bg-rose-100/95 text-rose-800 border border-rose-300"
                      }`}
                    >
                      {item.available ? "✅ In Stock" : "❌ Sold Out"}
                    </span>
                    {isBestseller(item) && (
                      <span className="rounded-full bg-amber-100/95 border border-amber-300 px-3 py-1 text-xs font-extrabold text-amber-800 shadow-xs">
                        🔥 Bestseller
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">
                      {item.name}
                    </h2>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-xs font-medium text-stone-500">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xl font-black text-orange-600">
                      ₹{Number(item.price).toFixed(2)}
                    </p>
                    <span className="rounded-xl bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700 border border-stone-200">
                      {item.category || "General"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 p-5 pt-0">
                {/* 1-Tap Fast Stock Controller Pill */}
                <button
                  type="button"
                  onClick={() => void onToggleAvailability(item)}
                  disabled={updatingId === item._id}
                  className={`h-11 w-full rounded-2xl px-4 py-2 text-xs font-extrabold shadow-xs transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    item.available
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                      : "bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100"
                  }`}
                  aria-label={
                    item.available
                      ? "In Stock (Tap to Pause)"
                      : "Sold Out (Rush Hour)"
                  }
                >
                  {updatingId === item._id
                    ? "Updating stock…"
                    : item.available
                      ? "✅ In Stock (Tap to Pause)"
                      : "❌ Sold Out (Rush Hour)"}
                </button>

                {/* Edit & Delete Action Buttons */}
                <div className="flex gap-2.5">
                  <Button
                    type="button"
                    className="h-11 flex-1 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs active:scale-98"
                    onClick={() =>
                      router.push(menuEditPath(item._id || String(item.id || "")))
                    }
                  >
                    ✏️ Edit Item
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1 rounded-xl border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 font-bold text-xs active:scale-98"
                    onClick={() =>
                      void onDeleteItem(
                        item._id || String(item.id || ""),
                        item.name
                      )
                    }
                  >
                    🗑️ Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MenuCardGrid;

