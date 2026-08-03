import { notFound } from "next/navigation";
import { getRestaurantById } from "@/services/adminService";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditRestaurantPage({
  params,
}: Props) {
  const { id } = await params;

  const restaurant = await getRestaurantById(id);

  if (!restaurant) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl p-10">
      <h1 className="mb-8 text-4xl font-bold">
        Edit Restaurant
      </h1>

      <div className="space-y-4 rounded-lg border p-6">

        <p>
          <strong>Name:</strong> {restaurant.name}
        </p>

        <p>
          <strong>Cuisine:</strong> {restaurant.cuisine}
        </p>

        <p>
          <strong>Rating:</strong> ⭐ {restaurant.rating}
        </p>

        <p className="text-orange-600 font-semibold">
          Edit form will be added next.
        </p>

      </div>
    </main>
  );
}