"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useCheckout } from "@/context/CheckoutContext";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export const ZEAL_CAMPUS_SPOTS = [
  { label: "Boys Hostel 1 Gate", value: "Boys Hostel 1 Gate", icon: "🏢" },
  { label: "Boys Hostel 2 Gate", value: "Boys Hostel 2 Gate", icon: "🏢" },
  { label: "Girls Hostel Reception", value: "Girls Hostel Reception", icon: "🌸" },
  { label: "Zeal Polytechnic Lawn", value: "Zeal Polytechnic Lawn", icon: "🌿" },
  { label: "Central Library Porch", value: "Central Library Porch", icon: "📚" },
  { label: "Engineering Building Front", value: "Engineering Building Front", icon: "🏛️" },
  { label: "Zeal Main Canteen Pickup", value: "Zeal Main Canteen Pickup", icon: "🍲" },
];

function useSafeAuth() {
  try {
    return useAuth();
  } catch {
    return { user: null };
  }
}

function useSafeCart() {
  try {
    return useCart();
  } catch {
    return { cart: [], deliveryType: "HOSTEL_BATCH", setDeliveryType: () => {} };
  }
}

export default function AddressForm() {
  const { checkout, setCheckout } = useCheckout();
  useSafeCart();
  const { user } = useSafeAuth();

  const [isEditingRecipient, setIsEditingRecipient] = useState(false);
  const [errors, setErrors] = useState({
    customer_name: "",
    phone: "",
  });

  // Ensure default spot is assigned on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("cb_last_address");
      if (cached) {
        const data = JSON.parse(cached);
        setCheckout((prev) => ({
          ...prev,
          hostel_block: prev.hostel_block || data.hostel_block || "Boys Hostel 1 Gate",
          address: prev.address ?? data.address ?? "",
          delivery_for: prev.delivery_for || data.delivery_for || "self",
          customer_name: prev.customer_name || data.customer_name || "",
          phone: prev.phone || data.phone || "",
        }));
        return;
      }
    } catch {
      // ignore
    }

    if (!checkout.hostel_block) {
      setCheckout((prev) => ({
        ...prev,
        hostel_block: "Boys Hostel 1 Gate",
      }));
    }
  }, [setCheckout, checkout.hostel_block]);

  // Persist address fields to localStorage on change
  useEffect(() => {
    if (checkout.hostel_block || checkout.address) {
      const cacheData = {
        hostel_block: checkout.hostel_block,
        address: checkout.address,
        delivery_for: checkout.delivery_for,
        customer_name: checkout.customer_name,
        phone: checkout.phone,
      };
      try {
        localStorage.setItem("cb_last_address", JSON.stringify(cacheData));
      } catch {
        // ignore
      }
    }
  }, [
    checkout.hostel_block,
    checkout.address,
    checkout.delivery_for,
    checkout.customer_name,
    checkout.phone,
  ]);

  const normType = String(checkout.delivery_type || "delivery").toLowerCase();
  const isTakeaway =
    normType === "takeaway" ||
    normType === "counter_takeaway" ||
    normType === "pickup" ||
    checkout.hostel_block === "Zeal Main Canteen Pickup";

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

  const recipientName = checkout.customer_name || user?.name || "Self";
  const recipientPhone = checkout.phone || user?.phone || "";
  const hasSelfRecipientDetails = Boolean(
    (checkout.customer_name || user?.name) && (checkout.phone || user?.phone)
  );

  function handleSpotChange(spotValue: string) {
    const isCanteenPickup = spotValue === "Zeal Main Canteen Pickup";
    setCheckout((prev) => ({
      ...prev,
      hostel_block: spotValue,
      delivery_type: isCanteenPickup ? "COUNTER_TAKEAWAY" : "HOSTEL_BATCH",
    }));
  }

  const deliveryType = isTakeaway ? "COUNTER_TAKEAWAY" : "HOSTEL_BATCH";

  return (
    <section className="space-y-3 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Campus Delivery Details</h2>
          <p className="text-[11px] text-gray-500">
            Zeal Narhe Campus • 1-tap spot selection
          </p>
        </div>
        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
          Zeal Narhe Campus
        </span>
      </div>

      {/* Segmented Mode Switcher (Delivery vs Takeaway) */}
      <div className="bg-gray-100 p-1 rounded-xl flex gap-1 mb-4" role="group" aria-label="Fulfillment mode">
        <button
          type="button"
          aria-label="Campus Delivery"
          aria-pressed={deliveryType === "HOSTEL_BATCH"}
          onClick={() => {
            setCheckout((prev) => ({
              ...prev,
              delivery_type: "HOSTEL_BATCH",
              hostel_block:
                prev.hostel_block === "Zeal Main Canteen Pickup"
                  ? "Boys Hostel 1 Gate"
                  : prev.hostel_block || "Boys Hostel 1 Gate",
            }));
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            deliveryType === "HOSTEL_BATCH"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <span>🛵</span> Delivery <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded">₹15</span>
        </button>
        <button
          type="button"
          aria-label="Takeaway"
          aria-pressed={deliveryType === "COUNTER_TAKEAWAY"}
          onClick={() => {
            setCheckout((prev) => ({
              ...prev,
              delivery_type: "COUNTER_TAKEAWAY",
              hostel_block: "Zeal Main Canteen Pickup",
            }));
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            deliveryType === "COUNTER_TAKEAWAY"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <span>🥡</span> Takeaway <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">FREE</span>
        </button>
      </div>

      {/* Campus Delivery Spot Selector (Pills + Dropdown) */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-3.5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Campus Delivery Spot
          </label>
          <span className="text-[10px] font-semibold text-gray-400">
            Choose drop point
          </span>
        </div>

        {/* 1-Tap Pills */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Campus Delivery Spot Pills">
          {ZEAL_CAMPUS_SPOTS.map((spot) => {
            const isSelected = checkout.hostel_block === spot.value;
            return (
              <button
                key={spot.value}
                type="button"
                onClick={() => handleSpotChange(spot.value)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  isSelected
                    ? "bg-amber-600 text-white font-bold shadow-xs scale-[1.01]"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200/60 font-medium"
                }`}
              >
                <span>{spot.icon}</span>
                <span>{spot.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dropdown Selector */}
        <div>
          <label
            htmlFor="campus-spot-dropdown"
            className="mb-1 block text-[11px] font-medium text-gray-500"
          >
            Or choose spot from list
          </label>
          <select
            id="campus-spot-dropdown"
            value={checkout.hostel_block || "Boys Hostel 1 Gate"}
            onChange={(e) => handleSpotChange(e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 focus:border-orange-500 focus:outline-none transition cursor-pointer"
          >
            {ZEAL_CAMPUS_SPOTS.map((spot) => (
              <option key={spot.value} value={spot.value}>
                {spot.icon} {spot.label}
              </option>
            ))}
          </select>
        </div>

        {/* Single Optional Input: Hostel Room No. / Dept & Floor (Optional) */}
        <div className="pt-2 border-t border-gray-100">
          <label
            htmlFor="checkout-room-number"
            className="mb-1 block text-xs font-bold text-gray-700"
          >
            Hostel Room No. / Dept &amp; Floor (Optional)
          </label>
          <Input
            id="checkout-room-number"
            placeholder="e.g. Room 302 or Computer Dept 2nd Floor (Optional)"
            value={checkout.address || ""}
            className="h-9 text-xs"
            onChange={(e) => {
              const val = e.target.value;
              setCheckout((prev) => ({ ...prev, address: val }));
            }}
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Optional • Courier meets you directly at the selected campus spot gate or porch.
          </p>
        </div>
      </div>

      {/* Recipient Details */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-3.5 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex rounded-lg bg-gray-100 p-0.5 border border-gray-200/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setCheckout((prev) => ({ ...prev, delivery_for: "self" }));
                setIsEditingRecipient(false);
              }}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                checkout.delivery_for === "self"
                  ? "bg-white text-gray-900 shadow-2xs font-bold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              🧑 Myself
            </button>
            <button
              type="button"
              onClick={() => {
                setCheckout((prev) => ({
                  ...prev,
                  delivery_for: "someone_else",
                }));
                setIsEditingRecipient(true);
              }}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                checkout.delivery_for === "someone_else"
                  ? "bg-white text-gray-900 shadow-2xs font-bold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              👤 Someone Else
            </button>
          </div>

          {checkout.delivery_for === "self" && (
            <button
              type="button"
              onClick={() => setIsEditingRecipient((prev) => !prev)}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
            >
              {isEditingRecipient ? "Done" : "Change"}
            </button>
          )}
        </div>

        {/* 1-Line Badge for Myself (when collapsed) */}
        {checkout.delivery_for === "self" &&
        !isEditingRecipient &&
        hasSelfRecipientDetails ? (
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 border border-gray-200/60 text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-gray-800 truncate">
                {recipientName} {recipientPhone ? `(${recipientPhone})` : ""}
              </span>
              <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-800">
                Self
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingRecipient(true)}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 ml-2 cursor-pointer"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="grid gap-2 pt-1 sm:grid-cols-2">
            <div>
              <label
                htmlFor="checkout-customer-name"
                className="mb-1 block text-xs font-semibold text-gray-700"
              >
                Recipient Name
              </label>
              <Input
                id="checkout-customer-name"
                placeholder="Full Name"
                autoComplete="name"
                value={checkout.customer_name}
                className="h-9 text-xs"
                onChange={(e) => {
                  const val = e.target.value;
                  setCheckout((prev) => ({ ...prev, customer_name: val }));
                  setErrors((prev) => ({
                    ...prev,
                    customer_name:
                      val.trim().length >= 3
                        ? ""
                        : "Name must be at least 3 characters.",
                  }));
                }}
              />
              {errors.customer_name && (
                <p className="mt-1 text-[11px] text-red-500">
                  {errors.customer_name}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="checkout-phone"
                className="mb-1 block text-xs font-semibold text-gray-700"
              >
                Recipient Mobile Number
              </label>
              <Input
                id="checkout-phone"
                type="tel"
                maxLength={10}
                placeholder="10-digit number"
                value={checkout.phone}
                className="h-9 text-xs"
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setCheckout((prev) => ({ ...prev, phone: val }));
                  setErrors((prev) => ({
                    ...prev,
                    phone: /^[6-9]\d{9}$/.test(val)
                      ? ""
                      : "Enter a valid 10-digit mobile number.",
                  }));
                }}
              />
              {errors.phone && (
                <p className="mt-1 text-[11px] text-red-500">{errors.phone}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}