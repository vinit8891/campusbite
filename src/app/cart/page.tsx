"use client";

import Image from "next/image";
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

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const deliveryFee = cart.length > 0 ? 40 : 0;

  const total = subtotal + deliveryFee;

  /* Empty Cart */

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-[#fffaf3] px-4 py-16">
        <div className="mx-auto max-w-3xl">

          <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-4xl">
              🛒
            </div>

            <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
              Your cart is empty
            </h1>

            <p className="mt-3 text-gray-500">
              Looks like you haven't added anything to your cart yet.
            </p>

            <Button
              className="mt-8 rounded-xl bg-orange-500 px-8 py-3 hover:bg-orange-600"
              onClick={() => router.push("/restaurants")}
            >
              Browse Restaurants
            </Button>

          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf3] px-4 py-10 sm:px-6 lg:px-8">

      <div className="mx-auto max-w-6xl">

        {/* Header */}

        <div className="mb-8">

          <button
            onClick={() => router.back()}
            className="mb-4 text-sm font-medium text-gray-500 hover:text-orange-600"
          >
            ← Continue Shopping
          </button>

          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Your Cart
          </h1>

          <p className="mt-2 text-gray-500">
            {cart.length} {cart.length === 1 ? "item" : "items"} in your cart
          </p>

        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">

          {/* Cart Items */}

          <div className="space-y-4">

            {cart.map((item) => (

              <div
                key={item.id}
                className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >

                {/* Food Image */}

                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">

                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-orange-100 text-3xl">
                      🍽️
                    </div>
                  )}

                </div>

                {/* Item Details */}

                <div className="min-w-0 flex-1">

                  <h2 className="truncate text-lg font-bold text-gray-900">
                    {item.name}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    ₹{item.price} each
                  </p>

                  <div className="mt-4 flex items-center justify-between">

                    {/* Quantity */}

                    <div className="flex items-center rounded-xl border">

                      <button
                        onClick={() => decreaseQuantity(item.id)}
                        className="flex h-9 w-9 items-center justify-center text-lg font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                      >
                        −
                      </button>

                      <span className="w-9 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => increaseQuantity(item.id)}
                        className="flex h-9 w-9 items-center justify-center text-lg font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                      >
                        +
                      </button>

                    </div>

                    {/* Item Total */}

                    <span className="text-lg font-bold text-gray-900">
                      ₹{item.price * item.quantity}
                    </span>

                  </div>

                </div>

                {/* Remove */}

                <button
                  onClick={() => removeFromCart(item.id)}
                  className="self-start text-sm font-medium text-gray-400 hover:text-red-500"
                >
                  Remove
                </button>

              </div>

            ))}

          </div>

          {/* Order Summary */}

          <div className="h-fit rounded-2xl bg-white p-6 shadow-sm lg:sticky lg:top-6">

            <h2 className="text-xl font-bold text-gray-900">
              Order Summary
            </h2>

            <div className="mt-6 space-y-4">

              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span>₹{deliveryFee}</span>
              </div>

              <div className="border-t pt-4">

                <div className="flex justify-between">

                  <span className="text-lg font-bold text-gray-900">
                    Total
                  </span>

                  <span className="text-2xl font-extrabold text-orange-600">
                    ₹{total}
                  </span>

                </div>

              </div>

            </div>

            <Button
              className="mt-6 w-full rounded-xl bg-orange-500 py-6 text-base font-bold hover:bg-orange-600"
              onClick={() => router.push("/checkout")}
            >
              Proceed to Checkout →
            </Button>

            <p className="mt-4 text-center text-xs text-gray-400">
              Secure checkout • COD & Razorpay Test Mode
            </p>

          </div>

        </div>

      </div>

    </main>
  );
}