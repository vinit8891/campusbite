"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  MapPin,
  Crosshair,
  Loader2,
  CheckCircle2,
  Navigation,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCheckout } from "@/context/CheckoutContext";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import {
  useLocation,
  matchNearestCampusLocation,
  CAMPUS_PRESETS,
  type DeliveryAddress,
} from "@/context/LocationContext";
import { requestGeolocation } from "@/hooks/useUserLocation";
import { toast } from "sonner";

// Backwards compatibility export
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

function useSafeLocation() {
  try {
    return useLocation();
  } catch {
    return {
      activeAddress: {
        id: "default-active",
        tag: "hostel" as const,
        roomOrFlat: "Rm 304",
        buildingOrSociety: "Hostel Block A",
        areaOrLandmark: "Campus Wing A",
        city: "Pune",
        lat: 18.4482,
        lng: 73.826,
        isDefault: true,
      },
      openLocationModal: () => {},
      detectGpsLocation: async () => null,
      isDetectingGps: false,
      setActiveAddress: () => {},
    };
  }
}

export default function AddressForm() {
  const { checkout, setCheckout } = useCheckout();
  useSafeCart();
  const { user } = useSafeAuth();
  const {
    activeAddress,
    openLocationModal,
    detectGpsLocation,
    isDetectingGps: locationDetectingGps,
    setActiveAddress,
  } = useSafeLocation();

  const [isLocating, setIsLocating] = useState(false);
  const [isGpsVerified, setIsGpsVerified] = useState(false);
  const [isChangingLocation, setIsChangingLocation] = useState(false);
  const [isEditingRecipient, setIsEditingRecipient] = useState(false);
  const [errors, setErrors] = useState({
    customer_name: "",
    phone: "",
  });

  const normType = String(checkout.delivery_type || "delivery").toLowerCase();
  const isTakeaway =
    normType === "takeaway" ||
    normType === "counter_takeaway" ||
    normType === "pickup" ||
    checkout.hostel_block === "Zeal Main Canteen Pickup";

  const deliveryType = isTakeaway ? "COUNTER_TAKEAWAY" : "DELIVERY";

  function setDeliveryType(mode: "DELIVERY" | "COUNTER_TAKEAWAY") {
    if (mode === "COUNTER_TAKEAWAY") {
      setCheckout((prev) => ({
        ...prev,
        delivery_type: "COUNTER_TAKEAWAY",
        hostel_block: "Zeal Main Canteen Pickup",
      }));
    } else {
      setCheckout((prev) => ({
        ...prev,
        delivery_type: "HOSTEL_BATCH",
        hostel_block:
          prev.hostel_block === "Zeal Main Canteen Pickup"
            ? "Hostel Block A"
            : prev.hostel_block || "Hostel Block A",
      }));
    }
  }

  // GPS Detection Handler
  const handleDetectGps = useCallback(
    async (isManual = false) => {
      setIsLocating(true);
      try {
        const coords = await requestGeolocation(isManual);
        if (coords) {
          const lat = coords.latitude;
          const lng = coords.longitude;
          const matched = matchNearestCampusLocation(lat, lng);

          const campusBuilding = matched.preset.name || "Hostel Block A";

          setCheckout((prev) => ({
            ...prev,
            hostel_block: campusBuilding,
            latitude: lat,
            longitude: lng,
          }));

          const newAddr: DeliveryAddress = {
            id: `gps-${Date.now()}`,
            tag: "hostel",
            type: "hostel",
            label: campusBuilding,
            roomOrFlat: checkout.address || "Room",
            buildingOrSociety: campusBuilding,
            areaOrLandmark: matched.preset.tag || "Narhe Campus",
            city: "Pune",
            lat,
            lng,
          };
          setActiveAddress?.(newAddr);
          setIsGpsVerified(true);

          if (isManual) {
            toast.success(`GPS verified: ${campusBuilding}`);
          }
        } else {
          // Fallback to campus benchmark
          if (!checkout.hostel_block || checkout.hostel_block === "Zeal Main Canteen Pickup") {
            setCheckout((prev) => ({
              ...prev,
              hostel_block: "Hostel Block A",
              latitude: prev.latitude ?? 18.4482,
              longitude: prev.longitude ?? 73.826,
            }));
          }
        }
      } catch (err) {
        console.warn("GPS detection failed:", err);
      } finally {
        setIsLocating(false);
      }
    },
    [checkout.address, checkout.hostel_block, setActiveAddress, setCheckout]
  );

  // Auto-detect GPS on initial load if delivery mode and coordinates not yet set
  useEffect(() => {
    try {
      const cached = localStorage.getItem("cb_last_address");
      if (cached) {
        const data = JSON.parse(cached);
        setCheckout((prev) => ({
          ...prev,
          hostel_block: prev.hostel_block || data.hostel_block || "Hostel Block A",
          address: prev.address ?? data.address ?? "",
          delivery_for: prev.delivery_for || data.delivery_for || "self",
          customer_name: prev.customer_name || data.customer_name || "",
          phone: prev.phone || data.phone || "",
          latitude: prev.latitude ?? data.latitude ?? 18.4482,
          longitude: prev.longitude ?? data.longitude ?? 73.826,
        }));
        return;
      }
    } catch {
      // ignore
    }

    if (!checkout.hostel_block) {
      setCheckout((prev) => ({
        ...prev,
        hostel_block: "Hostel Block A",
        latitude: prev.latitude ?? 18.4482,
        longitude: prev.longitude ?? 73.826,
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
        latitude: checkout.latitude,
        longitude: checkout.longitude,
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
    checkout.latitude,
    checkout.longitude,
  ]);

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

  const detectedBuilding =
    checkout.hostel_block && checkout.hostel_block !== "Zeal Main Canteen Pickup"
      ? checkout.hostel_block
      : activeAddress?.buildingOrSociety || "Hostel Block A";

  const coordinatesDisplay =
    checkout.latitude != null && checkout.longitude != null
      ? `${Number(checkout.latitude).toFixed(4)}° N, ${Number(checkout.longitude).toFixed(4)}° E`
      : "18.4482° N, 73.8260° E";

  const isDetecting = isLocating || locationDetectingGps;

  return (
    <section className="space-y-3 font-sans">
      {/* Header - clean & compact, no redundant subtitles */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900">Delivery Details</h2>
        {deliveryType !== "COUNTER_TAKEAWAY" && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            GPS Auto-Batched
          </span>
        )}
      </div>

      {/* Segmented Mode Switcher (Delivery vs Takeaway) */}
      <div className="bg-gray-100 p-1 rounded-xl flex gap-1 mb-4" role="group" aria-label="Fulfillment mode">
        <button
          type="button"
          aria-label="Campus Delivery"
          onClick={() => setDeliveryType("DELIVERY")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            deliveryType !== "COUNTER_TAKEAWAY"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <span>🛵</span> Delivery <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded">₹15</span>
        </button>
        <button
          type="button"
          aria-label="Takeaway"
          onClick={() => setDeliveryType("COUNTER_TAKEAWAY")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            deliveryType === "COUNTER_TAKEAWAY"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <span>🥡</span> Takeaway <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">FREE</span>
        </button>
      </div>

      {/* Delivery Mode: Automatic GPS / Google Maps Location Detector & Batching */}
      {deliveryType !== "COUNTER_TAKEAWAY" ? (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-3.5 shadow-2xs space-y-3">
          {/* Detected Campus Location Card */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-gray-900 truncate">
                    {detectedBuilding}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                    {isGpsVerified ? "● GPS Verified" : "● Campus Zone"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                  {coordinatesDisplay} • Zeal Narhe Campus
                </p>
              </div>
            </div>

            {/* GPS Actions: Re-detect & Change */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleDetectGps(true)}
                disabled={isDetecting}
                aria-label="Re-detect GPS location"
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200/60 transition flex items-center gap-1 cursor-pointer disabled:opacity-60"
              >
                {isDetecting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Crosshair className="h-3 w-3" />
                )}
                <span>{isDetecting ? "Locating..." : "Re-detect"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsChangingLocation((prev) => !prev)}
                aria-label={isChangingLocation ? "Done selecting location" : "Change delivery location"}
                className="px-2 py-1 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
              >
                {isChangingLocation ? "Done" : "Change"}
              </button>
            </div>
          </div>

          {/* Quick Campus Preset Switcher (when Change is clicked) */}
          {isChangingLocation && (
            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200/80 space-y-1.5 animate-in fade-in duration-150">
              <label
                htmlFor="campus-preset-selector"
                className="block text-[11px] font-bold text-gray-700"
              >
                Select Campus Building / Drop Point
              </label>
              <select
                id="campus-preset-selector"
                value={checkout.hostel_block || "Hostel Block A"}
                onChange={(e) => {
                  const val = e.target.value;
                  const foundPreset = CAMPUS_PRESETS.find((p) => p.name === val);
                  setCheckout((prev) => ({
                    ...prev,
                    hostel_block: val,
                    latitude: foundPreset?.lat ?? prev.latitude,
                    longitude: foundPreset?.lng ?? prev.longitude,
                  }));
                  setIsChangingLocation(false);
                }}
                className="w-full h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-800 focus:border-orange-500 focus:outline-none transition cursor-pointer"
              >
                {CAMPUS_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.name}>
                    {preset.icon} {preset.name} ({preset.tag})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Automatic Backend Order Batching Notification */}
          <div className="flex items-center gap-2 rounded-xl bg-blue-50/80 px-2.5 py-2 border border-blue-100/80 text-[11px] text-blue-900">
            <span className="text-sm">⚡</span>
            <div className="flex-1 min-w-0">
              <span className="font-bold">Auto-Batched Delivery Active:</span>{" "}
              <span className="text-blue-700">
                Orders to {detectedBuilding} are automatically clustered into 15-min campus waves for hot, grouped delivery.
              </span>
            </div>
          </div>

          {/* Room / Dept & Floor (Optional) */}
          <div className="pt-2 border-t border-gray-100">
            <label
              htmlFor="checkout-room-number"
              className="mb-1 block text-xs font-bold text-gray-700"
            >
              Hostel Room No. / Dept &amp; Floor (Optional)
            </label>
            <Input
              id="checkout-room-number"
              placeholder="e.g. Room 304, Wing B or Engineering Dept 2nd Floor"
              value={checkout.address || ""}
              className="h-9 text-xs"
              onChange={(e) => {
                const val = e.target.value;
                setCheckout((prev) => ({ ...prev, address: val }));
              }}
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Optional • Courier delivers directly to your room or floor upon arrival.
            </p>
          </div>
        </div>
      ) : (
        /* Takeaway Mode Card */
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 text-lg border border-emerald-100">
              🥡
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900">
                Canteen Counter Pickup (Takeaway)
              </h3>
              <p className="text-[11px] text-gray-500">
                No delivery fee • Pick up directly at the canteen counter once your order is marked Ready.
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-emerald-50/60 p-2.5 border border-emerald-100 text-[11px] text-emerald-800 flex items-center gap-2">
            <span>✅</span>
            <span>Ready in ~10-15 mins. Show your digital order token at the counter.</span>
          </div>
        </div>
      )}

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
              aria-label={isEditingRecipient ? "Done editing recipient" : "Change recipient details"}
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
              aria-label="Change recipient details"
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