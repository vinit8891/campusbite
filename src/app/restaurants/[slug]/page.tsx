import MenuCard from "@/components/menu/MenuCard";
import RestaurantCheckoutSetup from "@/components/restaurant/RestaurantCheckoutSetup";
import Image from "next/image";
import { notFound } from "next/navigation";

import { getRestaurantBySlug } from "@/services/adminService";

type MenuItem = {
  _id: string;
  restaurant_email: string;
  name: string;
  description: string;
  image: string;
  price: number;
  available: boolean;
};

type Restaurant = {
  _id: string;
  email: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  rating: number;
  latitude?: number;
  longitude?: number;
  menu: MenuItem[];
};

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function RestaurantPage({
  params,
}: Props) {
  const { slug } = await params;

  const restaurant: Restaurant | null =
    await getRestaurantBySlug(slug);

  if (!restaurant) {
    notFound();
  }

  return (
    <main>
      {/* Restaurant Checkout Information */}

      <RestaurantCheckoutSetup
        restaurantEmail={restaurant.email}
        latitude={restaurant.latitude}
        longitude={restaurant.longitude}
      />

      {/* Restaurant Header */}

      <div className="grid gap-10 lg:grid-cols-2">

        {/* Restaurant Image */}

        <div className="relative h-[400px] overflow-hidden rounded-3xl">

          <Image
            src={restaurant.image}
            alt={restaurant.name}
            fill
            className="object-cover"
          />

        </div>

        {/* Restaurant Information */}

        <div className="flex flex-col justify-center">

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

        {restaurant.menu && restaurant.menu.length > 0 ? (

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

            {restaurant.menu.map((item) => (

              <div
                key={item._id}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm"
              >

                <MenuCard item={item} />

              </div>

            ))}

          </div>

        ) : (

          <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">

            <h3 className="text-xl font-semibold">
              Menu Coming Soon
            </h3>

            <p className="mt-2 text-gray-500">
              This restaurant has not added any menu items yet.
            </p>

          </div>

        )}

      </section>

    </main>
  );
}