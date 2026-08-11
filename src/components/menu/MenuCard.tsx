"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";

type MenuCardProps = {
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

export default function MenuCard({ item, restaurant }: MenuCardProps) {
  const { cart, addToCart, clearCart } = useCart();

  function handleAddToCart() {
    const email = restaurant.email?.trim();

    if (!email) {
      alert(
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

    alert(`${item.name} added to cart!`);
  }

  const available = item.available !== false;

  return (
    <div className="group overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-56 w-full overflow-hidden bg-gray-100">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized={item.image.startsWith("http")}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">
            🍽️
          </div>
        )}

        <div className="absolute left-3 top-3">
          {available ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 shadow-sm">
              ● Available
            </span>
          ) : (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 shadow-sm">
              ● Unavailable
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="min-h-[90px]">
          <h3 className="text-xl font-bold text-gray-900">
            {item.name}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
            {item.description || "Delicious food prepared fresh for you."}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t pt-4">
          <div>
            <p className="text-xs text-gray-400">Price</p>
            <span className="text-2xl font-bold text-orange-600">
              ₹{item.price}
            </span>
          </div>

          {available ? (
            <Button
              onClick={handleAddToCart}
              className="rounded-xl bg-orange-500 px-5 py-2 font-semibold text-white hover:bg-orange-600"
            >
              + Add
            </Button>
          ) : (
            <Button disabled className="rounded-xl">
              Unavailable
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
