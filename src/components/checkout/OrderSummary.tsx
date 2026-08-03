"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useCheckout } from "@/context/CheckoutContext";
import { placeOrder } from "@/services/orderService";

export default function OrderSummary() {
  const router = useRouter();

  const {
    cart,
    clearCart,
  } = useCart();

  const { checkout } = useCheckout();

  const [loading, setLoading] = useState(false);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const deliveryFee = cart.length > 0 ? 40 : 0;

  const total = subtotal + deliveryFee;

  async function handlePlaceOrder() {
    if (
      !checkout.customer_name ||
      !checkout.phone ||
      !checkout.address ||
      !checkout.city ||
      !checkout.pincode
    ) {
      alert("Please fill all required address fields.");
      return;
    }

    try {
      setLoading(true);

      await placeOrder({
        customer_name: checkout.customer_name,
        phone: checkout.phone,
        address: checkout.address,
        city: checkout.city,
        pincode: checkout.pincode,
        landmark: checkout.landmark,
        payment_method: checkout.payment_method,
        items: cart,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        status: "Pending",
      });

      clearCart();

      router.push("/order-success");
    } catch (error) {
      console.error(error);
      alert("Failed to place order.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="sticky top-24 rounded-3xl border bg-white p-8 shadow-sm">

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
        disabled={cart.length === 0 || loading}
        onClick={handlePlaceOrder}
      >
        {loading ? "Placing Order..." : "Place Order"}
      </Button>

    </section>
  );
}