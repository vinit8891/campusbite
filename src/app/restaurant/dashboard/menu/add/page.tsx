import Link from "next/link";
import { ROUTES } from "@/lib/routes";

import MenuItemForm from "@/components/restaurant/MenuItemForm";

export default function AddFoodPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={ROUTES.RESTAURANT_MENU}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Back to Menu
        </Link>

        <h1 className="mt-3 text-4xl font-bold">Add Food</h1>
        <p className="mt-2 text-gray-500">
          Create a new item for your restaurant menu
        </p>
      </div>

      <MenuItemForm mode="add" />
    </main>
  );
}
