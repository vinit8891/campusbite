import { useRouter } from "next/navigation";
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
    <div className="grid gap-5 sm:gap-6 md:grid-cols-2 xl:hidden">
      {menu.map((item) => (
        <div
          key={item._id}
          className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-xs transition-all hover:shadow-md flex flex-col justify-between"
        >
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
      ))}
    </div>
  );
}

