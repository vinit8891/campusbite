"use client";

import { useRouter } from "next/navigation";

import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";

export default function CartPage() {
  const router = useRouter();

  const {
    cart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
  } = useCart();

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (cart.length === 0) {
    return (
      <main className="mx-auto max-w-5xl p-10">
        <h1 className="mb-6 text-4xl font-bold">
          My Cart
        </h1>

        <p className="text-gray-500">
          Your cart is empty.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-10">

      <h1 className="mb-8 text-4xl font-bold">
        My Cart
      </h1>

      <div className="space-y-6">

        {cart.map((item) => (

          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl border p-5 shadow-sm"
          >

            <div>

              <h2 className="text-xl font-semibold">
                {item.name}
              </h2>

              <p className="text-gray-500">
                ₹{item.price}
              </p>

            </div>

            <div className="flex items-center gap-3">

              <Button
                variant="outline"
                onClick={() => decreaseQuantity(item.id)}
              >
                -
              </Button>

              <span className="w-6 text-center">
                {item.quantity}
              </span>

              <Button
                variant="outline"
                onClick={() => increaseQuantity(item.id)}
              >
                +
              </Button>

              <Button
                variant="destructive"
                onClick={() => removeFromCart(item.id)}
              >
                Remove
              </Button>

            </div>

          </div>

        ))}

      </div>

      <div className="mt-10 rounded-xl border bg-orange-50 p-6">

        <h2 className="text-2xl font-bold">
          Total: ₹{total}
        </h2>

        <Button
          className="mt-5 w-full"
          onClick={() => router.push("/checkout")}
        >
          Proceed to Checkout
        </Button>

      </div>

    </main>
  );
}