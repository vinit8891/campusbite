import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import {
  Pizza,
  Beef,
  Soup,
  Salad,
  IceCream,
  Coffee,
} from "lucide-react";

const categories = [
  { name: "Pizza", icon: Pizza, slug: "pizza" },
  { name: "Burger", icon: Beef, slug: "burger" },
  { name: "Biryani", icon: Soup, slug: "biryani" },
  { name: "Healthy", icon: Salad, slug: "healthy" },
  { name: "Desserts", icon: IceCream, slug: "desserts" },
  { name: "Drinks", icon: Coffee, slug: "drinks" },
];

export function Categories() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <h2 className="mb-8 text-3xl font-bold">
        Explore Categories
      </h2>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((category) => {
          const Icon = category.icon;

          return (
            <Link
              key={category.name}
              href={`${ROUTES.RESTAURANTS}?category=${encodeURIComponent(category.slug)}`}
              className="block"
            >

              <div className="cursor-pointer rounded-2xl border bg-white p-6 text-center shadow-sm transition hover:-translate-y-2 hover:shadow-xl">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                  <Icon className="h-8 w-8 text-orange-500" />
                </div>

                <h3 className="font-semibold">
                  {category.name}
                </h3>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}