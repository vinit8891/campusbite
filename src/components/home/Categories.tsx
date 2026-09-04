import React from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import {
  Pizza,
  Beef,
  Soup,
  Salad,
  IceCream,
  Coffee,
  Utensils,
  Flame,
} from "lucide-react";

export interface FoodCategory {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  slug: string;
}

export const CATEGORIES: FoodCategory[] = [
  { name: "Biryani", icon: Soup, slug: "biryani" },
  { name: "Pizza", icon: Pizza, slug: "pizza" },
  { name: "Burger", icon: Beef, slug: "burger" },
  { name: "Rolls", icon: Utensils, slug: "rolls" },
  { name: "Thali & Mess", icon: Salad, slug: "mess" },
  { name: "Desserts", icon: IceCream, slug: "desserts" },
  { name: "Chai & Drinks", icon: Coffee, slug: "drinks" },
  { name: "Late Night", icon: Flame, slug: "latenight" },
];

export function Categories() {
  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-10">
      <div className="flex items-center justify-between mb-3.5 md:mb-6">
        <div>
          <h2 className="text-base md:text-2xl font-bold tracking-tight text-gray-900">
            Explore Categories
          </h2>
          <p className="text-xs text-stone-500 hidden sm:block">
            What are you in the mood for today?
          </p>
        </div>
        <Link
          href={ROUTES.RESTAURANTS}
          className="text-xs md:text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
        >
          See all →
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-3 sm:grid-cols-4 md:grid-cols-8">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;

          return (
            <Link
              key={category.name}
              href={`${ROUTES.RESTAURANTS}?category=${encodeURIComponent(category.slug)}`}
              className="group flex flex-col items-center text-center"
            >
              <div className="flex h-13 w-13 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-amber-50/80 border border-orange-100/80 shadow-2xs group-hover:scale-105 group-hover:bg-orange-100 group-hover:border-orange-300 transition-all duration-200">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-orange-500 group-hover:text-orange-600 transition-colors" />
              </div>

              <span className="mt-1.5 text-[11px] md:text-xs font-semibold text-gray-700 group-hover:text-orange-600 transition-colors line-clamp-1">
                {category.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default Categories;