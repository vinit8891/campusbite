"use client";

import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";

import AddressForm from "@/components/checkout/AddressForm";
import PaymentMethods from "@/components/checkout/PaymentMethods";
import OrderSummary from "@/components/checkout/OrderSummary";
import { useCart } from "@/context/CartContext";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart } = useCart();

  if (cart.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xs border border-stone-200/80">
          <div className="text-5xl">🛒</div>

          <h2 className="mt-4 text-xl font-bold text-stone-900">
            Your cart is empty
          </h2>

          <p className="mt-1 text-xs text-stone-500">
            Add some delicious food before checking out.
          </p>

          <button
            type="button"
            onClick={() => router.push(ROUTES.RESTAURANTS)}
            className="mt-6 rounded-xl bg-amber-600 hover:bg-amber-700 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
          >
            Browse Restaurants
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-32 min-h-screen bg-stone-50">
      {/* Header */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-stone-500 transition hover:text-amber-700 cursor-pointer"
        >
          ← Back to Cart
        </button>

        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
          Checkout
        </h1>
        <p className="mt-0.5 text-xs text-stone-500">
          Review your order, hostel drop point, and payment method.
        </p>
      </div>

      {/* Streamlined Checkout Stack */}
      <div className="space-y-4">
        {/* 1. Delivery Details (Address, Campus Preset Chips, Recipient Badge) */}
        <AddressForm />

        {/* 2. Payment Method Selector */}
        <section className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-2xs">
          <PaymentMethods />
        </section>

        {/* 3. Order Summary, Tipping, and Sticky Bottom CTA Bar */}
        <OrderSummary />
      </div>
    </main>
  );
}