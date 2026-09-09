"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus, Trash2, Zap, Building2, Store } from "lucide-react";

import { useCart } from "@/context/CartContext";
import { useCheckout } from "@/context/CheckoutContext";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import {
  calculateCheckoutPricing,
  getCalibratedAppPrice,
  type DeliveryMode,
  type CartItemInput,
  MICRO_CART_THRESHOLD,
} from "@/lib/pricingEngine";

export default function CartPage() {
  const router = useRouter();

  const {
    cart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    deliveryType,
    setDeliveryType,
  } = useCart();

  const { setCheckout } = useCheckout();

  const itemCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const cartInput: CartItemInput[] = useMemo(
    () =>
      cart.map((item) => ({
        id: String(item.id),
        name: item.name,
        counterPrice: item.price,
        quantity: item.quantity,
      })),
    [cart]
  );

  const activeDeliveryMode: DeliveryMode =
    deliveryType === "STANDARD" ? "EXPRESS_DOOR" : (deliveryType as DeliveryMode);

  // Determine micro-cart status and threshold amount
  const basePricing = useMemo(() => {
    if (cartInput.length === 0) {
      return {
        appSubtotal: 0,
        gstAmount: 0,
        platformTechFee: 0,
        deliveryFee: 0,
        totalStudentPayable: 0,
        isMicroCart: true,
        amountToUnlockExpress: MICRO_CART_THRESHOLD,
        canteenPayout: { baseFood: 0, gstPassThrough: 0, totalDisbursal: 0 },
        allowedDeliveryModes: ["HOSTEL_BATCH", "COUNTER_TAKEAWAY"] as DeliveryMode[],
      };
    }
    return calculateCheckoutPricing(cartInput, "HOSTEL_BATCH");
  }, [cartInput]);

  const isMicroCart = basePricing.isMicroCart;
  const amountToUnlockExpress = basePricing.amountToUnlockExpress;

  // Auto-fallback if currently on EXPRESS_DOOR but cart is micro-cart
  const effectiveMode: DeliveryMode =
    isMicroCart &&
    (activeDeliveryMode === "EXPRESS_DOOR" || (activeDeliveryMode as string) === "STANDARD")
      ? "HOSTEL_BATCH"
      : activeDeliveryMode;

  const pricing = useMemo(() => {
    if (cartInput.length === 0) return basePricing;
    return calculateCheckoutPricing(cartInput, effectiveMode);
  }, [cartInput, effectiveMode, basePricing]);

  function handleDeliveryModeChange(mode: DeliveryMode) {
    if (isMicroCart && mode === "EXPRESS_DOOR") return;
    setDeliveryType(mode);
    setCheckout((prev) => ({
      ...prev,
      delivery_type: mode,
    }));
  }

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
              Looks like you haven&apos;t added anything yet.
              Discover delicious dishes and add your favorites.
            </p>

            <Button
              className="mt-8 rounded-full bg-orange-500 px-8 py-6 text-base font-semibold shadow-md transition-all duration-200 hover:scale-105 hover:bg-orange-600"
              onClick={() => router.push(ROUTES.RESTAURANTS)}
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
            {itemCount} {itemCount === 1 ? "item" : "items"} from{" "}
            {cart.length} {cart.length === 1 ? "dish" : "dishes"}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Cart Items */}
          <section>
            <div className="space-y-4">
              {cart.map((item) => {
                const calibratedUnit = getCalibratedAppPrice(item.price);
                const itemTotal = calibratedUnit * item.quantity;

                return (
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
                          sizes="(max-width: 640px) 112px, 128px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          unoptimized={
                            item.image.startsWith("http") ||
                            item.image.startsWith("data:")
                          }
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50 text-4xl">
                          🍽️
                        </div>
                      )}
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => {
                        removeFromCart(item.id);
                      }}
                      aria-label={`Remove ${item.name}`}
                      className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-all duration-200 hover:bg-red-50 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    {/* Item Details */}
                    <div className="min-w-0 flex-1 pr-10">
                      <h2 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
                        {item.name}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Freshly prepared canteen meal
                      </p>

                      <p className="mt-3 text-lg font-extrabold text-orange-600">
                        ₹{calibratedUnit}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                        {/* Quantity Stepper */}
                        <div className="flex items-center rounded-full border border-gray-200 bg-gray-50 p-1">
                          <button
                            type="button"
                            onClick={() => decreaseQuantity(item.id)}
                            aria-label={`Decrease ${item.name} quantity`}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-orange-100 hover:text-orange-600 cursor-pointer"
                          >
                            <Minus className="h-4 w-4" />
                          </button>

                          <span className="w-9 text-center text-sm font-bold text-gray-900">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => increaseQuantity(item.id)}
                            aria-label={`Increase ${item.name} quantity`}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-orange-100 hover:text-orange-600 cursor-pointer"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Item Total */}
                        <span className="text-lg font-extrabold text-gray-900">
                          ₹{itemTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Order Summary */}
          <aside className="h-fit lg:sticky lg:top-6">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg space-y-5">
              <h2 className="text-xl font-extrabold text-gray-900">
                Order Summary
              </h2>

              {/* Dynamic Micro-Cart Nudge Banner */}
              {isMicroCart && (
                <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200 space-y-1">
                  <div className="flex items-center justify-between font-bold text-amber-900">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-amber-600" />
                      Unlock Express Delivery
                    </span>
                    <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px]">
                      Min ₹{MICRO_CART_THRESHOLD}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Add <span className="font-extrabold text-amber-950">₹{amountToUnlockExpress.toFixed(2)}</span> more to unlock 🚀 Direct Room Delivery.
                  </p>
                </div>
              )}

              {/* 3 Fulfillment Modes Selection */}
              <div>
                <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                  Select Fulfillment Mode
                </label>
                <div
                  className="grid grid-cols-3 gap-2"
                  role="radiogroup"
                  aria-label="Select Fulfillment Mode"
                >
                  {/* 1. Hostel Batch Drop */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={effectiveMode === "HOSTEL_BATCH"}
                    onClick={() => handleDeliveryModeChange("HOSTEL_BATCH")}
                    className={`relative flex flex-col justify-between rounded-2xl border-2 p-3 text-left transition cursor-pointer ${
                      effectiveMode === "HOSTEL_BATCH"
                        ? "border-orange-500 bg-orange-50/70 shadow-sm"
                        : "border-gray-200 bg-white hover:border-orange-200"
                    }`}
                  >
                    <div>
                      <span className="inline-block rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        Popular
                      </span>
                      <div className="mt-1.5 flex items-center gap-1 text-xs font-bold text-gray-900">
                        <Building2 className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                        <span className="truncate">Hostel Batch</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
                        Lobby Drop
                      </p>
                    </div>
                    <p className="mt-2 text-sm font-extrabold text-orange-600">
                      ₹15
                    </p>
                  </button>

                  {/* 2. Counter Takeaway (Self Pickup) */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={effectiveMode === "COUNTER_TAKEAWAY"}
                    onClick={() => handleDeliveryModeChange("COUNTER_TAKEAWAY")}
                    className={`relative flex flex-col justify-between rounded-2xl border-2 p-3 text-left transition cursor-pointer ${
                      effectiveMode === "COUNTER_TAKEAWAY"
                        ? "border-blue-600 bg-blue-50/70 shadow-sm"
                        : "border-gray-200 bg-white hover:border-blue-200"
                    }`}
                  >
                    <div>
                      <span className="inline-block rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                        Skip Queue
                      </span>
                      <div className="mt-1.5 flex items-center gap-1 text-xs font-bold text-gray-900">
                        <Store className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">Takeaway</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
                        Counter Pass
                      </p>
                    </div>
                    <p className="mt-2 text-sm font-extrabold text-blue-600">
                      ₹0
                    </p>
                  </button>

                  {/* 3. Direct Room Delivery (Express Door) */}
                  <button
                    type="button"
                    role="radio"
                    disabled={isMicroCart}
                    aria-checked={effectiveMode === "EXPRESS_DOOR"}
                    onClick={() => handleDeliveryModeChange("EXPRESS_DOOR")}
                    className={`relative flex flex-col justify-between rounded-2xl border-2 p-3 text-left transition ${
                      isMicroCart
                        ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200"
                        : effectiveMode === "EXPRESS_DOOR"
                        ? "border-purple-600 bg-purple-50/70 shadow-sm cursor-pointer"
                        : "border-gray-200 bg-white hover:border-purple-200 cursor-pointer"
                    }`}
                  >
                    <div>
                      <span
                        className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          isMicroCart
                            ? "bg-stone-200 text-stone-600"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {isMicroCart ? `+₹${amountToUnlockExpress.toFixed(0)}` : "Direct"}
                      </span>
                      <div className="mt-1.5 flex items-center gap-1 text-xs font-bold text-gray-900">
                        <Zap className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <span className="truncate">Direct Room</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
                        {isMicroCart ? "Locked" : "Door Drop"}
                      </p>
                    </div>
                    <p
                      className={`mt-2 text-sm font-extrabold ${
                        isMicroCart ? "text-gray-400" : "text-purple-600"
                      }`}
                    >
                      ₹40
                    </p>
                  </button>
                </div>
              </div>

              {/* Price Breakdown from pricingEngine */}
              <div className="space-y-3 border-t border-gray-100 pt-4 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-gray-900">
                    ₹{pricing.appSubtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-gray-600">
                  <span>Food GST (5%)</span>
                  <span className="font-semibold text-gray-900">
                    ₹{pricing.gstAmount.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <span>Delivery Fee</span>
                    {effectiveMode === "HOSTEL_BATCH" && (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        Hostel Batch
                      </span>
                    )}
                    {effectiveMode === "COUNTER_TAKEAWAY" && (
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                        Self Pickup
                      </span>
                    )}
                    {effectiveMode === "EXPRESS_DOOR" && (
                      <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                        Direct Room
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-gray-900">
                    ₹{pricing.deliveryFee.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-gray-600">
                  <div className="flex items-center gap-1">
                    <span>Platform Tech Fee</span>
                    <span className="text-[10px] text-gray-400">
                      ({effectiveMode === "COUNTER_TAKEAWAY" ? "₹3 pass" : "₹5 delivery"})
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    ₹{pricing.platformTechFee.toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      Grand Total
                    </span>

                    <span className="text-2xl font-extrabold text-orange-600">
                      ₹{pricing.totalStudentPayable.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                disabled={cart.length === 0}
                className="w-full rounded-2xl bg-orange-500 py-6 text-base font-bold shadow-md transition-all duration-200 hover:scale-[1.02] hover:bg-orange-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                onClick={() => router.push(ROUTES.CHECKOUT)}
              >
                Proceed to Checkout →
              </Button>

              <p className="text-center text-xs text-gray-400">
                Guaranteed fresh canteen delivery • COD & UPI Ready
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}