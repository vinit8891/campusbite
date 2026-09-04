"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { Plus, RotateCcw, Utensils, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { getMyOrders } from "@/services/orderService";
import type { CartItem, Order, OrderItem } from "@/types";

interface ReorderDish {
  id: string;
  name: string;
  price: number;
  image: string;
  restaurant_email: string;
  restaurant_name: string;
  is_budget_meal?: boolean;
}

const DEFAULT_DISH_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80";

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
            image: item.image || DEFAULT_DISH_IMAGE,
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
      className="mx-auto max-w-7xl px-6 pt-10 pb-4"
      aria-label="Order Again"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
            <RotateCcw className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Order Again
            </h2>
            <p className="text-xs text-gray-500">
              Quickly reorder your favorite campus meals
            </p>
          </div>
        </div>
      </div>

      {/* Snap Scroll Row */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4 pt-1 -mx-2 px-2">
        {previousDishes.map((dish) => (
          <div
            key={`${dish.name}-${dish.restaurant_email}`}
            data-testid={`order-again-card-${dish.id}`}
            className="snap-start shrink-0 w-44 sm:w-52 rounded-2xl border border-gray-100 bg-white p-3 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
          >
            {/* Dish Image */}
            <div className="relative h-28 w-full overflow-hidden rounded-xl bg-gray-100 mb-3">
              <Image
                src={dish.image}
                alt={dish.name}
                fill
                sizes="(max-width: 640px) 176px, 208px"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                unoptimized
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white">
                ₹{dish.price}
              </div>
            </div>

            {/* Dish Details */}
            <div className="min-w-0 mb-3">
              <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                {dish.name}
              </h3>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {dish.restaurant_name}
              </p>
            </div>

            {/* 1-Tap Reorder Button */}
            <button
              type="button"
              onClick={() => handleReorder(dish)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200 hover:border-orange-600 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-2xs cursor-pointer"
              aria-label={`Reorder ${dish.name} for ₹${dish.price}`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Reorder</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default OrderAgainCarousel;
