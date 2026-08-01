import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SearchBar() {
  return (
    <section className="relative z-20 mx-auto -mt-12 max-w-6xl px-6">
      <div className="rounded-2xl bg-white p-4 shadow-2xl border">

        <div className="flex flex-col gap-4 md:flex-row">

          {/* Search */}

          <div className="flex flex-1 items-center rounded-xl border px-4">

            <Search className="mr-2 h-5 w-5 text-gray-500" />

            <input
              type="text"
              placeholder="Search restaurants, food, mess..."
              className="h-12 w-full outline-none"
            />

          </div>

          {/* Location */}

          <div className="flex items-center rounded-xl border px-4">

            <MapPin className="mr-2 h-5 w-5 text-orange-500" />

            <span>Pune</span>

          </div>

          {/* Button */}

          <Button size="lg">
            Search
          </Button>

        </div>

      </div>
    </section>
  );
}