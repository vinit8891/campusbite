"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useCheckout } from "@/context/CheckoutContext";
import { placeOrder } from "@/services/orderService";

export default function OrderSummary() {
  const router = useRouter();

  const { cart, clearCart } = useCart();
  const { checkout } = useCheckout();

  const [loading, setLoading] = useState(false);

  // -----------------------------
  // Calculate totals
  // -----------------------------

  const subtotal = cart.reduce(
    (sum, item) =>
      sum + item.price * item.quantity,
    0
  );

  const deliveryFee =
    cart.length > 0 ? 40 : 0;

  const total = subtotal + deliveryFee;

  // -----------------------------
  // Place Order
  // -----------------------------

  async function handlePlaceOrder() {
    // Prevent duplicate submission
    if (loading) {
      return;
    }

    // -----------------------------
    // Validate cart
    // -----------------------------

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    // -----------------------------
    // Validate recipient name
    // -----------------------------

    if (!checkout.customer_name.trim()) {
      alert(
        "Please enter the recipient name."
      );
      return;
    }

    // -----------------------------
    // Validate phone
    // -----------------------------

    if (!/^[0-9]{10}$/.test(checkout.phone)) {
      alert(
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    // -----------------------------
    // Validate address
    // -----------------------------

    if (!checkout.address.trim()) {
      alert(
        "Please enter the delivery address."
      );
      return;
    }

    if (!checkout.city.trim()) {
      alert("Please enter the city.");
      return;
    }

    if (
      !/^[0-9]{6}$/.test(
        checkout.pincode
      )
    ) {
      alert(
        "Please enter a valid 6-digit PIN code."
      );
      return;
    }

    // -----------------------------
    // Validate restaurant
    // -----------------------------

    if (
      !checkout.restaurant_email.trim()
    ) {
      alert(
        "Restaurant information is missing. Please go back to the restaurant and try again."
      );
      return;
    }

    try {
      setLoading(true);

      // Build complete address
      const fullAddress =
        `${checkout.address}, ${checkout.city} - ${checkout.pincode}` +
        (checkout.landmark.trim()
          ? `, ${checkout.landmark}`
          : "");

      // -----------------------------
      // Prepare order payload
      // -----------------------------

      const orderData = {
        restaurant_email:
          checkout.restaurant_email,

        customer_name:
          checkout.customer_name,

        phone:
          checkout.phone,

        address: fullAddress,

        payment_method:
          checkout.payment_method,

        items: cart,

        total,

        // GPS
        // For "someone else", these will
        // normally be null.
        latitude:
          checkout.latitude,

        longitude:
          checkout.longitude,

        // Restaurant GPS
        restaurant_latitude:
          checkout.restaurant_latitude,

        restaurant_longitude:
          checkout.restaurant_longitude,

        status: "Pending",

        // Delivery recipient type
        delivery_for:
          checkout.delivery_for,
      };

      console.log(
        "Placing Order:",
        orderData
      );

      // -----------------------------
      // Send order to backend
      // -----------------------------

      const response =
        await placeOrder(orderData);

      console.log(
        "Order Response:",
        response
      );

      // -----------------------------
      // Clear cart
      // -----------------------------

      clearCart();

      // -----------------------------
      // Go to success page
      // -----------------------------

      router.push(
        `/order-success?orderId=${response.id}`
      );
    } catch (error) {
      console.error(
        "Place Order Error:",
        error
      );

      alert(
        "Failed to place order. Please check that the backend is running and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">

      {/* =========================
          TITLE
      ========================== */}

      <h2 className="mb-6 text-2xl font-bold">
        Order Summary
      </h2>

      {/* =========================
          CART ITEMS
      ========================== */}

      <div className="space-y-4">

        {cart.map((item) => (
          <div
            key={item.id}
            className="flex justify-between gap-4"
          >

            <span className="text-gray-700">
              {item.name} × {item.quantity}
            </span>

            <span className="font-medium">
              ₹
              {(
                item.price *
                item.quantity
              ).toFixed(2)}
            </span>

          </div>
        ))}

      </div>

      <hr className="my-5" />

      {/* =========================
          SUBTOTAL
      ========================== */}

      <div className="flex justify-between">
        <span className="text-gray-600">
          Subtotal
        </span>

        <span>
          ₹{subtotal.toFixed(2)}
        </span>
      </div>

      {/* =========================
          DELIVERY FEE
      ========================== */}

      <div className="mt-3 flex justify-between">

        <span className="text-gray-600">
          Delivery Fee
        </span>

        <span>
          ₹{deliveryFee.toFixed(2)}
        </span>

      </div>

      <hr className="my-5" />

      {/* =========================
          TOTAL
      ========================== */}

      <div className="flex justify-between text-xl font-bold">

        <span>
          Total
        </span>

        <span className="text-orange-600">
          ₹{total.toFixed(2)}
        </span>

      </div>

      {/* =========================
          DELIVERY INFORMATION
      ========================== */}

      <div className="mt-6 rounded-xl bg-gray-50 p-4">

        <p className="text-sm font-semibold text-gray-700">
          Delivering to
        </p>

        <p className="mt-1 text-sm font-medium text-gray-900">
          {checkout.customer_name ||
            "Recipient"}
        </p>

        <p className="text-sm text-gray-500">
          {checkout.phone ||
            "Mobile number"}
        </p>

        <p className="mt-2 text-sm text-gray-500">
          {checkout.address
            ? `${checkout.address}, ${checkout.city} - ${checkout.pincode}`
            : "Delivery address not entered"}
        </p>

        {/* Someone else */}

        {checkout.delivery_for ===
          "someone_else" && (
          <p className="mt-3 text-xs font-semibold text-orange-600">
            👤 Order for someone else
          </p>
        )}

        {/* GPS */}

        {checkout.latitude !== null &&
          checkout.longitude !== null && (
            <p className="mt-2 text-xs font-semibold text-green-600">
              📍 GPS location available
            </p>
          )}

        {/* No GPS */}

        {checkout.latitude === null &&
          checkout.longitude === null && (
            <p className="mt-2 text-xs text-gray-400">
              📍 GPS location not available
            </p>
          )}

      </div>

      {/* =========================
          PAYMENT METHOD
      ========================== */}

      <div className="mt-4 rounded-xl bg-orange-50 p-4">

        <p className="text-xs font-medium text-orange-700">
          Payment Method
        </p>

        <p className="mt-1 font-semibold text-gray-900">
          {checkout.payment_method}
        </p>

      </div>

      {/* =========================
          PLACE ORDER BUTTON
      ========================== */}

      <Button
        className="mt-6 w-full bg-orange-500 hover:bg-orange-600"
        disabled={
          cart.length === 0 ||
          loading
        }
        onClick={
          handlePlaceOrder
        }
      >
        {loading
          ? "Placing Order..."
          : `Place Order • ₹${total.toFixed(2)}`}
      </Button>

    </section>
  );
}