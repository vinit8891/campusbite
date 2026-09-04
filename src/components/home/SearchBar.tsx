"use client";

import React, { FormEvent, useState } from "react";
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
    <section className="relative z-20 mx-auto max-w-4xl px-4 md:px-6 pt-2 pb-2">
      <form onSubmit={handleSearch} className="w-full">
        <div className="group h-12 w-full rounded-2xl bg-white shadow-md shadow-orange-500/5 border border-stone-200/70 px-4 flex items-center gap-3 transition-all duration-200 focus-within:ring-2 focus-within:ring-orange-400/40 focus-within:border-orange-400">
          <Search className="h-5 w-5 text-orange-500 shrink-0 group-focus-within:scale-110 transition-transform" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 'canteen', 'biryani', 'maggi'..."
            className="h-full w-full bg-transparent text-sm text-gray-900 placeholder:text-stone-400 outline-none"
            aria-label="Search restaurants, food, mess"
          />
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-5 w-px bg-stone-200" />
            <button
              type="button"
              onClick={() => router.push(ROUTES.RESTAURANTS)}
              className="text-stone-400 hover:text-orange-500 p-1 transition-colors cursor-pointer"
              aria-label="Filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

export default SearchBar;
