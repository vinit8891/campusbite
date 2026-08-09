"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";

type MenuCardProps = {
  item: {
    _id: string;
    name: string;
    description: string;
    image: string;
    price: number;
    available: boolean;
  };
};

export default function MenuCard({ item }: MenuCardProps) {
  const { addToCart } = useCart();

  function handleAddToCart() {
    addToCart({
      id: item._id,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: 1,
    });

    alert(`${item.name} added to cart!`);
  }

  return (
    <div className="group overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* Food Image */}
      <div className="relative h-56 w-full overflow-hidden">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Availability Badge */}
        <div className="absolute left-3 top-3">
          {item.available ? (
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

      {/* Food Information */}
      <div className="p-5">
        <div className="min-h-[90px]">
          <h3 className="text-xl font-bold text-gray-900">
            {item.name}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
            {item.description || "Delicious food prepared fresh for you."}
          </p>
        </div>

        {/* Price + Add Button */}
        <div className="mt-5 flex items-center justify-between border-t pt-4">
          <div>
            <p className="text-xs text-gray-400">
              Price
            </p>

            <span className="text-2xl font-bold text-orange-600">
              ₹{item.price}
            </span>
          </div>

          {item.available ? (
            <Button
              onClick={handleAddToCart}
              className="rounded-xl bg-orange-500 px-5 py-2 font-semibold text-white hover:bg-orange-600"
            >
              + Add
            </Button>
          ) : (
            <Button
              disabled
              className="rounded-xl"
            >
              Unavailable
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}