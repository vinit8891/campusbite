"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useCheckout } from "@/context/CheckoutContext";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";

const QUICK_INSTRUCTIONS = [
  "Call when downstairs",
  "Leave at hostel security / reception",
  "Call from main gate",
];

const CAMPUS_CHIPS = [
  { name: "Hostel Block A", icon: "🏢" },
  { name: "Hostel Block B", icon: "🏢" },
  { name: "Hostel Block C", icon: "🌸" },
  { name: "Central Library", icon: "📚" },
  { name: "Main Canteen", icon: "🍽️" },
  { name: "Main Gate", icon: "🚀" },
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
  const {
    savedAddresses,
    setActiveAddress,
    openLocationModal,
  } = useLocation();

  const [isEditingRecipient, setIsEditingRecipient] = useState(false);
  const [showNotes, setShowNotes] = useState(
    Boolean(checkout.landmark?.trim() || checkout.delivery_instructions?.trim())
  );

  const [errors, setErrors] = useState({
    customer_name: "",
    phone: "",
    hostel_block: "",
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

  const recipientName =
    checkout.customer_name || user?.name || "Self";
  const recipientPhone =
    checkout.phone || user?.phone || "";
  const hasSelfRecipientDetails = Boolean(
    (checkout.customer_name || user?.name) &&
      (checkout.phone || user?.phone)
  );

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Delivery Details</h2>
          <p className="text-xs text-stone-500">
            Select delivery mode and campus location
          </p>
        </div>
      </div>

      {/* =========================================================
          1. COMPACT HORIZONTAL SEGMENTED DELIVERY MODE TOGGLE
      ========================================================== */}
      <div className="rounded-2xl bg-stone-100 p-1.5 border border-stone-200/80">
        <div
          className="grid grid-cols-2 gap-1"
          role="group"
          aria-label="Delivery mode"
        >
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
            className={`relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isBatch
                ? "bg-white text-stone-900 shadow-sm border border-stone-200"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <span>🏢 Hostel Batch</span>
            <span className="font-extrabold text-amber-600">₹15</span>
            <span className="ml-0.5 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
              Save ₹25
            </span>
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
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !isBatch
                ? "bg-white text-stone-900 shadow-sm border border-stone-200"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <span>🚀 Express Door</span>
            <span className="font-bold text-stone-700">₹40</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          2. RECIPIENT DETAILS (PROGRESSIVE DISCLOSURE)
      ========================================================== */}
      <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-2xs space-y-3">
        {/* Recipient Segmented Selector: Myself vs Someone Else */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex rounded-xl bg-stone-100 p-1 border border-stone-200/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setCheckout((prev) => ({ ...prev, delivery_for: "self" }));
                setIsEditingRecipient(false);
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                checkout.delivery_for === "self"
                  ? "bg-white text-amber-700 shadow-2xs font-bold"
                  : "text-stone-600 hover:text-stone-900"
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
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                checkout.delivery_for === "someone_else"
                  ? "bg-white text-amber-700 shadow-2xs font-bold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              👤 Someone Else
            </button>
          </div>

          {checkout.delivery_for === "self" && (
            <button
              type="button"
              onClick={() => setIsEditingRecipient((prev) => !prev)}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
            >
              {isEditingRecipient ? "Done" : "Change"}
            </button>
          )}
        </div>

        {/* 1-Line Badge for Myself (when collapsed) */}
        {checkout.delivery_for === "self" &&
        !isEditingRecipient &&
        hasSelfRecipientDetails ? (
          <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2 border border-stone-200/80 text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-stone-900 truncate">
                {recipientName} {recipientPhone ? `(${recipientPhone})` : ""}
              </span>
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                Self
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingRecipient(true)}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 ml-2 cursor-pointer"
            >
              Change
            </button>
          </div>
        ) : (
          /* Expanded Name and Phone Inputs */
          <div className="grid gap-2.5 pt-1 sm:grid-cols-2">
            <div>
              <label
                htmlFor="checkout-customer-name"
                className="mb-1 block text-xs font-bold text-stone-700"
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
                className="mb-1 block text-xs font-bold text-stone-700"
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

      {/* =========================================================
          3. STREAMLINED 2-FIELD CAMPUS ADDRESS
      ========================================================== */}
      <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-2xs space-y-3">
        {/* Saved Addresses & Campus Quick Chips */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Quick Select Campus Location
            </label>
            <button
              type="button"
              onClick={openLocationModal}
              className="text-[11px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
            >
              📍 GPS / Map
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {/* Campus preset chips */}
            {CAMPUS_CHIPS.map((chip) => {
              const isSelected = checkout.hostel_block === chip.name;
              return (
                <button
                  key={chip.name}
                  type="button"
                  onClick={() => {
                    setCheckout((prev) => ({
                      ...prev,
                      hostel_block: chip.name,
                    }));
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-600 text-white font-bold shadow-2xs"
                      : "bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200/60"
                  }`}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.name}</span>
                </button>
              );
            })}

            {/* Saved addresses (if any) */}
            {savedAddresses.map((saved) => {
              const isSelected =
                checkout.hostel_block === saved.buildingOrSociety;
              return (
                <button
                  key={saved.id}
                  type="button"
                  onClick={() => {
                    setActiveAddress(saved);
                    setCheckout((prev) => ({
                      ...prev,
                      hostel_block: saved.buildingOrSociety,
                      address: saved.roomOrFlat || prev.address,
                      landmark: saved.areaOrLandmark || prev.landmark,
                      latitude: saved.lat ?? prev.latitude,
                      longitude: saved.lng ?? prev.longitude,
                    }));
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-600 text-white font-bold shadow-2xs"
                      : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80"
                  }`}
                >
                  <span>🏠</span>
                  <span className="truncate max-w-[120px]">
                    {saved.buildingOrSociety}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2 Simple Campus Delivery Inputs */}
        <div className="grid gap-2.5">
          <div>
            <label
              htmlFor="checkout-building"
              className="mb-1 block text-xs font-bold text-stone-700"
            >
              Hostel / PG / Building Name
            </label>
            <Input
              id="checkout-building"
              placeholder="e.g. Hostel Block A, Balaji PG"
              value={checkout.hostel_block}
              className="h-9 text-xs"
              onChange={(e) => {
                const val = e.target.value;
                setCheckout((prev) => ({ ...prev, hostel_block: val }));
                setErrors((prev) => ({
                  ...prev,
                  hostel_block:
                    val.trim().length >= 2 ? "" : "Building name is required.",
                }));
              }}
            />
            {errors.hostel_block && (
              <p className="mt-1 text-[11px] text-red-500">
                {errors.hostel_block}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="checkout-address"
              className="mb-1 block text-xs font-bold text-stone-700"
            >
              Room / Flat / Floor
            </label>
            <Input
              id="checkout-address"
              placeholder="e.g. Room 304, Flat 201, 2nd Floor"
              value={checkout.address}
              className="h-9 text-xs"
              onChange={(e) => {
                const val = e.target.value;
                setCheckout((prev) => ({ ...prev, address: val }));
                setErrors((prev) => ({
                  ...prev,
                  address:
                    val.trim().length >= 1 ? "" : "Room/Flat is required.",
                }));
              }}
            />
            {errors.address && (
              <p className="mt-1 text-[11px] text-red-500">{errors.address}</p>
            )}
          </div>
        </div>

        {/* =========================================================
            4. PROGRESSIVE DISCLOSURE: NOTE / LANDMARK TOGGLE
        ========================================================== */}
        <div className="pt-1 border-t border-stone-100">
          {!showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer py-1"
            >
              + Add delivery note / landmark
            </button>
          ) : (
            <div className="space-y-2.5 pt-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">
                  Delivery Note & Landmark
                </span>
                <button
                  type="button"
                  onClick={() => setShowNotes(false)}
                  className="text-[11px] font-medium text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  Hide
                </button>
              </div>

              <div>
                <label
                  htmlFor="checkout-landmark"
                  className="mb-1 block text-[11px] font-semibold text-stone-600"
                >
                  Nearby Landmark{" "}
                  <span className="font-normal text-stone-400">(Optional)</span>
                </label>
                <Input
                  id="checkout-landmark"
                  placeholder="e.g. Opp. Campus Canteen, Wing B"
                  value={checkout.landmark}
                  className="h-8 text-xs"
                  onChange={(e) =>
                    setCheckout((prev) => ({
                      ...prev,
                      landmark: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="checkout-delivery-instructions"
                  className="mb-1 block text-[11px] font-semibold text-stone-600"
                >
                  Courier Instructions{" "}
                  <span className="font-normal text-stone-400">(Optional)</span>
                </label>
                <Input
                  id="checkout-delivery-instructions"
                  placeholder="e.g. Call when downstairs..."
                  value={checkout.delivery_instructions}
                  className="h-8 text-xs"
                  onChange={(e) =>
                    setCheckout((prev) => ({
                      ...prev,
                      delivery_instructions: e.target.value,
                    }))
                  }
                />

                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {QUICK_INSTRUCTIONS.map((instruction) => (
                    <button
                      key={instruction}
                      type="button"
                      onClick={() =>
                        setCheckout((prev) => ({
                          ...prev,
                          delivery_instructions:
                            prev.delivery_instructions === instruction
                              ? ""
                              : instruction,
                        }))
                      }
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition cursor-pointer ${
                        checkout.delivery_instructions === instruction
                          ? "border-amber-500 bg-amber-50 text-amber-900 font-bold"
                          : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      + {instruction}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}