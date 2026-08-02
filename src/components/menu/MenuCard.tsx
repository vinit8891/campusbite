"use client";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";

type MenuCardProps = {
  item: {
    id: number;
    name: string;
    description: string;
    image: string;
    price: number;
  };
};

export default function MenuCard({
  item,
}: MenuCardProps) {
  const { addToCart } = useCart();

  return (
    <div className="overflow-hidden rounded-3xl border bg-white shadow-md">

      <div className="relative h-52">

        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover"
        />

      </div>

      <div className="space-y-4 p-6">

        <h3 className="text-xl font-semibold">
          {item.name}
        </h3>

        <p className="text-gray-500">
          {item.description}
        </p>

        <div className="flex items-center justify-between">

          <span className="text-2xl font-bold text-orange-600">
            ₹{item.price}
          </span>

          <Button
            onClick={() =>
              addToCart({
                id: item.id,
                name: item.name,
                image: item.image,
                price: item.price,
                quantity: 1,
              })
            }
          >
            Add
          </Button>

        </div>

      </div>

    </div>
  );
}