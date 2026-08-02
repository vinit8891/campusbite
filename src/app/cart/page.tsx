"use client";

import Image from "next/image";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { cart } = useCart();

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">

      <h1 className="mb-8 text-4xl font-bold">
        Shopping Cart
      </h1>

      <div className="space-y-5">

        {cart.map((item) => (

          <div
            key={item.id}
            className="flex items-center gap-5 rounded-2xl border p-4"
          >
            <Image
              src={item.image}
              alt={item.name}
              width={80}
              height={80}
            />

            <div className="flex-1">
              <h2 className="font-semibold">
                {item.name}
              </h2>

              <p>₹{item.price}</p>

              <p>Qty : {item.quantity}</p>
            </div>

          </div>

        ))}

      </div>

      <div className="mt-10 text-right">

        <h2 className="text-3xl font-bold">
          Total : ₹{total}
        </h2>

      </div>

    </main>
  );
}