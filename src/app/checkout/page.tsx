"use client";

import AddressForm from "@/components/checkout/AddressForm";
import PaymentMethods from "@/components/checkout/PaymentMethods";
import OrderSummary from "@/components/checkout/OrderSummary";

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">

      <h1 className="mb-10 text-4xl font-bold">
        Checkout
      </h1>

      <div className="grid gap-10 lg:grid-cols-3">

        {/* Left Section */}

        <div className="space-y-8 lg:col-span-2">

          <AddressForm />

          <PaymentMethods />

        </div>

        {/* Right Section */}

        <div>

          <OrderSummary />

        </div>

      </div>

    </main>
  );
}