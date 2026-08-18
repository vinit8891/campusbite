"use client";

import { useRouter } from "next/navigation";

import AddressForm from "@/components/checkout/AddressForm";
import PaymentMethods from "@/components/checkout/PaymentMethods";
import OrderSummary from "@/components/checkout/OrderSummary";
import { useCart } from "@/context/CartContext";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart } = useCart();

  if (cart.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf3] px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow">
          <div className="text-5xl">🛒</div>

          <h2 className="mt-5 text-2xl font-bold">
            Your cart is empty
          </h2>

          <p className="mt-2 text-gray-500">
            Add some delicious food before checking out.
          </p>

          <button
            onClick={() => router.push("/restaurants")}
            className="mt-6 rounded-full bg-orange-500 px-6 py-3 font-semibold text-white"
          >
            Browse Restaurants
          </button>
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
            className="mb-4 text-sm font-medium text-gray-500 transition hover:text-orange-600"
          >
            ← Back to Cart
          </button>

          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Checkout
          </h1>

          <p className="mt-2 text-gray-500">
            Review your order, enter your delivery details, and complete your payment securely.
          </p>
        </div>

        {/* Checkout Layout */}

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">

          {/* Left Side */}

          <div className="space-y-6">

            {/* Delivery Address */}

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <AddressForm />
            </section>

            {/* Payment */}

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <PaymentMethods />
            </section>

          </div>

          {/* Right Side */}

          <aside className="lg:sticky lg:top-6">
            <OrderSummary />
          </aside>

        </div>

      </div>
    </main>
  );
}