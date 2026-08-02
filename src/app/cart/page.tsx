"use client";

import { useRouter } from "next/navigation";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
    const router = useRouter();

  const {
    cart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">

      <h1 className="mb-10 text-4xl font-bold">
        Shopping Cart
      </h1>

      {cart.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center">
          <h2 className="text-2xl font-semibold">
            Your cart is empty
          </h2>

          <p className="mt-3 text-gray-500">
            Add some delicious food 🍔
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-6">

            {cart.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-5 rounded-2xl border p-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-5">

                  <div className="relative h-24 w-24 overflow-hidden rounded-xl">

                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />

                  </div>

                  <div>

                    <h2 className="text-xl font-semibold">
                      {item.name}
                    </h2>

                    <p className="mt-2 font-medium text-orange-600">
                      ₹{item.price}
                    </p>

                  </div>

                </div>

                <div className="flex items-center gap-3">

                  <Button
                    variant="outline"
                    onClick={() =>
                      decreaseQuantity(item.id)
                    }
                  >
                    −
                  </Button>

                  <span className="w-8 text-center text-lg font-bold">
                    {item.quantity}
                  </span>

                  <Button
                    variant="outline"
                    onClick={() =>
                      increaseQuantity(item.id)
                    }
                  >
                    +
                  </Button>

                </div>

                <div className="text-right">

                  <p className="text-xl font-bold">
                    ₹{item.price * item.quantity}
                  </p>

                  <Button
                    variant="destructive"
                    className="mt-3"
                    onClick={() =>
                      removeFromCart(item.id)
                    }
                  >
                    Remove
                  </Button>

                </div>

              </div>
            ))}

          </div>

          <div className="mt-10 rounded-2xl border bg-gray-50 p-8">

            <div className="flex items-center justify-between">

              <h2 className="text-2xl font-bold">
                Grand Total
              </h2>

              <span className="text-3xl font-bold text-orange-600">
                ₹{total}
              </span>

            </div>

            <div className="mt-8 flex flex-wrap gap-4">

              <Button
                variant="outline"
                onClick={clearCart}
              >
                Clear Cart
              </Button>

              <Button
                onClick={() => router.push("/checkout")}
                >
                Proceed to Checkout
                </Button>

            </div>

          </div>
        </>
      )}

    </main>
  );
}