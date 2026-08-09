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
    <>
      {/* Food Image */}

      <div className="relative h-52">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover"
        />
      </div>

      {/* Food Information */}

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

          {item.available ? (
            <Button onClick={handleAddToCart}>
              Add
            </Button>
          ) : (
            <Button disabled>
              Unavailable
            </Button>
          )}

        </div>

      </div>
    </>
  );
}