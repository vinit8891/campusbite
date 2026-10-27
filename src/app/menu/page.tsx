"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, X, ShoppingBag, Plus, Minus, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { useCart } from "@/context/CartContext";
import { ROUTES, restaurantDetailsPath } from "@/lib/routes";
import { getRestaurantsPage } from "@/services/restaurantService";
import { getCalibratedAppPrice } from "@/lib/pricingEngine";
import type { BackendRestaurant, BackendMenuItem } from "@/types";

export interface CampusMenuItem extends BackendMenuItem {
  restaurant_name: string;
  restaurant_slug: string;
  restaurant_email: string;
  is_veg?: boolean;
}

const CANONICAL_FALLBACK_DISHES: CampusMenuItem[] = [
  {
    id: "dish-1",
    _id: "dish-1",
    name: "Special Veg Thali",
    price: 90,
    category: "Lunch",
    description: "2 Chapatis, Dal Tadka, Paneer Sabji, Jeera Rice, Pickle & Papad.",
    image: "https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?auto=format&fit=crop&w=600&q=80",
    restaurant_name: "Zeal Central Canteen",
    restaurant_slug: "zeal-central-canteen",
    restaurant_email: "central.canteen@zeal.edu.in",
    is_veg: true,
    available: true,
  },
  {
    id: "dish-2",
    _id: "dish-2",
    name: "Misal Pav",
    price: 50,
    category: "Snacks",
    description: "Spicy sprouted moth bean curry topped with farsan, onions, lemon, and 2 butter pavs.",
    image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=600&q=80",
    restaurant_name: "Pragati Kitchen",
    restaurant_slug: "pragati-kitchen",
    restaurant_email: "pragati.kitchen@zeal.edu.in",
    is_veg: true,
    available: true,
  },
  {
    id: "dish-3",
    _id: "dish-3",
    name: "Cold Coffee with Ice Cream",
    price: 35,
    category: "Beverages",
    description: "Chilled thick blended coffee topped with a creamy vanilla ice cream scoop.",
    image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
    restaurant_name: "Zeal Central Canteen",
    restaurant_slug: "zeal-central-canteen",
    restaurant_email: "central.canteen@zeal.edu.in",
    is_veg: true,
    available: true,
  },
  {
    id: "dish-4",
    _id: "dish-4",
    name: "Paneer Roll",
    price: 70,
    category: "Snacks",
    description: "Marinated spiced cottage cheese chunks wrapped in a crisp flaky paratha with mint mayo.",
    image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80",
    restaurant_name: "Pizza Palace",
    restaurant_slug: "pizza-palace",
    restaurant_email: "pizza.palace@zeal.edu.in",
    is_veg: true,
    available: true,
  },
  {
    id: "dish-5",
    _id: "dish-5",
    name: "Masala Dosa",
    price: 55,
    category: "Snacks",
    description: "Crispy golden fermented crepe stuffed with spiced aloo masala, coconut chutney & sambar.",
    image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80",
    restaurant_name: "Zeal Main Canteen",
    restaurant_slug: "zeal-main-canteen",
    restaurant_email: "main.canteen@zeal.edu.in",
    is_veg: true,
    available: true,
  },
  {
    id: "dish-6",
    _id: "dish-6",
    name: "Egg Bhurji Pav",
    price: 60,
    category: "Egg",
    description: "Scrambled spiced 2-egg bhurji with chopped onions, green chillies & 2 toasted pavs.",
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
    restaurant_name: "Zeal Main Canteen",
    restaurant_slug: "zeal-main-canteen",
    restaurant_email: "main.canteen@zeal.edu.in",
    is_veg: false,
    available: true,
  },
  {
    id: "dish-7",
    _id: "dish-7",
    name: "Pav Bhaji",
    price: 60,
    category: "Snacks",
    description: "Rich buttery mashed vegetable bhaji served with two butter toasted pavs & onion relish.",
    image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=600&q=80",
    restaurant_name: "Zeal Central Canteen",
    restaurant_slug: "zeal-central-canteen",
    restaurant_email: "central.canteen@zeal.edu.in",
    is_veg: true,
    available: true,
  },
  {
    id: "dish-8",
    _id: "dish-8",
    name: "Special Masala Chai",
    price: 15,
    category: "Beverages",
    description: "Steaming hot ginger-cardamom brewed Assam milk tea.",
    image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    restaurant_name: "Zeal Central Canteen",
    restaurant_slug: "zeal-central-canteen",
    restaurant_email: "central.canteen@zeal.edu.in",
    is_veg: true,
    available: true,
  },
];

const FILTER_TAGS = [
  "All",
  "Veg",
  "Egg",
  "Snacks",
  "Lunch",
  "Beverages",
  "South Indian",
];

function MenuBrowser() {
  const searchParams = useSearchParams();
  const initialQ = searchParams?.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [selectedTag, setSelectedTag] = useState("All");
  const [menuItems, setMenuItems] = useState<CampusMenuItem[]>(CANONICAL_FALLBACK_DISHES);
  const [loading, setLoading] = useState(true);

  const { cart, addToCart, increaseQuantity, decreaseQuantity } = useCart();

  // Sync when searchParams change
  useEffect(() => {
    if (initialQ !== searchQuery) {
      setSearchQuery(initialQ);
    }
  }, [initialQ]);

  // Load items from backend canteens
  useEffect(() => {
    let cancelled = false;

    async function loadDishes() {
      try {
        setLoading(true);
        const res = await getRestaurantsPage({ limit: 50, include_menu: true });
        if (cancelled) return;

        const collected: CampusMenuItem[] = [];

        if (Array.isArray(res.items) && res.items.length > 0) {
          for (const rest of res.items as BackendRestaurant[]) {
            if (Array.isArray(rest.menu) && rest.menu.length > 0) {
              for (const m of rest.menu) {
                collected.push({
                  ...m,
                  restaurant_name: rest.name,
                  restaurant_slug: rest.slug,
                  restaurant_email: rest.email,
                  is_veg: (m as unknown as { is_veg?: boolean }).is_veg ?? true,
                });
              }
            }
          }
        }

        if (collected.length > 0) {
          setMenuItems(collected);
        } else {
          setMenuItems(CANONICAL_FALLBACK_DISHES);
        }
      } catch {
        if (!cancelled) {
          setMenuItems(CANONICAL_FALLBACK_DISHES);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDishes();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter items across:
  // 1. Dish name (e.g. "Misal Pav", "Cold Coffee", "Paneer Roll")
  // 2. Food category / tags ("Snacks", "Lunch", "Beverages", "Veg", "Egg")
  // 3. Canteen / Outlet name ("Zeal Main Canteen", "Pizza Palace")
  const filteredDishes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return menuItems.filter((dish) => {
      // 1. Filter by tag pill
      if (selectedTag === "Veg" && dish.is_veg === false) {
        return false;
      }
      if (selectedTag === "Egg") {
        const isEgg =
          dish.category?.toLowerCase().includes("egg") ||
          dish.name.toLowerCase().includes("egg");
        if (!isEgg) return false;
      }
      if (
        selectedTag !== "All" &&
        selectedTag !== "Veg" &&
        selectedTag !== "Egg"
      ) {
        const catMatch = dish.category?.toLowerCase() === selectedTag.toLowerCase();
        if (!catMatch) return false;
      }

      // 2. Filter by search query
      if (!q) return true;

      const nameMatch = dish.name.toLowerCase().includes(q);
      const categoryMatch = (dish.category || "").toLowerCase().includes(q);
      const canteenMatch = (dish.restaurant_name || "").toLowerCase().includes(q);
      const descMatch = (dish.description || "").toLowerCase().includes(q);

      // Veg / Egg tag matching inside query
      const tagMatch =
        (q === "veg" && dish.is_veg) ||
        (q === "egg" &&
          (dish.category?.toLowerCase().includes("egg") ||
            dish.name.toLowerCase().includes("egg")));

      return nameMatch || categoryMatch || canteenMatch || descMatch || tagMatch;
    });
  }, [menuItems, searchQuery, selectedTag]);

  function getCartItem(dishId: string | number | undefined) {
    if (!dishId) return null;
    return cart.find((i) => String(i.id) === String(dishId));
  }

  return (
    <main className="min-h-screen bg-stone-50 pb-32">
      {/* =========================================================
          PROMINENT STICKY SEARCH BAR
      ========================================================== */}
      <section className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-orange-100/80 shadow-xs px-4 py-3">
        <div className="max-w-4xl mx-auto space-y-2.5">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-stone-400 pointer-events-none" />
            <input
              id="menu-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes (Misal Pav, Cold Coffee), tags (Snacks, Lunch, Veg, Egg), or canteens..."
              className="w-full h-11 pl-10 pr-10 rounded-2xl bg-stone-100/90 border border-stone-200/80 text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-orange-500 focus:outline-none transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search query"
                className="absolute right-3 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {FILTER_TAGS.map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition cursor-pointer ${
                    isSelected
                      ? "bg-orange-600 text-white shadow-xs font-bold"
                      : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {tag === "Veg" && "🥬 "}
                  {tag === "Egg" && "🥚 "}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          MENU HEADER & STATS
      ========================================================== */}
      <div className="max-w-4xl mx-auto px-4 pt-5 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Campus Menu
            </h1>
            <p className="text-xs text-stone-500">
              Fresh food across all Zeal Narhe canteens
            </p>
          </div>

          <span className="text-xs font-bold text-stone-600 bg-white px-2.5 py-1 rounded-full border border-stone-200 shadow-2xs">
            {filteredDishes.length} {filteredDishes.length === 1 ? "dish" : "dishes"}
          </span>
        </div>
      </div>

      {/* =========================================================
          DISHES GRID
      ========================================================== */}
      <div className="max-w-4xl mx-auto px-4 mt-3">
        {filteredDishes.length === 0 ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-2xs my-6">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-base font-bold text-stone-900">
              No dishes found matching &quot;{searchQuery}&quot;
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Try searching for &quot;Misal Pav&quot;, &quot;Cold Coffee&quot;, &quot;Snacks&quot;, or &quot;Zeal Main Canteen&quot;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedTag("All");
              }}
              className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 transition cursor-pointer"
            >
              Clear filters &amp; view all
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {filteredDishes.map((dish) => {
              const rawPrice = dish.price || 0;
              const appPrice = getCalibratedAppPrice(rawPrice);
              const dishId = dish.id || dish._id || dish.name;
              const cartItem = getCartItem(dishId);

              return (
                <div
                  key={dishId}
                  className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-2xs hover:shadow-sm transition-all flex gap-3 justify-between"
                >
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      {/* Dietary Tag & Canteen Link */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded border text-[8px] font-bold ${
                            dish.is_veg === false
                              ? "border-red-600 text-red-600"
                              : dish.category?.toLowerCase().includes("egg")
                              ? "border-amber-600 text-amber-600"
                              : "border-emerald-600 text-emerald-600"
                          }`}
                        >
                          ●
                        </span>

                        <Link
                          href={restaurantDetailsPath(dish.restaurant_slug || "canteen")}
                          className="text-[11px] font-semibold text-stone-500 hover:text-orange-600 transition truncate"
                        >
                          {dish.restaurant_name}
                        </Link>
                      </div>

                      <h3 className="text-sm font-bold text-stone-900 mt-1 truncate">
                        {dish.name}
                      </h3>

                      {dish.description && (
                        <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5">
                          {dish.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-sm font-extrabold text-stone-900">
                        ₹{appPrice.toFixed(0)}
                      </span>

                      {/* Add to Cart / Quantity Switcher */}
                      {cartItem ? (
                        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-2 py-1">
                          <button
                            type="button"
                            onClick={() => decreaseQuantity(cartItem.id)}
                            className="h-6 w-6 rounded-lg bg-white text-orange-600 flex items-center justify-center text-xs font-bold hover:bg-orange-100 transition shadow-2xs cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold text-orange-950 px-1">
                            {cartItem.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => increaseQuantity(cartItem.id)}
                            className="h-6 w-6 rounded-lg bg-orange-600 text-white flex items-center justify-center text-xs font-bold hover:bg-orange-700 transition shadow-2xs cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            addToCart({
                              id: dishId,
                              name: dish.name,
                              price: rawPrice,
                              restaurant_email: dish.restaurant_email,
                              restaurant_name: dish.restaurant_name,
                              image: dish.image,
                              quantity: 1,
                            } as any);
                            toast.success(`Added ${dish.name} to cart!`);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Food Image */}
                  <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-xl overflow-hidden bg-stone-100 border border-stone-100">
                    {dish.image ? (
                      <Image
                        src={dish.image}
                        alt={dish.name}
                        fill
                        sizes="112px"
                        className="object-cover"
                        unoptimized={dish.image.startsWith("http")}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-3xl bg-amber-50">
                        🍛
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating View Cart Pill if cart has items */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto">
          <Link
            href={ROUTES.CART}
            className="flex items-center justify-between bg-orange-600 hover:bg-orange-700 text-white py-3.5 px-5 rounded-2xl shadow-xl transition-all font-bold text-sm"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <span>
                {cart.reduce((s, i) => s + i.quantity, 0)} {cart.length === 1 ? "item" : "items"} in Cart
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>View Cart</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
      )}
    </main>
  );
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-stone-50 flex items-center justify-center">
          <div className="text-sm font-semibold text-stone-500">Loading campus menu...</div>
        </main>
      }
    >
      <MenuBrowser />
    </Suspense>
  );
}
