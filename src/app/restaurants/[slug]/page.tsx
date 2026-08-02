"use client";
import { useCart } from "@/context/CartContext";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { restaurants } from "@/data/restaurants";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function RestaurantPage({ params }: Props) {
  const { slug } = await params;

  const restaurant = restaurants.find((r) => r.slug === slug);
  const { addToCart } = useCart();

  if (!restaurant) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">

      <Image
        src={restaurant.image}
        alt={restaurant.name}
        width={1200}
        height={400}
        className="h-80 w-full rounded-3xl object-cover"
      />

      <h1 className="mt-8 text-4xl font-bold">
        {restaurant.name}
      </h1>

      <p className="mt-2 text-gray-500">
        {restaurant.cuisine}
      </p>

      <div className="mt-3 flex gap-6 text-sm text-gray-600">
        <span>⭐ {restaurant.rating}</span>
        <span>🕒 {restaurant.deliveryTime}</span>
        <span>📍 {restaurant.distance}</span>
      </div>

      <h2 className="mt-12 mb-6 text-3xl font-bold">
        Menu
      </h2>

      <div className="grid gap-6 md:grid-cols-2">
        {restaurant.menu.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-2xl border p-4 shadow-sm"
          >
            <Image
              src={item.image}
              alt={item.name}
              width={100}
              height={100}
              className="rounded-xl"
            />

            <div className="flex-1">
              <h3 className="font-semibold">
                {item.name}
              </h3>

              <p className="text-orange-600 font-bold">
                ₹{item.price}
              </p>
            </div>

            <Button
                onClick={() =>
                    addToCart({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    image: item.image,
                    })
        }
>
  Add
</Button>
          </div>
        ))}
      </div>

    </main>
  );
}