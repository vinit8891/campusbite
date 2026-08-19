import { Button } from "@/components/ui/button";
import { isBestseller } from "@/lib/menuDomain";
import { menuEditPath } from "@/lib/routes";
import type { MenuItem } from "@/types";
import { useRouter } from "next/navigation";

type MenuTableViewProps = {
  menu: MenuItem[];
  updatingId: string | null;
  onToggleAvailability: (item: MenuItem) => void;
  onDeleteItem: (id: string, name: string) => void;
};

export function MenuTableView({
  menu,
  updatingId,
  onToggleAvailability,
  onDeleteItem,
}: MenuTableViewProps) {
  const router = useRouter();

  return (
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
                    onClick={() => onToggleAvailability(item)}
                    disabled={updatingId === item._id}
                    className="w-fit text-left text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {updatingId === item._id ? "Updating..." : "Toggle"}
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
                        menuEditPath(item._id || String(item.id || ""))
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
                      void onDeleteItem(
                        item._id || String(item.id || ""),
                        item.name
                      )
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
  );
}
