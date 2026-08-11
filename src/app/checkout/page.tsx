"use client";

import { useRouter } from "next/navigation";

import AddressForm from "@/components/checkout/AddressForm";
import PaymentMethods from "@/components/checkout/PaymentMethods";
import OrderSummary from "@/components/checkout/OrderSummary";

export default function CheckoutPage() {
  const router = useRouter();

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
            Enter your delivery details and choose COD or Online Payment.
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