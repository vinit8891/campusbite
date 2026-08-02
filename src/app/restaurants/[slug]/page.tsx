import MenuCard from "@/components/menu/MenuCard";
import Image from "next/image";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { restaurantService } from "@/services/api";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function RestaurantPage({
  params,
}: Props) {
  const { slug } = await params;

  const restaurant = restaurantService.getBySlug(slug);

  if (!restaurant) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">

      {/* Restaurant Header */}

      <div className="grid gap-10 lg:grid-cols-2">

        <div className="relative h-[400px] overflow-hidden rounded-3xl">

          <Image
            src={restaurant.image}
            alt={restaurant.name}
            fill
            className="object-cover"
          />

        </div>

        <div>

          <h1 className="text-4xl font-bold">
            {restaurant.name}
          </h1>

          <p className="mt-4 text-lg text-gray-600">
            {restaurant.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">

            <span className="rounded-full bg-orange-100 px-4 py-2 text-orange-700">
              ⭐ {restaurant.rating}
            </span>

            <span className="rounded-full bg-green-100 px-4 py-2 text-green-700">
              🚚 25-35 min
            </span>

            <span className="rounded-full bg-blue-100 px-4 py-2 text-blue-700">
              📍 Pune
            </span>

          </div>

        </div>

      </div>

      {/* Menu */}

      <section className="mt-20">

        <h2 className="mb-10 text-3xl font-bold">
          Popular Menu
        </h2>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

        {restaurant.menu.map((item) => (
  <MenuCard
    key={item.id}
    item={item}
  />
))}

        </div>

      </section>

    </main>
  );
}