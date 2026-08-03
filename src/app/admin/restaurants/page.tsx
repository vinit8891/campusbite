import Link from "next/link";
import { getRestaurants } from "@/services/adminService";
import DeleteRestaurantButton from "@/components/admin/DeleteRestaurantButton";

export default async function RestaurantsPage() {
  const restaurants = await getRestaurants();

  return (
    <main className="mx-auto max-w-6xl p-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold">
          Restaurants
        </h1>

        <Link
          href="/admin/add-restaurant"
          className="rounded-lg bg-orange-500 px-5 py-3 text-white"
        >
          + Add Restaurant
        </Link>
      </div>

      <table className="w-full overflow-hidden rounded-lg border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-4 text-left">Name</th>
            <th className="p-4 text-left">Cuisine</th>
            <th className="p-4 text-left">Rating</th>
            <th className="p-4 text-left">Action</th>
          </tr>
        </thead>

        <tbody>
          {restaurants.map((restaurant: any) => (
            <tr
              key={restaurant._id}
              className="border-t"
            >
              <td className="p-4">
                {restaurant.name}
              </td>

              <td className="p-4">
                {restaurant.cuisine}
              </td>

              <td className="p-4">
            ⭐ {restaurant.rating}
                </td>

                <td className="p-4 flex gap-2">

                <Link
                    href={`/admin/edit-restaurant/${restaurant._id}`}
                    className="rounded bg-blue-500 px-4 py-2 text-white"
                >
                    Edit
                </Link>

                <DeleteRestaurantButton
                    id={restaurant._id}
                />

                </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}