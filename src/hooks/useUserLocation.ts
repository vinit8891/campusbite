"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface UserLocation {
  lat: number | null;
  lng: number | null;
  campusLabel: string;
}

const STORAGE_KEY = "campusbite_user_location";
export const DEFAULT_CAMPUS = {
  lat: 18.4485,
  lng: 73.8267,
  campusLabel: "Near Zeal College, Narhe",
};

export function calculateDistanceKm(
  lat1: number | null | undefined,
  lon1: number | null | undefined,
  lat2: number | null | undefined,
  lon2: number | null | undefined
): number | null {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null;
  }
  const l1 = Number(lat1);
  const n1 = Number(lon1);
  const l2 = Number(lat2);
  const n2 = Number(lon2);
  if (isNaN(l1) || isNaN(n1) || isNaN(l2) || isNaN(n2)) {
    return null;
  }

  const R = 6371; // Earth's radius in km
  const dLat = ((l2 - l1) * Math.PI) / 180;
  const dLon = ((n2 - n1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((l1 * Math.PI) / 180) *
      Math.cos((l2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export function formatDistance(distanceKm: number | null): string {
  if (distanceKm == null) return "";
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

export const requestGeolocation = async (
  isManualClick: boolean = false
): Promise<GeolocationCoordinates | null> => {
  if (typeof window === "undefined" || !navigator.geolocation) {
    if (isManualClick) toast.error("Geolocation is not supported by your browser.");
    return null;
  }

  const getPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  try {
    // Attempt 1: Fast cached or high-accuracy location
    const pos = await getPosition({
      enableHighAccuracy: true,
      timeout: 7000,
      maximumAge: 120000, // Accept cached position from last 2 minutes
    });
    return pos.coords;
  } catch (err: any) {
    // Attempt 2: Fallback to low-accuracy network/cell location (reliable indoors)
    try {
      const fallbackPos = await getPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Accept cached position from last 5 minutes
      });
      return fallbackPos.coords;
    } catch (fallbackErr: any) {
      // Only alert the user if they explicitly clicked the GPS button
      if (isManualClick) {
        if (fallbackErr?.code === 1) {
          // PERMISSION_DENIED
          toast.error("Location permission denied. Please allow access in browser settings.");
        } else if (fallbackErr?.code === 2 || fallbackErr?.code === 3) {
          // UNAVAILABLE or TIMEOUT
          toast.error("Unable to fetch precise GPS indoors. Please pick your hostel manually.");
        } else {
          toast.error("Location unavailable. Selected default campus spot.");
        }
      }
      // Fail silently in background
      return null;
    }
  }
};

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed.lat === "number" && typeof parsed.lng === "number") {
            return parsed;
          }
        }
      } catch (e) {
        // Fallback
      }
    }
    return DEFAULT_CAMPUS;
  });

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state with localStorage across components
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed) setLocation(parsed);
        }
      } catch (e) {}
    };

    window.addEventListener("campusbite-location-updated", handleStorageChange);
    return () => {
      window.removeEventListener("campusbite-location-updated", handleStorageChange);
    };
  }, []);

  const saveLocation = useCallback((newLoc: UserLocation) => {
    setLocation(newLoc);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newLoc));
        window.dispatchEvent(new Event("campusbite-location-updated"));
      } catch (e) {}
    }
  }, []);

  const requestLocation = useCallback(
    async (isManualClick: boolean = false) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        if (isManualClick) {
          setError("Geolocation is not supported by your browser");
          toast.error("Geolocation is not supported by your browser.");
        }
        return null;
      }

      setIsLocating(true);
      setError(null);

      const coords = await requestGeolocation(isManualClick);
      if (!coords) {
        setIsLocating(false);
        return null;
      }

      const lat = coords.latitude;
      const lng = coords.longitude;
      let campusLabel = "Near Zeal College, Narhe";

      // Reverse geocode via free OpenStreetMap Nominatim or fallback label
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { "Accept-Language": "en" } }
        );
        if (res.ok) {
          const data = await res.json();
          const suburb =
            data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.road ||
            data.address?.city ||
            "Narhe Campus";
          campusLabel = `Near ${suburb}`;
        }
      } catch (e) {
        // Keep default campus label
      }

      const newLoc = { lat, lng, campusLabel };
      saveLocation(newLoc);
      setIsLocating(false);
      if (isManualClick) {
        toast.success("Location updated!");
      }
      return newLoc;
    },
    [saveLocation]
  );

  const changeCampus = useCallback(
    (label: string, lat: number = DEFAULT_CAMPUS.lat, lng: number = DEFAULT_CAMPUS.lng) => {
      saveLocation({ lat, lng, campusLabel: label });
    },
    [saveLocation]
  );

  return {
    location,
    lat: location.lat,
    lng: location.lng,
    campusLabel: location.campusLabel,
    isLocating,
    error,
    requestLocation,
    changeCampus,
    calculateDistance: (destLat?: number | null, destLng?: number | null) =>
      calculateDistanceKm(location.lat, location.lng, destLat, destLng),
  };
}
