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
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
    category: "Burger",
  },
  {
    name: "Veg Pizza",
    restaurant: "Pizza Point",
    price: "₹149",
    rating: "4.8",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
    category: "Pizza",
  },
  {
    name: "Chicken Biryani",
    restaurant: "Biryani House",
    price: "₹179",
    rating: "4.9",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
    category: "Biryani",
  },
];

export function StudentSpecials() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-10">
        <h2 className="text-3xl font-bold">Student Specials</h2>

        <p className="mt-2 text-gray-500">
          Affordable meals specially for students.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {foods.map((food) => (
          <div
            key={food.name}
            className="group overflow-hidden rounded-3xl border bg-white shadow-md transition hover:-translate-y-2 hover:shadow-2xl"
          >
            <div className="relative h-48 w-full overflow-hidden bg-gray-100">
              <Image
                src={food.image}
                alt={food.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                unoptimized
              />
              <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur-sm">
                <Star className="h-3.5 w-3.5 fill-current text-emerald-600" />
                {food.rating}
              </div>
            </div>

            <div className="space-y-3 p-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {food.name}
                </h3>
                <p className="text-sm text-gray-500">{food.restaurant}</p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-2xl font-bold text-orange-600">
                  {food.price}
                </span>

                <Link
                  href={`${ROUTES.RESTAURANTS}?category=${encodeURIComponent(
                    food.category
                  )}`}
                >
                  <Button className="bg-slate-900 hover:bg-slate-800">
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