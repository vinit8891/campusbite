"use client";

import React, { useState, useEffect } from "react";
import { X, Crosshair, Check, MapPin, Building, Home, GraduationCap, Compass, Loader2 } from "lucide-react";
import {
  useLocation,
  AddressType,
  DeliveryAddress,
} from "@/context/LocationContext";
import { toast } from "sonner";

const TYPE_CONFIG: Record<
  AddressType,
  { label: string; icon: string; LucideIcon: React.ElementType }
> = {
  pg_flat: { label: "PG / Flat", icon: "🏠", LucideIcon: Home },
  hostel: { label: "Hostel", icon: "🏢", LucideIcon: Building },
  college: { label: "College / Campus", icon: "🎓", LucideIcon: GraduationCap },
  other: { label: "Other", icon: "📍", LucideIcon: Compass },
};

export function LocationPickerModal() {
  const {
    activeAddress,
    savedAddresses,
    isModalOpen,
    isDetectingGps,
    closeLocationModal,
    saveAndSelectAddress,
    setActiveAddress,
    detectGpsLocation,
  } = useLocation();

  const [selectedType, setSelectedType] = useState<AddressType>(
    activeAddress.type || "hostel"
  );
  const [roomOrFlat, setRoomOrFlat] = useState<string>(
    activeAddress.roomOrFlat || ""
  );
  const [buildingOrSociety, setBuildingOrSociety] = useState<string>(
    activeAddress.buildingOrSociety || ""
  );
  const [areaOrLandmark, setAreaOrLandmark] = useState<string>(
    activeAddress.areaOrLandmark || ""
  );

  useEffect(() => {
    if (isModalOpen) {
      setSelectedType(activeAddress.type || "hostel");
      setRoomOrFlat(activeAddress.roomOrFlat || "");
      setBuildingOrSociety(activeAddress.buildingOrSociety || "");
      setAreaOrLandmark(activeAddress.areaOrLandmark || "");
    }
  }, [isModalOpen, activeAddress]);

  if (!isModalOpen) return null;

  const handleSelectSaved = (saved: DeliveryAddress) => {
    setSelectedType(saved.type);
    setRoomOrFlat(saved.roomOrFlat || "");
    setBuildingOrSociety(saved.buildingOrSociety || "");
    setAreaOrLandmark(saved.areaOrLandmark || "");
    setActiveAddress(saved);
  };

  const handleSaveAndDeliver = () => {
    const trimmedBuilding = buildingOrSociety.trim() || "Delivery Location";
    const trimmedRoom = roomOrFlat.trim();
    const trimmedLandmark = areaOrLandmark.trim();

    saveAndSelectAddress({
      id: activeAddress.id.startsWith("addr-") ? activeAddress.id : `addr-${Date.now()}`,
      type: selectedType,
      label: trimmedBuilding,
      roomOrFlat: trimmedRoom,
      buildingOrSociety: trimmedBuilding,
      areaOrLandmark: trimmedLandmark,
      city: activeAddress.city || "Pune",
      lat: activeAddress.lat,
      lng: activeAddress.lng,
    });

    const labelSummary = trimmedRoom
      ? `${trimmedBuilding}, ${trimmedRoom}`
      : trimmedBuilding;

    toast.success(`Location set to ${labelSummary}`);
    closeLocationModal();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4"
    >
      {/* Backdrop */}
      <div
        data-testid="location-modal-backdrop"
        onClick={closeLocationModal}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Modal / Bottom Sheet */}
      <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl sm:max-w-lg animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
        {/* Grab Handle for Mobile */}
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-stone-200 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h2
              id="location-modal-title"
              className="text-base sm:text-lg font-bold text-stone-900 tracking-tight"
            >
              Select Delivery Location
            </h2>
            <p className="text-xs text-stone-500">
              Delivering to your hostel, PG, flat, or college department
            </p>
          </div>
          <button
            type="button"
            onClick={closeLocationModal}
            aria-label="Close location picker"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Section 1: Auto-Detect GPS Location */}
        <div className="mt-4">
          <button
            type="button"
            onClick={async () => {
              const detected = await detectGpsLocation();
              if (detected) {
                setBuildingOrSociety(detected.buildingOrSociety);
                setAreaOrLandmark(detected.areaOrLandmark);
                setSelectedType(detected.type || "other");
              }
            }}
            disabled={isDetectingGps}
            className="group w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-orange-50/80 border border-orange-200/80 text-orange-700 hover:bg-orange-100/90 active:scale-98 transition-all cursor-pointer disabled:opacity-70"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-xs shadow-orange-600/30 group-hover:scale-105 transition-transform">
                {isDetectingGps ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Crosshair className="h-5 w-5 animate-pulse" />
                )}
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs sm:text-sm font-bold text-stone-900">
                  {isDetectingGps
                    ? "Fetching GPS location..."
                    : "Use Current GPS Location"}
                </p>
                <p className="text-[11px] text-stone-500 truncate">
                  Auto-detect address via satellite & OpenStreetMap
                </p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-bold text-orange-600 bg-white border border-orange-200 px-2.5 py-1 rounded-lg">
              GPS
            </span>
          </button>
        </div>

        {/* Section 2: Address Type Selector */}
        <div className="mt-5">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-2">
            Address Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Address type">
            {(["pg_flat", "hostel", "college", "other"] as AddressType[]).map(
              (type) => {
                const isSelected = selectedType === type;
                const config = TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedType(type)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "border-orange-500 bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                        : "border-stone-200 bg-stone-50 text-stone-700 hover:border-orange-200 hover:bg-orange-50/50"
                    }`}
                  >
                    <span>{config.icon}</span>
                    <span className="truncate">{config.label}</span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Section 3: Address Input Fields */}
        <div className="mt-5 space-y-3">
          <div>
            <label
              htmlFor="delivery-room-input"
              className="text-xs font-semibold text-stone-700 block mb-1"
            >
              Flat / Room / House No.
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm select-none" role="img" aria-hidden="true">
                🚪
              </span>
              <input
                id="delivery-room-input"
                type="text"
                value={roomOrFlat}
                onChange={(e) => setRoomOrFlat(e.target.value)}
                placeholder="e.g. Flat 302, Room 14, 3rd Floor"
                className="h-10.5 w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-3.5 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="delivery-building-input"
              className="text-xs font-semibold text-stone-700 block mb-1"
            >
              Building / Society / Hostel Name
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm select-none" role="img" aria-hidden="true">
                🏢
              </span>
              <input
                id="delivery-building-input"
                type="text"
                value={buildingOrSociety}
                onChange={(e) => setBuildingOrSociety(e.target.value)}
                placeholder="e.g. Silver Oak PG, Hostel Block A, CS Dept"
                className="h-10.5 w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-3.5 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="delivery-landmark-input"
              className="text-xs font-semibold text-stone-700 block mb-1"
            >
              Area / Landmark <span className="text-stone-400 font-normal">(Optional)</span>
            </label>
            <div className="relative flex items-center">
              <MapPin className="absolute left-3.5 h-4 w-4 text-stone-400" />
              <input
                id="delivery-landmark-input"
                type="text"
                value={areaOrLandmark}
                onChange={(e) => setAreaOrLandmark(e.target.value)}
                placeholder="e.g. Near North Gate, Behind Canteen, Katraj"
                className="h-10.5 w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-3.5 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Saved Locations List */}
        {savedAddresses.length > 0 && (
          <div className="mt-5 pt-4 border-t border-stone-100">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-2.5">
              Saved Locations
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {savedAddresses.map((saved) => {
                const isSelected =
                  activeAddress.id === saved.id ||
                  (activeAddress.buildingOrSociety === saved.buildingOrSociety &&
                    activeAddress.roomOrFlat === saved.roomOrFlat);
                const config = TYPE_CONFIG[saved.type] || TYPE_CONFIG.other;

                return (
                  <button
                    key={saved.id}
                    type="button"
                    onClick={() => handleSelectSaved(saved)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/70 shadow-2xs ring-1 ring-orange-500"
                        : "border-stone-200/80 bg-white hover:border-orange-200 hover:bg-orange-50/30"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg select-none" role="img" aria-label={config.label}>
                        {config.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate">
                          {saved.buildingOrSociety}
                        </p>
                        <p className="text-[11px] text-stone-500 truncate">
                          {saved.roomOrFlat ? `${saved.roomOrFlat} • ` : ""}
                          {saved.areaOrLandmark || config.label}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 5: Action Button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={handleSaveAndDeliver}
            className="w-full py-3 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-orange-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Save & Deliver Here</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationPickerModal;
