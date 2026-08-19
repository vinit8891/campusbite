"use client";

import React, { memo } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";

export type MenuCardProps = {
  item: {
    _id: string;
    name: string;
    description?: string;
    image: string;
    price: number;
    available?: boolean;
  };
  restaurant: {
    id?: string;
    email: string;
    name: string;
  };
};

function MenuCard({ item, restaurant }: MenuCardProps) {
  const { cart, addToCart, clearCart } = useCart();
  const available = item.available !== false;

  const cartItem = cart.find(
    (cartItem) =>
      cartItem.id === item._id &&
      cartItem.restaurant_email === restaurant.email?.trim()
  );

  const quantity = cartItem?.quantity ?? 0;

  function handleAddToCart() {
    const email = restaurant.email?.trim();
    if (!email) {
      toast.error(
        "Restaurant identity is missing. Please reopen this restaurant and try again."
      );
      return;
    }

    const conflicting = cart.find(
      (cartItem) =>
        cartItem.restaurant_email &&
        cartItem.restaurant_email !== email
    );

    if (conflicting) {
      const proceed = window.confirm(
        "Your cart has items from another restaurant. Clear the cart and add this item?"
      );
      if (!proceed) return;
      clearCart();
    }

    addToCart({
      id: item._id,
      restaurant_id: restaurant.id,
      restaurant_email: email,
      restaurant_name: restaurant.name,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: 1,
    });

    toast.success(`${item.name} added to cart`);
  }

  function handleIncrease() {
    const email = restaurant.email?.trim();
    if (!email) {
      toast.error("Restaurant identity is missing.");
      return;
    }

    addToCart({
      id: item._id,
      restaurant_id: restaurant.id,
      restaurant_email: email,
      restaurant_name: restaurant.name,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: 1,
    });
  }

  function handleDecrease() {
    if (quantity <= 1) return;
    toast.info("Quantity decrease requires a remove/update function in CartContext.");
  }

  return (
    <div className="group overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      {/* Food Image */}
      <div className="relative h-64 w-full overflow-hidden rounded-t-3xl bg-gray-100">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized={item.image.startsWith("http")}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50 text-5xl">
            🍽️
          </div>
        )}

        {/* Sold Out Badge */}
        {!available && (
          <div className="absolute left-3 top-3">
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 shadow-sm">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex min-h-[170px] flex-col justify-between p-6">
        <div>
          {/* Title */}
          <h3 className="text-xl font-bold tracking-tight text-gray-900">
            {item.name}
          </h3>

          {/* Description */}
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
            {item.description ||
              "Freshly prepared with premium ingredients."}
          </p>
        </div>

        {/* Bottom Row */}
        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
          {/* Price */}
          <span className="text-3xl font-extrabold tracking-tight text-orange-600">
            ₹{item.price}
          </span>

          {/* Cart Controls */}
          {available ? (
            quantity === 0 ? (
              <Button
                onClick={handleAddToCart}
                className="rounded-full bg-orange-500 px-6 py-2 font-semibold text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-orange-600 active:scale-95"
              >
                + Add
              </Button>
            ) : (
              <div className="flex items-center gap-1 rounded-full bg-orange-500 p-1 shadow-md">
                <Button
                  type="button"
                  onClick={handleDecrease}
                  className="h-9 w-9 rounded-full bg-white px-0 text-lg font-bold text-orange-600 hover:bg-orange-50"
                >
                  −
                </Button>

                <span className="min-w-8 text-center font-bold text-white">
                  {quantity}
                </span>

                <Button
                  type="button"
                  onClick={handleIncrease}
                  className="h-9 w-9 rounded-full bg-white px-0 text-lg font-bold text-orange-600 hover:bg-orange-50"
                >
                  +
                </Button>
              </div>
            )
          ) : (
            <Button
              disabled
              className="cursor-not-allowed rounded-full bg-gray-200 px-6 py-2 text-gray-500 opacity-60"
            >
              Sold Out
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(MenuCard);