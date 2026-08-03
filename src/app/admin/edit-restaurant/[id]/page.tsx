import { notFound } from "next/navigation";
import RestaurantForm from "@/components/admin/RestaurantForm";
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
    <main className="mx-auto max-w-6xl p-10">
      <h1 className="mb-8 text-4xl font-bold">
        Edit Restaurant
      </h1>

      <RestaurantForm initialData={restaurant} />
    </main>
  );
}