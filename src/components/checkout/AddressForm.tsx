"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { useCheckout } from "@/context/CheckoutContext";

export default function AddressForm() {
  const { checkout, setCheckout } = useCheckout();

  const [errors, setErrors] = useState({
    customer_name: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
  });

  // -----------------------------
  // Change delivery recipient
  // -----------------------------
  function changeDeliveryFor(
    value: "self" | "someone_else"
  ) {
    setCheckout((prev) => ({
      ...prev,
      delivery_for: value,
    }));
  }

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      {/* Header */}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Delivery Address
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Tell us where you want your order delivered.
        </p>
      </div>

      {/* =========================
          DELIVERY FOR
      ========================== */}

      <div className="mb-7">
        <label className="mb-3 block text-sm font-semibold text-gray-700">
          Who are you ordering for?
        </label>

        <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Delivery recipient">
          {/* Myself */}
          <button
            type="button"
            aria-pressed={checkout.delivery_for === "self"}
            onClick={() => changeDeliveryFor("self")}
            className={`rounded-xl border-2 p-4 text-left transition ${
              checkout.delivery_for === "self"
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 bg-white hover:border-orange-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl" aria-hidden="true">🧑</div>
              <div>
                <p className="font-semibold text-gray-900">Myself</p>
                <p className="text-xs text-gray-500">Deliver to my address</p>
              </div>
            </div>
          </button>

          {/* Someone Else */}
          <button
            type="button"
            aria-pressed={checkout.delivery_for === "someone_else"}
            onClick={() => changeDeliveryFor("someone_else")}
            className={`rounded-xl border-2 p-4 text-left transition ${
              checkout.delivery_for === "someone_else"
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 bg-white hover:border-orange-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl" aria-hidden="true">👤</div>
              <div>
                <p className="font-semibold text-gray-900">Someone else</p>
                <p className="text-xs text-gray-500">Deliver to another person</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* =========================
          RECIPIENT DETAILS
      ========================== */}
      <div className="grid gap-5">
        {/* Full Name */}
        <div>
          <label htmlFor="checkout-customer-name" className="mb-2 block text-sm font-semibold text-gray-700">
            Recipient Name
          </label>
          <Input
            id="checkout-customer-name"
            placeholder="Enter recipient's full name"
            autoCapitalize="words"
            autoComplete="name"
            aria-invalid={errors.customer_name ? "true" : undefined}
            aria-describedby={errors.customer_name ? "customer-name-error" : undefined}
            value={checkout.customer_name}
            onChange={(e) => {
              const value = e.target.value;
              setCheckout((prev) => ({
                ...prev,
                customer_name: value,
              }));
              setErrors((prev) => ({
                ...prev,
                customer_name:
                  value.trim().length >= 3
                    ? ""
                    : "Name must be at least 3 characters.",
              }));
            }}
          />
          {errors.customer_name && (
            <p id="customer-name-error" className="mt-1 text-sm text-red-500" role="alert">
              {errors.customer_name}
            </p>
          )}
        </div>

        {/* Mobile */}
        <div>
          <label htmlFor="checkout-phone" className="mb-2 block text-sm font-semibold text-gray-700">
            Recipient Mobile Number
          </label>
          <Input
            id="checkout-phone"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="tel"
            placeholder="9876543210"
            maxLength={10}
            aria-invalid={errors.phone ? "true" : undefined}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            value={checkout.phone}
            onChange={(e) => {
              const value = e.target.value.replace(
                /\D/g,
                ""
              );

              setCheckout((prev) => ({
                ...prev,
                phone: value,
              }));

              setErrors((prev) => ({
                ...prev,
                phone: /^[6-9]\d{9}$/.test(value)
                  ? ""
                  : "Enter a valid 10-digit mobile number.",
              }));
            }}
          />

          {errors.phone && (
            <p id="phone-error" className="mt-1 text-sm text-red-500" role="alert">
              {errors.phone}
            </p>
          )}
        </div>

        {/* Address */}
        <div>
          <label htmlFor="checkout-address" className="mb-2 block text-sm font-semibold text-gray-700">
            Delivery Address
          </label>
          <textarea
            id="checkout-address"
            rows={3}
            autoComplete="street-address"
            placeholder="Flat, Building, Street"
            aria-invalid={errors.address ? "true" : undefined}
            aria-describedby={errors.address ? "address-error" : undefined}
            value={checkout.address}
            onChange={(e) => {
              const value = e.target.value;
              setCheckout((prev) => ({
                ...prev,
                address: value,
              }));
              setErrors((prev) => ({
                ...prev,
                address:
                  value.trim().length >= 10
                    ? ""
                    : "Address should be at least 10 characters.",
              }));
            }}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
          />
          {errors.address && (
            <p id="address-error" className="mt-1 text-sm text-red-500" role="alert">
              {errors.address}
            </p>
          )}
        </div>

        {/* City + PIN */}
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="checkout-city" className="mb-2 block text-sm font-semibold text-gray-700">
              City
            </label>
            <Input
              id="checkout-city"
              placeholder="Pune"
              autoCapitalize="words"
              autoComplete="address-level2"
              aria-invalid={errors.city ? "true" : undefined}
              aria-describedby={errors.city ? "city-error" : undefined}
              value={checkout.city}
              onChange={(e) => {
                const value = e.target.value;
                setCheckout((prev) => ({
                  ...prev,
                  city: value,
                }));
                setErrors((prev) => ({
                  ...prev,
                  city:
                    value.trim().length >= 2
                      ? ""
                      : "Enter a valid city.",
                }));
              }}
            />
            {errors.city && (
              <p id="city-error" className="mt-1 text-sm text-red-500" role="alert">
                {errors.city}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="checkout-pincode" className="mb-2 block text-sm font-semibold text-gray-700">
              PIN Code
            </label>
            <Input
              id="checkout-pincode"
              inputMode="numeric"
              maxLength={6}
              autoComplete="postal-code"
              placeholder="411041"
              aria-invalid={errors.pincode ? "true" : undefined}
              aria-describedby={errors.pincode ? "pincode-error" : undefined}
              value={checkout.pincode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setCheckout((prev) => ({
                  ...prev,
                  pincode: value,
                }));
                setErrors((prev) => ({
                  ...prev,
                  pincode:
                    /^\d{6}$/.test(value)
                      ? ""
                      : "PIN code must contain 6 digits.",
                }));
              }}
            />
            {errors.pincode && (
              <p id="pincode-error" className="mt-1 text-sm text-red-500" role="alert">
                {errors.pincode}
              </p>
            )}
          </div>
        </div>

        {/* Landmark */}
        <div>
          <label htmlFor="checkout-landmark" className="mb-2 block text-sm font-semibold text-gray-700">
            Landmark
            <span className="ml-2 font-normal text-gray-400">
              Optional
            </span>
          </label>
          <Input
            id="checkout-landmark"
            placeholder="Apartment, Gate No., Nearby Shop etc."
            value={checkout.landmark}
            onChange={(e) =>
              setCheckout((prev) => ({
                ...prev,
                landmark: e.target.value,
              }))
            }
          />
        </div>
      </div>

      {/* Someone Else Info */}

      {checkout.delivery_for === "someone_else" && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <div className="text-xl">👤</div>

            <div>
              <p className="font-semibold text-blue-900">
                Ordering for someone else
              </p>

              <p className="mt-1 text-sm text-blue-700">
                Enter the recipient&apos;s delivery details above.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}