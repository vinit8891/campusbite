"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useCheckout } from "@/context/CheckoutContext";
import { useAuth } from "@/context/AuthContext";

const HOSTEL_BLOCKS = [
  "Hostel Block A",
  "Hostel Block B",
  "Hostel Block C",
  "Girls Hostel",
  "PG Complex",
];

const QUICK_INSTRUCTIONS = [
  "Call when downstairs",
  "Leave at hostel security / reception",
  "Call from main gate",
];

function useSafeAuth() {
  try {
    return useAuth();
  } catch {
    return { user: null };
  }
}

export default function AddressForm() {
  const { checkout, setCheckout } = useCheckout();
  const { user } = useSafeAuth();

  const [errors, setErrors] = useState({
    customer_name: "",
    phone: "",
    address: "",
  });

  const isBatch = checkout.delivery_type === "HOSTEL_BATCH";

  // Auto-fill recipient name and phone if ordering for self
  useEffect(() => {
    if (user && checkout.delivery_for === "self") {
      setCheckout((prev) => ({
        ...prev,
        customer_name: prev.customer_name || user.name || "",
        phone: prev.phone || user.phone || "",
      }));
    }
  }, [user, checkout.delivery_for, setCheckout]);

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Delivery Details</h2>
        <p className="mt-1 text-sm text-gray-500">
          Choose your delivery mode and specify your location.
        </p>
      </div>

      {/* =========================
          DELIVERY MODE SELECTOR
      ========================== */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-gray-700">
          Select Delivery Mode
        </label>
        <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Delivery mode">
          {/* Hostel Batch Drop */}
          <button
            type="button"
            aria-pressed={isBatch}
            onClick={() =>
              setCheckout((prev) => ({
                ...prev,
                delivery_type: "HOSTEL_BATCH",
              }))
            }
            className={`relative rounded-xl border-2 p-4 text-left transition ${
              isBatch
                ? "border-orange-500 bg-orange-50/70 shadow-sm"
                : "border-gray-200 bg-white hover:border-orange-300"
            }`}
          >
            <span className="absolute right-3 top-3 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
              Save ₹25
            </span>
            <div className="flex items-start gap-3">
              <div className="text-2xl" aria-hidden="true">🏢</div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">Hostel Batch Drop</p>
                  <span className="font-bold text-orange-600">₹15</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  Lobby drop slot delivery
                </p>
              </div>
            </div>
          </button>

          {/* Standard Express */}
          <button
            type="button"
            aria-pressed={!isBatch}
            onClick={() =>
              setCheckout((prev) => ({
                ...prev,
                delivery_type: "STANDARD",
              }))
            }
            className={`rounded-xl border-2 p-4 text-left transition ${
              !isBatch
                ? "border-orange-500 bg-orange-50/70 shadow-sm"
                : "border-gray-200 bg-white hover:border-orange-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl" aria-hidden="true">🚀</div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">Standard Express</p>
                  <span className="font-bold text-gray-700">₹40</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  Direct door / gate delivery
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Hostel Batch Drop Details */}
        {isBatch ? (
          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/80 p-4">
            <div className="flex items-center justify-between">
              <label htmlFor="hostel-block-select" className="text-xs font-semibold uppercase text-orange-900">
                Select Hostel / Complex
              </label>
              <span className="text-[11px] font-medium text-orange-700">20-min batch slots</span>
            </div>
            <select
              id="hostel-block-select"
              value={checkout.hostel_block}
              onChange={(e) =>
                setCheckout((prev) => ({
                  ...prev,
                  hostel_block: e.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-orange-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-orange-500"
            >
              {HOSTEL_BLOCKS.map((block) => (
                <option key={block} value={block}>
                  {block}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-orange-800">
              ℹ️ Orders delivered in 20-min batch slots to your hostel lobby.
            </p>
          </div>
        ) : null}
      </div>

      {/* =========================
          DELIVERY FOR
      ========================== */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-gray-700">
          Who are you ordering for?
        </label>
        <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Delivery recipient">
          <button
            type="button"
            aria-pressed={checkout.delivery_for === "self"}
            onClick={() => setCheckout((prev) => ({ ...prev, delivery_for: "self" }))}
            className={`rounded-xl border-2 p-3 text-left transition ${
              checkout.delivery_for === "self"
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 bg-white hover:border-orange-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🧑</span>
              <span className="text-sm font-semibold text-gray-900">Myself</span>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={checkout.delivery_for === "someone_else"}
            onClick={() => setCheckout((prev) => ({ ...prev, delivery_for: "someone_else" }))}
            className={`rounded-xl border-2 p-3 text-left transition ${
              checkout.delivery_for === "someone_else"
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 bg-white hover:border-orange-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">👤</span>
              <span className="text-sm font-semibold text-gray-900">Someone Else</span>
            </div>
          </button>
        </div>
      </div>

      {/* =========================
          RECIPIENT & ADDRESS DETAILS
      ========================== */}
      <div className="grid gap-4">
        <div>
          <label htmlFor="checkout-customer-name" className="mb-1 block text-sm font-semibold text-gray-700">
            Recipient Name
          </label>
          <Input
            id="checkout-customer-name"
            placeholder="Full Name"
            autoComplete="name"
            value={checkout.customer_name}
            onChange={(e) => {
              const val = e.target.value;
              setCheckout((prev) => ({ ...prev, customer_name: val }));
              setErrors((prev) => ({
                ...prev,
                customer_name: val.trim().length >= 3 ? "" : "Name must be at least 3 characters.",
              }));
            }}
          />
          {errors.customer_name && (
            <p className="mt-1 text-xs text-red-500">{errors.customer_name}</p>
          )}
        </div>

        <div>
          <label htmlFor="checkout-phone" className="mb-1 block text-sm font-semibold text-gray-700">
            Recipient Mobile Number
          </label>
          <Input
            id="checkout-phone"
            type="tel"
            maxLength={10}
            placeholder="9876543210"
            value={checkout.phone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setCheckout((prev) => ({ ...prev, phone: val }));
              setErrors((prev) => ({
                ...prev,
                phone: /^[6-9]\d{9}$/.test(val) ? "" : "Enter a valid 10-digit mobile number.",
              }));
            }}
          />
          {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="checkout-address" className="mb-1 block text-sm font-semibold text-gray-700">
            {isBatch ? "Room / Floor / Wing" : "Room / Flat / Building / Street"}
          </label>
          <textarea
            id="checkout-address"
            rows={2}
            placeholder={isBatch ? "Room 304, 3rd Floor, Wing B" : "Room 304, Flat / Building, Street"}
            value={checkout.address}
            onChange={(e) => {
              const val = e.target.value;
              setCheckout((prev) => ({ ...prev, address: val }));
              setErrors((prev) => ({
                ...prev,
                address: val.trim().length >= 3 ? "" : "Address must be at least 3 characters.",
              }));
            }}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
          />
          {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
        </div>

        <div>
          <label htmlFor="checkout-landmark" className="mb-1 block text-sm font-semibold text-gray-700">
            Nearby Reference / Landmark <span className="font-normal text-gray-400">(Optional)</span>
          </label>
          <Input
            id="checkout-landmark"
            placeholder="Nearby gate, canteen, staircase, or block entrance"
            value={checkout.landmark}
            onChange={(e) => setCheckout((prev) => ({ ...prev, landmark: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="checkout-delivery-instructions" className="mb-1 block text-sm font-semibold text-gray-700">
            Delivery Notes / Instructions for Courier <span className="font-normal text-gray-400">(Optional)</span>
          </label>
          <Input
            id="checkout-delivery-instructions"
            placeholder="e.g. Call when downstairs, leave at security..."
            value={checkout.delivery_instructions}
            onChange={(e) =>
              setCheckout((prev) => ({ ...prev, delivery_instructions: e.target.value }))
            }
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_INSTRUCTIONS.map((instruction) => (
              <button
                key={instruction}
                type="button"
                onClick={() =>
                  setCheckout((prev) => ({
                    ...prev,
                    delivery_instructions:
                      prev.delivery_instructions === instruction ? "" : instruction,
                  }))
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  checkout.delivery_instructions === instruction
                    ? "border-orange-500 bg-orange-100 text-orange-900 font-semibold"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:border-orange-300 hover:bg-orange-50/50"
                }`}
              >
                + {instruction}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}