"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
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
    <section className="relative z-20 mx-auto -mt-12 max-w-6xl px-6">
      <form
        onSubmit={handleSearch}
        className="rounded-2xl border bg-white p-4 shadow-2xl"
      >
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex flex-1 items-center rounded-xl border px-4">
            <Search className="mr-2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search restaurants, food, mess..."
              className="h-12 w-full outline-none"
            />
          </div>

          <div className="flex items-center rounded-xl border px-4">
            <MapPin className="mr-2 h-5 w-5 text-orange-500" />
            <span>Pune</span>
          </div>

          <Button type="submit" size="lg">
            Search
          </Button>
        </div>
      </form>
    </section>
  );
}
