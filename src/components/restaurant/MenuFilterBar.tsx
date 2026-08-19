import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClassName } from "@/lib/formatters";

type MenuFilterBarProps = {
  q: string;
  setQ: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  availability: string;
  setAvailability: (val: string) => void;
  categories: string[];
  loading: boolean;
  onSearchSubmit: (e: React.FormEvent) => void;
  onCategoryChange: (cat: string) => void;
  onAvailabilityChange: (avail: string) => void;
};

export function MenuFilterBar({
  q,
  setQ,
  category,
  categories,
  availability,
  loading,
  onSearchSubmit,
  onCategoryChange,
  onAvailabilityChange,
}: MenuFilterBarProps) {
  return (
    <form
      onSubmit={onSearchSubmit}
      className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <div className="relative xl:col-span-2">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by item name…"
          className="h-10 pl-9"
        />
      </div>

      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className={selectClassName}
        aria-label="Category"
      >
        <option value="">All categories</option>
        {categories.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={availability}
          onChange={(e) => onAvailabilityChange(e.target.value)}
          className={selectClassName}
          aria-label="Availability"
        >
          <option value="">All availability</option>
          <option value="true">Available</option>
          <option value="false">Unavailable</option>
        </select>

        <Button
          type="submit"
          variant="outline"
          className="h-10 shrink-0 gap-2"
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </Button>
      </div>
    </form>
  );
}
