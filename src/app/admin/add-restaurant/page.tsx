import RestaurantForm from "@/components/admin/RestaurantForm";

export default function AddRestaurantPage() {
  return (
    <main className="mx-auto max-w-6xl p-10">
      <h1 className="mb-8 text-4xl font-bold">
        Add Restaurant
      </h1>

      <RestaurantForm />
    </main>
  );
}