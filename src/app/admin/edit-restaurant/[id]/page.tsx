import Link from "next/link";
import { notFound } from "next/navigation";

import RestaurantForm from "@/components/admin/RestaurantForm";
import { getRestaurantById } from "@/services/adminService";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditRestaurantPage({ params }: Props) {
  const { id } = await params;

  const restaurant = await getRestaurantById(id);

  if (!restaurant) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/restaurants"
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Back to Restaurants
        </Link>
        <h1 className="mt-3 text-4xl font-bold">Edit Restaurant</h1>
        <p className="mt-2 text-gray-500">
          Update details for {restaurant.name}
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <RestaurantForm initialData={restaurant} />
      </div>
    </div>
  );
}
