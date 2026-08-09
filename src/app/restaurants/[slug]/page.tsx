import MenuCard from "@/components/menu/MenuCard";
import RestaurantCheckoutSetup from "@/components/restaurant/RestaurantCheckoutSetup";
import Image from "next/image";
import { notFound } from "next/navigation";

import { getRestaurantBySlug } from "@/services/adminService";

type MenuItem = {
  _id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  available: boolean;
};

type Restaurant = {
  _id: string;
  name: string;
  slug: string;
  email: string;
  description: string;
  cuisine: string;
  image: string;
  rating: number;
  delivery_time: string;
  distance: string;

  // Restaurant GPS
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
    <main className="min-h-screen bg-gray-50">

      {/* Save restaurant information for checkout */}
      <RestaurantCheckoutSetup
        restaurantEmail={restaurant.email}
        latitude={restaurant.latitude}
        longitude={restaurant.longitude}
      />

      {/* =========================
          RESTAURANT HEADER
      ========================== */}

      <section className="border-b bg-white">

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

          {/* Back */}

          <div className="mb-6">
            <a
              href="/restaurants"
              className="text-sm font-medium text-gray-500 transition hover:text-orange-600"
            >
              ← Back to Restaurants
            </a>
          </div>

          <div className="grid items-center gap-8 lg:grid-cols-[420px_1fr]">

            {/* Restaurant Image */}

            <div className="relative h-[280px] overflow-hidden rounded-3xl shadow-md sm:h-[320px]">

              <Image
                src={restaurant.image}
                alt={restaurant.name}
                fill
                priority
                className="object-cover"
              />

            </div>

            {/* Restaurant Details */}

            <div>

              {/* Cuisine */}

              <div className="mb-3">
                <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
                  {restaurant.cuisine || "Restaurant"}
                </span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                {restaurant.name}
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
                {restaurant.description ||
                  "Delicious food made fresh for you."}
              </p>

              {/* Restaurant Information */}

              <div className="mt-6 flex flex-wrap gap-3">

                {/* Rating */}

                <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3">
                  <span className="text-lg">⭐</span>

                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {restaurant.rating}
                    </p>

                    <p className="text-xs text-gray-500">
                      Rating
                    </p>
                  </div>
                </div>

                {/* Delivery Time */}

                <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-3">
                  <span className="text-lg">🚚</span>

                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {restaurant.delivery_time || "25-35 min"}
                    </p>

                    <p className="text-xs text-gray-500">
                      Delivery
                    </p>
                  </div>
                </div>

                {/* Location */}

                <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3">
                  <span className="text-lg">📍</span>

                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      Pune
                    </p>

                    <p className="text-xs text-gray-500">
                      Location
                    </p>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =========================
          MENU SECTION
      ========================== */}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Menu Header */}

        <div className="mb-8 flex items-end justify-between gap-4">

          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              Popular Menu
            </h2>

            <p className="mt-2 text-gray-500">
              Choose your favorite dishes
            </p>
          </div>

          {restaurant.menu &&
            restaurant.menu.length > 0 && (
              <span className="hidden rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm sm:block">
                {restaurant.menu.length} items
              </span>
            )}

        </div>

        {/* Menu Items */}

        {restaurant.menu &&
        restaurant.menu.length > 0 ? (

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            {restaurant.menu.map((item) => (

              <div
                key={item._id}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
              >

                <MenuCard item={item} />

              </div>

            ))}

          </div>

        ) : (

          <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-3xl">
              🍽️
            </div>

            <h3 className="mt-5 text-xl font-bold text-gray-900">
              Menu Coming Soon
            </h3>

            <p className="mx-auto mt-2 max-w-md text-gray-500">
              This restaurant has not added any menu items yet.
              Please check back soon.
            </p>

          </div>

        )}

      </section>

    </main>
  );
}