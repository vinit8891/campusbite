"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/routes";

import AddressForm from "@/components/checkout/AddressForm";
import PaymentMethods from "@/components/checkout/PaymentMethods";
import OrderSummary from "@/components/checkout/OrderSummary";
import { useCart } from "@/context/CartContext";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart } = useCart();

  const query = searchParams?.get("q") || "";
  const menuHref = query
    ? `${ROUTES.MENU}?q=${encodeURIComponent(query)}`
    : ROUTES.MENU;

  if (cart.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xs border border-stone-200/80">
          <div className="text-5xl">🛒</div>

          <h2 className="mt-4 text-xl font-bold text-stone-900">
            Your cart is empty
          </h2>

          <p className="mt-1 text-xs text-stone-500">
            Add delicious dishes from campus canteens before checking out.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push(menuHref)}
              className="w-full sm:w-auto rounded-xl bg-amber-600 hover:bg-amber-700 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>🍽️</span>
              <span>Browse Campus Menu</span>
            </button>
            <button
              type="button"
              onClick={() => router.push(ROUTES.RESTAURANTS)}
              className="w-full sm:w-auto rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-5 py-2.5 text-xs font-bold text-stone-700 transition-all cursor-pointer"
            >
              Browse Restaurants
            </button>
          </div>
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
          Review your order, campus drop spot, and payment method.
        </p>
      </div>

      {/* Streamlined Checkout Stack */}
      <div className="space-y-4">
        {/* 1. Delivery Details (Campus Delivery Spot Pills & Dropdown, Recipient Badge) */}
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

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-stone-50">
          <div className="text-sm font-semibold text-stone-500">Loading checkout...</div>
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}