import Link from "next/link";

import RestaurantForm from "@/components/admin/RestaurantForm";
import { ROUTES } from "@/lib/routes";

export default function AddRestaurantPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={ROUTES.ADMIN_RESTAURANTS}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Back to Restaurants
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Add Restaurant
        </h1>
        <p className="mt-2 text-sm text-gray-500 sm:text-base">
          Create a new restaurant listing for CampusBite
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
        <RestaurantForm />
      </div>
    </div>
  );
}
