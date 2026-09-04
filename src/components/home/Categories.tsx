import React from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export interface FoodCategory {
  name: string;
  emoji: string;
  slug: string;
}

export const CATEGORIES: FoodCategory[] = [
  { name: "Biryani", emoji: "🍛", slug: "biryani" },
  { name: "Pizza", emoji: "🍕", slug: "pizza" },
  { name: "Burger", emoji: "🍔", slug: "burger" },
  { name: "Rolls", emoji: "🌯", slug: "rolls" },
  { name: "Thali & Mess", emoji: "🍱", slug: "mess" },
  { name: "Desserts", emoji: "🍦", slug: "desserts" },
  { name: "Chai & Drinks", emoji: "☕", slug: "drinks" },
  { name: "Late Night", emoji: "🌙", slug: "latenight" },
];

export function Categories() {
  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base md:text-xl font-bold tracking-tight text-stone-900">
            What&apos;s on your mind?
          </h2>
          <p className="text-xs text-stone-500 hidden sm:block">
            Explore curated campus cravings &amp; daily specials
          </p>
        </div>
        <Link
          href={ROUTES.RESTAURANTS}
          className="text-xs md:text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
        >
          See all →
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-3.5 sm:grid-cols-4 md:grid-cols-8">
        {CATEGORIES.map((category) => (
          <Link
            key={category.name}
            href={`${ROUTES.RESTAURANTS}?category=${encodeURIComponent(category.slug)}`}
            className="group flex flex-col items-center text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-orange-50 to-amber-100/60 border border-orange-200/60 shadow-xs text-2xl transition-all duration-200 group-hover:scale-105 group-hover:border-orange-300 group-active:scale-95">
              <span role="img" aria-label={category.name} className="select-none">
                {category.emoji}
              </span>
            </div>

            <span className="mt-1.5 text-xs font-medium text-stone-800 tracking-tight text-center group-hover:text-orange-600 transition-colors line-clamp-1">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default Categories;