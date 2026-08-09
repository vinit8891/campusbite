"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { useCheckout } from "@/context/CheckoutContext";

export default function AddressForm() {
  const { checkout, setCheckout } = useCheckout();

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationError, setLocationError] =
    useState("");

  // -----------------------------
  // Get Customer GPS Location
  // -----------------------------
  function getCustomerLocation() {
    if (!navigator.geolocation) {
      setLocationError(
        "Location is not supported by your browser."
      );
      return;
    }

    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCheckout((prev) => ({
          ...prev,

          latitude:
            position.coords.latitude,

          longitude:
            position.coords.longitude,
        }));

        setLocationLoading(false);
        setLocationError("");
      },
      (error) => {
        console.error(
          "Location Error:",
          error
        );

        setLocationLoading(false);

        if (error.code === 1) {
          setLocationError(
            "Location permission was denied. Please allow location access in your browser."
          );
        } else if (error.code === 2) {
          setLocationError(
            "Your location could not be detected. Please try again."
          );
        } else {
          setLocationError(
            "Unable to get your location. Please try again."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  // -----------------------------
  // Automatically get location
  // only when ordering for self
  // -----------------------------
  useEffect(() => {
    if (
      checkout.delivery_for !== "self"
    ) {
      return;
    }

    if (
      checkout.latitude !== null &&
      checkout.longitude !== null
    ) {
      return;
    }

    getCustomerLocation();
  }, []);

  const hasLocation =
    checkout.latitude !== null &&
    checkout.longitude !== null;

  // -----------------------------
  // Change delivery recipient
  // -----------------------------
  function changeDeliveryFor(
    value: "self" | "someone_else"
  ) {
    setCheckout((prev) => ({
      ...prev,

      delivery_for: value,

      // If ordering for someone else,
      // don't use the current user's GPS.
      ...(value === "someone_else"
        ? {
            latitude: null,
            longitude: null,
          }
        : {}),
    }));

    setLocationError("");
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
            onClick={() =>
              changeDeliveryFor("self")
            }
            className={`rounded-xl border-2 p-4 text-left transition ${
              checkout.delivery_for === "self"
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 bg-white hover:border-orange-300"
            }`}
          >
            <div className="flex items-center gap-3">

              <div className="text-2xl">
                🧑
              </div>

              <div>
                <p className="font-semibold text-gray-900">
                  Myself
                </p>

                <p className="text-xs text-gray-500">
                  Deliver to my location
                </p>
              </div>

            </div>
          </button>

          {/* Someone Else */}

          <button
            type="button"
            onClick={() =>
              changeDeliveryFor(
                "someone_else"
              )
            }
            className={`rounded-xl border-2 p-4 text-left transition ${
              checkout.delivery_for ===
              "someone_else"
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 bg-white hover:border-orange-300"
            }`}
          >
            <div className="flex items-center gap-3">

              <div className="text-2xl">
                👤
              </div>

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
            value={checkout.customer_name}
            onChange={(e) =>
              setCheckout((prev) => ({
                ...prev,
                customer_name:
                  e.target.value,
              }))
            }
          />
        </div>

        {/* Mobile */}

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Recipient Mobile Number
          </label>

          <Input
            type="tel"
            inputMode="numeric"
            placeholder="9876543210"
            maxLength={10}
            value={checkout.phone}
            onChange={(e) =>
              setCheckout((prev) => ({
                ...prev,
                phone: e.target.value.replace(
                  /\D/g,
                  ""
                ),
              }))
            }
          />
        </div>

        {/* Address */}

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Delivery Address
          </label>

          <Input
            placeholder="Flat, Building, Street"
            value={checkout.address}
            onChange={(e) =>
              setCheckout((prev) => ({
                ...prev,
                address: e.target.value,
              }))
            }
          />
        </div>

        {/* City + PIN */}

        <div className="grid gap-5 md:grid-cols-2">

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              City
            </label>

            <Input
              placeholder="Pune"
              value={checkout.city}
              onChange={(e) =>
                setCheckout((prev) => ({
                  ...prev,
                  city: e.target.value,
                }))
              }
            />
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
              onChange={(e) =>
                setCheckout((prev) => ({
                  ...prev,
                  pincode:
                    e.target.value.replace(
                      /\D/g,
                      ""
                    ),
                }))
              }
            />
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
            placeholder="Near Zeal College"
            value={checkout.landmark}
            onChange={(e) =>
              setCheckout((prev) => ({
                ...prev,
                landmark:
                  e.target.value,
              }))
            }
          />
        </div>

      </div>

      {/* =========================
          GPS LOCATION
      ========================== */}

      {checkout.delivery_for ===
        "self" && (
        <div
          className={`mt-6 rounded-2xl border p-4 ${
            hasLocation
              ? "border-green-200 bg-green-50"
              : "border-orange-200 bg-orange-50"
          }`}
        >

          <div className="flex items-start gap-3">

            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                hasLocation
                  ? "bg-green-100"
                  : "bg-orange-100"
              }`}
            >
              {hasLocation
                ? "📍"
                : "🧭"}
            </div>

            <div className="flex-1">

              {hasLocation ? (
                <>
                  <p className="font-semibold text-green-800">
                    Live location captured
                  </p>

                  <p className="mt-1 text-xs text-green-700">
                    Your location will help the
                    delivery partner find you.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-orange-800">
                    Location permission required
                  </p>

                  <p className="mt-1 text-xs text-orange-700">
                    Allow location access to help
                    the delivery partner find you.
                  </p>
                </>
              )}

            </div>

            {!hasLocation && (
              <button
                type="button"
                onClick={
                  getCustomerLocation
                }
                disabled={locationLoading}
                className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {locationLoading
                  ? "Getting..."
                  : "Allow Location"}
              </button>
            )}

          </div>

          {/* Error */}

          {locationError && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-600">
              {locationError}
            </div>
          )}

        </div>
      )}

      {/* Someone Else Info */}

      {checkout.delivery_for ===
        "someone_else" && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">

          <div className="flex gap-3">

            <div className="text-xl">
              👤
            </div>

            <div>
              <p className="font-semibold text-blue-900">
                Ordering for someone else
              </p>

              <p className="mt-1 text-sm text-blue-700">
                Enter the recipient's address above.
                GPS from your current location will
                not be used for this order.
              </p>
            </div>

          </div>

        </div>
      )}

    </section>
  );
}