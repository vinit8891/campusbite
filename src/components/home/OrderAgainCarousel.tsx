"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { getMyOrders } from "@/services/orderService";
import type { CartItem, Order } from "@/types";

interface ReorderDish {
  id: string;
  name: string;
  price: number;
  image: string;
  restaurant_email: string;
  restaurant_name: string;
  is_budget_meal?: boolean;
}

function getRealisticDishImage(name: string, currentImage?: string): string {
  if (
    currentImage &&
    !currentImage.includes("placeholder") &&
    !currentImage.includes("default") &&
    (currentImage.startsWith("http://") || currentImage.startsWith("https://"))
  ) {
    return currentImage;
  }

  const lower = name.toLowerCase();
  if (lower.includes("biryani") || lower.includes("rice") || lower.includes("pulao")) {
    return "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80";
  }
  if (lower.includes("pizza")) {
    return "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80";
  }
  if (lower.includes("burger")) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80";
  }
  if (lower.includes("pasta") || lower.includes("maggi") || lower.includes("noodle") || lower.includes("chowmein")) {
    return "https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=400&auto=format&fit=crop&q=80";
  }
  if (lower.includes("thali") || lower.includes("dal") || lower.includes("roti") || lower.includes("paneer") || lower.includes("curry")) {
    return "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&auto=format&fit=crop&q=80";
  }
  if (lower.includes("roll") || lower.includes("wrap") || lower.includes("frankie") || lower.includes("shawarma")) {
    return "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&auto=format&fit=crop&q=80";
  }
  if (lower.includes("dosa") || lower.includes("idli") || lower.includes("vada") || lower.includes("sambar")) {
    return "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&auto=format&fit=crop&q=80";
  }
  if (lower.includes("tea") || lower.includes("chai") || lower.includes("coffee") || lower.includes("shake") || lower.includes("drink") || lower.includes("lassi")) {
    return "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400&auto=format&fit=crop&q=80";
  }
  if (lower.includes("dessert") || lower.includes("ice") || lower.includes("cake") || lower.includes("sweet") || lower.includes("gulab")) {
    return "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&auto=format&fit=crop&q=80";
  }

  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80";
}

export function OrderAgainCarousel() {
  const { isLoggedIn } = useAuth();
  const { addToCart } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPastOrders() {
      if (!isLoggedIn) {
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getMyOrders();
        if (!cancelled) {
          setOrders(data || []);
        }
      } catch {
        if (!cancelled) {
          setOrders([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPastOrders();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // Extract unique previous dishes across delivered or past orders
  const previousDishes = useMemo<ReorderDish[]>(() => {
    if (!orders || orders.length === 0) return [];

    const seen = new Set<string>();
    const dishes: ReorderDish[] = [];

    for (const order of orders) {
      const restEmail = order.restaurant_email || "restaurant@campusbite.in";
      const restName = order.restaurant_name || "Campus Eatery";

      for (const item of order.items || []) {
        const dishKey = `${item.name}-${restEmail}`;
        if (!seen.has(dishKey)) {
          seen.add(dishKey);
          dishes.push({
            id: String(item.id || item.name),
            name: item.name,
            price: Number(item.price) || 99,
            image: getRealisticDishImage(item.name, item.image),
            restaurant_email: restEmail,
            restaurant_name: restName,
            is_budget_meal: item.is_budget_meal,
          });
        }
      }
    }

    return dishes;
  }, [orders]);

  const handleReorder = useCallback(
    (dish: ReorderDish) => {
      const cartItem: CartItem = {
        id: dish.id,
        name: dish.name,
        price: dish.price,
        image: dish.image,
        quantity: 1,
        restaurant_email: dish.restaurant_email,
        restaurant_name: dish.restaurant_name,
      };

      addToCart(cartItem);
      toast.success(`Added ${dish.name} to your cart!`);
    },
    [addToCart]
  );

  // If not logged in or has no previous orders, do not render
  if (!isLoggedIn || loading || previousDishes.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="order-again-section"
      className="mx-auto max-w-7xl px-4 md:px-6 pt-6 md:pt-8 pb-2"
      aria-label="Order Again"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
            <RotateCcw className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-base md:text-xl font-bold text-gray-900 tracking-tight">
              Order Again
            </h2>
            <p className="text-[11px] text-gray-500 hidden sm:block">
              Quickly reorder your favorite campus meals
            </p>
          </div>
        </div>
      </div>

      {/* Compact Snap Scroll Row */}
      <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-3 pt-1 -mx-2 px-2">
        {previousDishes.map((dish) => (
          <div
            key={`${dish.name}-${dish.restaurant_email}`}
            data-testid={`order-again-card-${dish.id}`}
            className="snap-start shrink-0 w-36 sm:w-44 rounded-2xl border border-gray-100 bg-white p-2.5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
          >
            {/* Dish Image */}
            <div className="relative h-24 w-full overflow-hidden rounded-xl bg-gray-100 mb-2">
              <Image
                src={dish.image}
                alt={dish.name}
                fill
                sizes="(max-width: 640px) 144px, 176px"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                unoptimized
              />
              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-[10px] font-bold text-white">
                ₹{dish.price}
              </div>
            </div>

            {/* Dish Details */}
            <div className="min-w-0 mb-2">
              <h3 className="text-xs font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                {dish.name}
              </h3>
              <p className="text-[10px] text-gray-500 truncate mt-0.5">
                {dish.restaurant_name}
              </p>
            </div>

            {/* 1-Tap Add/Reorder Button */}
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-900">
                ₹{dish.price}
              </span>
              <button
                type="button"
                onClick={() => handleReorder(dish)}
                className="h-6 w-6 rounded-lg bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center text-xs font-bold transition-all duration-200 active:scale-90 shadow-2xs cursor-pointer"
                aria-label={`Reorder ${dish.name} for ₹${dish.price}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default OrderAgainCarousel;
