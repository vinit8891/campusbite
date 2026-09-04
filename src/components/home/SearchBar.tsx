"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { ROUTES } from "@/lib/routes";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e?: FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`${ROUTES.RESTAURANTS}?q=${encodeURIComponent(q)}`);
      return;
    }
    router.push(ROUTES.RESTAURANTS);
  }

  return (
    <section className="relative z-20 mx-auto max-w-4xl px-4 md:px-6 pt-1 md:-mt-6 pb-2">
      <form onSubmit={handleSearch} className="w-full">
        <div className="group h-11 md:h-12 w-full rounded-2xl bg-white border border-orange-200/80 shadow-xs hover:shadow-md transition-all duration-200 px-3.5 flex items-center gap-2.5 focus-within:ring-2 focus-within:ring-orange-400/40 focus-within:border-orange-400">
          <Search className="h-4 w-4 md:h-5 md:w-5 text-orange-500 shrink-0 group-focus-within:scale-110 transition-transform" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 'biryani', 'canteen', 'rolls'..."
            className="h-full w-full bg-transparent text-xs md:text-sm text-gray-900 placeholder:text-stone-400 outline-none"
            aria-label="Search restaurants, food, mess"
          />
          <button
            type="button"
            onClick={() => router.push(ROUTES.RESTAURANTS)}
            className="text-stone-400 hover:text-orange-500 p-1 transition-colors shrink-0 cursor-pointer"
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  );
}

export default SearchBar;
