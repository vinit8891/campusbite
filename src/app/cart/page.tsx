"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";

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

  const itemCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const deliveryFee = cart.length > 0 ? 40 : 0;

  const platformFee = cart.length > 0 ? 0 : 0;

  const total = subtotal + deliveryFee + platformFee;

  /*
   * Empty Cart
   */
  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-[#fffaf3] px-4 py-16 sm:px-6">
        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
          <div className="w-full rounded-3xl border border-orange-100 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-orange-100 text-5xl">
              🛒
            </div>

            <h1 className="mt-7 text-3xl font-extrabold tracking-tight text-gray-900">
              Your cart is empty
            </h1>

            <p className="mx-auto mt-3 max-w-md text-gray-500">
              Looks like you haven't added anything yet.
              Discover delicious dishes and add your favorites.
            </p>

            <Button
              className="mt-8 rounded-full bg-orange-500 px-8 py-6 text-base font-semibold shadow-md transition-all duration-200 hover:scale-105 hover:bg-orange-600"
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
    <main className="min-h-screen bg-[#fffaf3] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-8">
          <button
            onClick={() => router.back()}
            className="group mb-5 flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-orange-600"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Continue Shopping
          </button>

          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Your Order
          </h1>

          <p className="mt-2 text-gray-500">
            {itemCount} {itemCount === 1 ? "Item" : "Items"}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Cart Items */}
          <section>
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex gap-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-5"
                >
                  {/* Food Image */}
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-orange-50 sm:h-32 sm:w-32">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        unoptimized={item.image.startsWith("http")}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50 text-4xl">
                        🍽️
                      </div>
                    )}
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-all duration-200 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  {/* Item Details */}
                  <div className="min-w-0 flex-1 pr-10">
                    <h2 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
                      {item.name}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Freshly prepared with premium ingredients.
                    </p>

                    <p className="mt-3 text-lg font-extrabold text-orange-600">
                      ₹{item.price}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                      {/* Quantity Stepper */}
                      <div className="flex items-center rounded-full border border-gray-200 bg-gray-50 p-1">
                        <button
                          onClick={() => decreaseQuantity(item.id)}
                          aria-label={`Decrease ${item.name} quantity`}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-orange-100 hover:text-orange-600"
                        >
                          <Minus className="h-4 w-4" />
                        </button>

                        <span className="w-9 text-center text-sm font-bold text-gray-900">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => increaseQuantity(item.id)}
                          aria-label={`Increase ${item.name} quantity`}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-orange-100 hover:text-orange-600"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Item Total */}
                      <span className="text-lg font-extrabold text-gray-900">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Order Summary */}
          <aside className="h-fit lg:sticky lg:top-6">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg">
              <h2 className="text-xl font-extrabold text-gray-900">
                Order Summary
              </h2>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Items</span>
                  <span>{itemCount}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Delivery Fee</span>
                  <span>₹{deliveryFee}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Platform Fee</span>
                  <span>₹{platformFee}</span>
                </div>

                <div className="border-t border-gray-200 pt-5">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      Grand Total
                    </span>

                    <span className="text-2xl font-extrabold text-orange-600">
                      ₹{total}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                className="mt-6 w-full rounded-2xl bg-orange-500 py-6 text-base font-bold shadow-md transition-all duration-200 hover:scale-[1.02] hover:bg-orange-600 active:scale-[0.98]"
                onClick={() => router.push("/checkout")}
              >
                Proceed to Checkout →
              </Button>

              <p className="mt-4 text-center text-xs text-gray-400">
                Secure checkout • COD & Razorpay Test Mode
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}