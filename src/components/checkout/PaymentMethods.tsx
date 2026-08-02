"use client";

export default function PaymentMethods() {
  return (
    <section className="rounded-3xl border bg-white p-8 shadow-sm">

      <h2 className="mb-6 text-2xl font-bold">
        Payment Method
      </h2>

      <div className="space-y-4">

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 hover:bg-orange-50">

          <input
            type="radio"
            name="payment"
            defaultChecked
          />

          <div>
            <h3 className="font-semibold">
              Cash on Delivery
            </h3>

            <p className="text-sm text-gray-500">
              Pay when your order arrives.
            </p>
          </div>

        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 hover:bg-orange-50">

          <input
            type="radio"
            name="payment"
          />

          <div>
            <h3 className="font-semibold">
              UPI / Card / Net Banking
            </h3>

            <p className="text-sm text-gray-500">
              Secure online payment.
            </p>
          </div>

        </label>

      </div>

    </section>
  );
}