import Image from "next/image";
import { Star, Clock3, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const restaurants = [
  {
    slug: "pizza-palace",
    name: "Pizza Palace",
    cuisine: "Italian • Pizza",
    rating: "4.8",
    time: "25 min",
    distance: "2.1 km",
    image: "/images/restaurants/pizza-palace.jpg",
    veg: true,
  },
  {
    slug: "burger-hub",
    name: "Burger Hub",
    cuisine: "Fast Food • Burgers",
    rating: "4.7",
    time: "20 min",
    distance: "1.5 km",
    image: "/images/restaurants/burger-hub.jpg",
    veg: false,
  },
  {
    slug: "biryani-house",
    name: "Biryani House",
    cuisine: "Indian • Biryani",
    rating: "4.9",
    time: "30 min",
    distance: "3.0 km",
    image: "/images/restaurants/biryani-house.jpg",
    veg: false,
  },
];

export function PopularRestaurants() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">

      <div className="mb-10">
        <h2 className="text-3xl font-bold">
          Popular Restaurants
        </h2>

        <p className="mt-2 text-gray-500">
          Discover the highest-rated restaurants near your campus.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

        {restaurants.map((restaurant) => (

          <div
            key={restaurant.name}
            className="overflow-hidden rounded-3xl border bg-white shadow-md transition duration-300 hover:-translate-y-2 hover:shadow-2xl"
          >

            <div className="relative h-56">

              <Image
                src={restaurant.image}
                alt={restaurant.name}
                fill
                className="object-cover"
              />

            </div>

            <div className="space-y-4 p-6">

              <div className="flex items-center justify-between">

                <h3 className="text-xl font-bold">
                  {restaurant.name}
                </h3>

                <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-sm text-green-700">

                  <Star className="h-4 w-4 fill-current" />

                  {restaurant.rating}

                </div>

              </div>

              <p className="text-gray-500">
                {restaurant.cuisine}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-500">

                <div className="flex items-center gap-1">
                  <Clock3 className="h-4 w-4" />
                  {restaurant.time}
                </div>

                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {restaurant.distance}
                </div>

              </div>

              <div className="flex items-center justify-between">

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    restaurant.veg
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {restaurant.veg ? "Pure Veg" : "Non Veg"}
                </span>

                <Link href={`/restaurants/${restaurant.slug}`}>
                  <Button>
                    View Menu
                  </Button>
                </Link>

              </div>

            </div>

          </div>

        ))}

      </div>

    </section>
  );
}
