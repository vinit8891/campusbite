import RestaurantCheckoutSetup from "@/components/restaurant/RestaurantCheckoutSetup";
import RestaurantMenu from "@/components/restaurant/RestaurantMenu";
import FloatingCart from "@/components/cart/FloatingCart";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ROUTES } from "@/lib/routes";


import { getRestaurantBySlug } from "@/services/restaurantService";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function RestaurantPage({ params }: Props) {
  const { slug } = await params;

  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant) {
    notFound();
  }

  const menu = restaurant.menu || [];

  const groupedMenu = menu.reduce<Record<string, typeof menu>>(
    (groups, item) => {
      const category = item.category?.trim() || "Other";

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(item);

      return groups;
    },
    {}
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <RestaurantCheckoutSetup
        restaurantEmail={restaurant.email}
        latitude={restaurant.latitude}
        longitude={restaurant.longitude}
      />

      {/* Restaurant Hero */}
      <section className="relative">
        <div className="relative h-[420px] w-full overflow-hidden rounded-b-[40px]">
          {restaurant.image ? (
            <Image
              src={restaurant.image}
              alt={restaurant.name}
              fill
              priority
              sizes="100vw"
              className="object-cover"
              unoptimized={restaurant.image.startsWith("http")}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-200 text-7xl">
              🍽️
            </div>
          )}

          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

          {/* Back Button */}
          <div className="absolute left-6 top-6 z-20">
            <Link
              href={ROUTES.RESTAURANTS}
              className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-800 shadow transition hover:bg-white"
            >
              ← Back
            </Link>
          </div>


          {/* Restaurant Info */}
          <div className="absolute bottom-0 left-0 right-0 z-10">
            <div className="mx-auto max-w-7xl px-6 pb-10">
              <span className="inline-flex rounded-full bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white shadow">
                {restaurant.cuisine || "Restaurant"}
              </span>

              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                {restaurant.name}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-6 text-sm font-medium text-white/90">
                <span>⭐ {restaurant.rating ?? "—"}</span>

                <span>
                  🚚 {restaurant.delivery_time || "25–35 min"}
                </span>

                <span>
                  📍 {restaurant.address || "Campus Area"}
                </span>

                <span>
                  🕒 {restaurant.opening_hours || "10:00 AM"} –{" "}
                  {restaurant.closing_hours || "10:00 PM"}
                </span>
              </div>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/90">
                {restaurant.description ||
                  "Fresh handmade meals prepared with quality ingredients and delivered hot to your campus."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Menu */}
      <RestaurantMenu
        restaurant={restaurant}
        groupedMenu={groupedMenu}
        totalItems={menu.length}
      />

      {/* Floating Cart */}
      <FloatingCart />
    </main>
  );
}