"use client";

import React, { useState, useEffect } from "react";
import { X, Crosshair, Check, MapPin, Loader2 } from "lucide-react";
import { useLocation, CAMPUS_PRESETS, CampusLocationPreset } from "@/context/LocationContext";
import { toast } from "sonner";

export function LocationPickerModal() {
  const {
    location,
    isModalOpen,
    isDetectingGps,
    closeLocationModal,
    setLocation,
    detectGpsLocation,
  } = useLocation();

  const [selectedPreset, setSelectedPreset] = useState<string>(location.hostel);
  const [roomInput, setRoomInput] = useState<string>(location.room || "Rm 304");

  useEffect(() => {
    if (isModalOpen) {
      setSelectedPreset(location.hostel);
      setRoomInput(location.room || "Rm 304");
    }
  }, [isModalOpen, location.hostel, location.room]);

  if (!isModalOpen) return null;

  const handleSelectPreset = (preset: CampusLocationPreset) => {
    setSelectedPreset(preset.name);
  };

  const handleConfirm = () => {
    const matchedPreset = CAMPUS_PRESETS.find((p) => p.name === selectedPreset);
    const lat = matchedPreset ? matchedPreset.lat : location.latitude;
    const lng = matchedPreset ? matchedPreset.lng : location.longitude;

    setLocation(selectedPreset, roomInput.trim(), lat, lng, false);
    toast.success(`Location set to ${selectedPreset}${roomInput.trim() ? `, ${roomInput.trim()}` : ""}`);
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
              Choose your campus drop-off zone or auto-detect with GPS
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
            onClick={() => void detectGpsLocation()}
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
                  {isDetectingGps ? "Fetching GPS location..." : "Use Current GPS Location"}
                </p>
                <p className="text-[11px] text-stone-500 truncate">
                  Auto-detect nearest campus hostel or gate via satellite
                </p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-bold text-orange-600 bg-white border border-orange-200 px-2.5 py-1 rounded-lg">
              GPS
            </span>
          </button>
        </div>

        {/* Section 2: Saved Campus Presets */}
        <div className="mt-5">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-2.5">
            Campus Drop-off Zones
          </label>
          <div className="space-y-2">
            {CAMPUS_PRESETS.map((preset) => {
              const isSelected = selectedPreset === preset.name;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-orange-500 bg-orange-50/70 shadow-xs ring-1 ring-orange-500"
                      : "border-stone-200/80 bg-white hover:border-orange-200 hover:bg-orange-50/30"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl select-none" role="img" aria-label={preset.name}>
                      {preset.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                        {preset.name}
                      </p>
                      <p className="text-[11px] text-stone-500 truncate">
                        {preset.tag}
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

        {/* Section 3: Room / Specifics Input */}
        <div className="mt-5 pt-4 border-t border-stone-100">
          <label
            htmlFor="delivery-room-input"
            className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1.5"
          >
            Room / Desk / Specifics
          </label>
          <div className="relative flex items-center">
            <MapPin className="absolute left-3.5 h-4 w-4 text-stone-400" />
            <input
              id="delivery-room-input"
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="e.g. Rm 304, 3rd Floor, Wing B"
              className="h-11 w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-3.5 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>

        {/* Section 4: Action Button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-orange-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Confirm Location</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationPickerModal;
