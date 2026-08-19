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
    <div className="grid gap-6 md:grid-cols-2 xl:hidden">
      {menu.map((item) => (
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
              onClick={() => void onToggleAvailability(item)}
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
                  router.push(menuEditPath(item._id || String(item.id || "")))
                }
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-red-200 bg-red-600 text-white hover:bg-red-700 hover:text-white"
                onClick={() =>
                  void onDeleteItem(
                    item._id || String(item.id || ""),
                    item.name
                  )
                }
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
