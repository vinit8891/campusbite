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

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Myself */}

          <button
            type="button"
            onClick={() => changeDeliveryFor("self")}
            className={`rounded-xl border-2 p-4 text-left transition ${
              checkout.delivery_for === "self"
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 bg-white hover:border-orange-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">🧑</div>

              <div>
                <p className="font-semibold text-gray-900">
                  Myself
                </p>

                <p className="text-xs text-gray-500">
                  Deliver to my address
                </p>
              </div>
            </div>
          </button>

          {/* Someone Else */}

          <button
            type="button"
            onClick={() =>
              changeDeliveryFor("someone_else")
            }
            className={`rounded-xl border-2 p-4 text-left transition ${
              checkout.delivery_for === "someone_else"
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 bg-white hover:border-orange-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">👤</div>

              <div>
                <p className="font-semibold text-gray-900">
                  Someone else
                </p>

                <p className="text-xs text-gray-500">
                  Deliver to another person
                </p>
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
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Recipient Name
          </label>

          <Input
            placeholder="Enter recipient's full name"
            autoCapitalize="words"
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
            <p className="mt-1 text-sm text-red-500">
              {errors.customer_name}
            </p>
          )}
        </div>

        {/* Mobile */}

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Recipient Mobile Number
          </label>

          <Input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="9876543210"
            maxLength={10}
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
            <p className="mt-1 text-sm text-red-500">
              {errors.phone}
            </p>
          )}
        </div>

        {/* Address */}

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Delivery Address
          </label>

          <textarea
            rows={3}
            placeholder="Flat, Building, Street"
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
            <p className="mt-1 text-sm text-red-500">
              {errors.address}
            </p>
          )}
        </div>

        {/* City + PIN */}

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              City
            </label>

            <Input
              placeholder="Pune"
              autoCapitalize="words"
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
              <p className="mt-1 text-sm text-red-500">
                {errors.city}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              PIN Code
            </label>

            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder="411041"
              value={checkout.pincode}
              onChange={(e) => {
                const value = e.target.value.replace(
                  /\D/g,
                  ""
                );

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
              <p className="mt-1 text-sm text-red-500">
                {errors.pincode}
              </p>
            )}
          </div>
        </div>

        {/* Landmark */}

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Landmark
            <span className="ml-2 font-normal text-gray-400">
              Optional
            </span>
          </label>

          <Input
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
                Enter the recipient's delivery details above.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}