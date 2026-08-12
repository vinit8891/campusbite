import Link from "next/link";

import RestaurantForm from "@/components/admin/RestaurantForm";

export default function AddRestaurantPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/restaurants"
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Back to Restaurants
        </Link>
        <h1 className="mt-3 text-4xl font-bold">Add Restaurant</h1>
        <p className="mt-2 text-gray-500">
          Create a new restaurant listing for CampusBite
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <RestaurantForm />
      </div>
    </div>
  );
}
