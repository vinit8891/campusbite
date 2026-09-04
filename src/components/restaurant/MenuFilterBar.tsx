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

export function getCategoryEmoji(cat: string): string {
  const lower = cat.toLowerCase();
  if (
    lower.includes("meal") ||
    lower.includes("thali") ||
    lower.includes("main") ||
    lower.includes("curry")
  )
    return "🍛";
  if (
    lower.includes("snack") ||
    lower.includes("starter") ||
    lower.includes("sandwich") ||
    lower.includes("burger") ||
    lower.includes("roll")
  )
    return "🥪";
  if (
    lower.includes("beverage") ||
    lower.includes("drink") ||
    lower.includes("tea") ||
    lower.includes("coffee") ||
    lower.includes("shake") ||
    lower.includes("juice")
  )
    return "🥤";
  if (
    lower.includes("dessert") ||
    lower.includes("sweet") ||
    lower.includes("ice cream") ||
    lower.includes("cake") ||
    lower.includes("pastry")
  )
    return "🍨";
  if (lower.includes("pizza")) return "🍕";
  if (lower.includes("dosa") || lower.includes("south")) return "🥞";
  if (lower.includes("biryani") || lower.includes("rice")) return "🍚";
  return "🍽️";
}

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
    <div className="space-y-3">
      {/* Category Pills Bar */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => onCategoryChange("")}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
              category === ""
                ? "bg-orange-600 text-white shadow-orange-600/20"
                : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <span>🍽️</span>
            <span>All Items</span>
          </button>

          {categories.map((cat) => {
            const isSelected = category === cat;
            const emoji = getCategoryEmoji(cat);

            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(isSelected ? "" : cat)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
                  isSelected
                    ? "bg-orange-600 text-white shadow-orange-600/20"
                    : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
                }`}
              >
                <span>{emoji}</span>
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Filter Row */}
      <form
        onSubmit={onSearchSubmit}
        className="grid gap-3 rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="relative xl:col-span-2">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-stone-400"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search dish or category…"
            className="h-11 pl-9 rounded-2xl border-stone-200 focus-visible:ring-orange-500"
          />
        </div>

        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className={`${selectClassName} h-11 rounded-2xl`}
          aria-label="Category"
        >
          <option value="">🍽️ All categories</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {getCategoryEmoji(value)} {value}
            </option>
          ))}
        </select>

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={availability}
            onChange={(e) => onAvailabilityChange(e.target.value)}
            className={`${selectClassName} h-11 rounded-2xl flex-1`}
            aria-label="Availability"
          >
            <option value="">All availability</option>
            <option value="true">✅ In Stock Only</option>
            <option value="false">❌ Sold Out Only</option>
          </select>

          <Button
            type="submit"
            variant="outline"
            className="h-11 rounded-2xl shrink-0 gap-2 border-stone-200 hover:bg-stone-50 font-bold"
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin text-orange-600" : "text-stone-500"}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

