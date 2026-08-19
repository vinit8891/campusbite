import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

const foods = [
  {
    name: "Veg Burger",
    restaurant: "Burger Hub",
    price: "₹99",
    rating: "4.7",
    image: "/images/food/burger.png",
    category: "Burger",
  },
  {
    name: "Veg Pizza",
    restaurant: "Pizza Point",
    price: "₹149",
    rating: "4.8",
    image: "/images/food/pizza.png",
    category: "Pizza",
  },
  {
    name: "Chicken Biryani",
    restaurant: "Biryani House",
    price: "₹179",
    rating: "4.9",
    image: "/images/food/biryani.png",
    category: "Biryani",
  },
];

export function StudentSpecials() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-10">
        <h2 className="text-3xl font-bold">
          Student Specials
        </h2>

        <p className="mt-2 text-gray-500">
          Affordable meals specially for students.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {foods.map((food) => (
          <div
            key={food.name}
            className="overflow-hidden rounded-3xl border bg-white shadow-md transition hover:-translate-y-2 hover:shadow-2xl"
          >
            <div className="relative h-56 bg-orange-50">
              <Image
                src={food.image}
                alt={food.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-contain p-6"
              />
            </div>

            <div className="space-y-3 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">
                  {food.name}
                </h3>

                <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-sm font-medium text-green-700">
                  <Star className="h-4 w-4 fill-current" />
                  {food.rating}
                </div>
              </div>

              <p className="text-gray-500">
                {food.restaurant}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-orange-600">
                  {food.price}
                </span>

                <Link
                  href={`${ROUTES.RESTAURANTS}?category=${encodeURIComponent(
                    food.category
                  )}`}
                >
                  <Button>
                    Order Now
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