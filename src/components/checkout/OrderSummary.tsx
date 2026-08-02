"use client";

import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";

export default function OrderSummary() {
  const { cart } = useCart();
  const router = useRouter();

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const deliveryFee = cart.length > 0 ? 40 : 0;

  const total = subtotal + deliveryFee;

  return (
    <section className="rounded-3xl border bg-white p-8 shadow-sm sticky top-24">

      <h2 className="mb-6 text-2xl font-bold">
        Order Summary
      </h2>

      <div className="space-y-4">

        {cart.map((item) => (
          <div
            key={item.id}
            className="flex justify-between"
          >
            <span>
              {item.name} × {item.quantity}
            </span>

            <span>
              ₹{item.price * item.quantity}
            </span>
          </div>
        ))}

        <hr />

        <div className="flex justify-between">
          <span>Subtotal</span>

          <span>₹{subtotal}</span>
        </div>

        <div className="flex justify-between">
          <span>Delivery Fee</span>

          <span>₹{deliveryFee}</span>
        </div>

        <div className="flex justify-between text-xl font-bold">
          <span>Total</span>

          <span className="text-orange-600">
            ₹{total}
          </span>
        </div>

      </div>

      <Button
        className="mt-8 w-full"
        disabled={cart.length === 0}
        onClick={() => router.push("/order-success")}
      >
        Place Order
      </Button>

    </section>
  );
}