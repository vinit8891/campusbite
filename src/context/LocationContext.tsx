"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { toast } from "sonner";
import { useCheckout } from "@/context/CheckoutContext";

export type AddressTag = "home" | "hostel" | "college" | "other";
export type AddressType = AddressTag; // Backwards compatibility alias

export interface DeliveryAddress {
  id: string;
  tag: AddressTag;
  type?: AddressTag; // Backwards compatibility alias
  label?: string; // Backwards compatibility alias
  roomOrFlat: string;
  buildingOrSociety: string;
  areaOrLandmark: string;
  city?: string;
  lat?: number | null;
  lng?: number | null;
  isDefault?: boolean;
}

export interface CampusLocationPreset {
  id: string;
  name: string;
  tag: string;
  category: "hostel_boys" | "hostel_girls" | "academic" | "canteen" | "gate";
  icon: string;
  lat: number;
  lng: number;
}

export const CAMPUS_PRESETS: CampusLocationPreset[] = [
  {
    id: "hostel-a",
    name: "Hostel Block A",
    tag: "Boys Hostel (Wing A & B)",
    category: "hostel_boys",
    icon: "🏢",
    lat: 18.4482,
    lng: 73.826,
  },
  {
    id: "hostel-b",
    name: "Hostel Block B",
    tag: "Boys Hostel (Wing C & D)",
    category: "hostel_boys",
    icon: "🏢",
    lat: 18.4489,
    lng: 73.8262,
  },
  {
    id: "hostel-c",
    name: "Hostel Block C",
    tag: "Girls Hostel & PG Wing",
    category: "hostel_girls",
    icon: "🌸",
    lat: 18.4478,
    lng: 73.8271,
  },
  {
    id: "library",
    name: "Central Library / Reading Hall",
    tag: "Academic Complex (Ground Floor Lobby)",
    category: "academic",
    icon: "📚",
    lat: 18.4492,
    lng: 73.8258,
  },
  {
    id: "canteen",
    name: "Main Campus Canteen",
    tag: "Central Food Court & Mess",
    category: "canteen",
    icon: "🍽️",
    lat: 18.4486,
    lng: 73.8266,
  },
  {
    id: "gate",
    name: "Main Campus Gate / Zeal Campus",
    tag: "Campus Entrance & Visitor Security",
    category: "gate",
    icon: "🚀",
    lat: 18.447,
    lng: 73.8275,
  },
];

function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function matchNearestCampusLocation(
  lat: number,
  lng: number
): {
  preset: CampusLocationPreset;
  distanceMeters: number;
  isInsideCampus: boolean;
} {
  let closest = CAMPUS_PRESETS[0];
  let minDistance = Infinity;

  for (const preset of CAMPUS_PRESETS) {
    const dist = getDistanceInMeters(lat, lng, preset.lat, preset.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = preset;
    }
  }

  // Campus geofence radius: 1500m
  const isInsideCampus = minDistance <= 1500;

  return {
    preset: closest,
    distanceMeters: Math.round(minDistance),
    isInsideCampus,
  };
}

export async function reverseGeocodeCoords(
  lat: number,
  lng: number
): Promise<{
  buildingOrSociety: string;
  areaOrLandmark: string;
  city: string;
}> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) throw new Error("Reverse geocode failed");
    const data = await res.json();
    const addr = data.address || {};

    const buildingOrSociety =
      addr.amenity ||
      addr.building ||
      addr.university ||
      addr.college ||
      addr.road ||
      `Detected Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    const areaOrLandmark =
      addr.suburb ||
      addr.neighbourhood ||
      addr.residential ||
      addr.county ||
      "Campus / Local Area";

    const city =
      addr.city || addr.town || addr.village || addr.state_district || "Pune";

    return {
      buildingOrSociety,
      areaOrLandmark,
      city,
    };
  } catch {
    return {
      buildingOrSociety: `Detected Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      areaOrLandmark: "Nearby Campus / Area",
      city: "Pune",
    };
  }
}

export interface LocationState {
  hostel: string;
  room: string;
  latitude: number | null;
  longitude: number | null;
  isGpsDetected: boolean;
}

export interface LocationContextType {
  activeAddress: DeliveryAddress;
  savedAddresses: DeliveryAddress[];
  location: LocationState; // backwards compatibility
  fullAddressLabel: string;
  isModalOpen: boolean;
  isDetectingGps: boolean;
  openLocationModal: () => void;
  closeLocationModal: () => void;
  setActiveAddress: (address: DeliveryAddress) => void;
  saveAndSelectAddress: (
    address: Omit<DeliveryAddress, "id"> & { id?: string }
  ) => void;
  removeSavedAddress: (id: string) => void;
  setLocation: (
    hostel: string,
    room?: string,
    lat?: number | null,
    lng?: number | null,
    isGps?: boolean
  ) => void;
  detectGpsLocation: () => Promise<DeliveryAddress | null>;
}

const DEFAULT_ACTIVE_ADDRESS: DeliveryAddress = {
  id: "default-active",
  tag: "hostel",
  type: "hostel",
  label: "Hostel Block A",
  roomOrFlat: "Rm 304",
  buildingOrSociety: "Hostel Block A",
  areaOrLandmark: "Campus Wing A",
  city: "Pune",
  lat: 18.4482,
  lng: 73.826,
  isDefault: true,
};

const DEFAULT_LOCATION_STATE: LocationState = {
  hostel: DEFAULT_ACTIVE_ADDRESS.buildingOrSociety,
  room: DEFAULT_ACTIVE_ADDRESS.roomOrFlat,
  latitude: DEFAULT_ACTIVE_ADDRESS.lat ?? 18.4482,
  longitude: DEFAULT_ACTIVE_ADDRESS.lng ?? 73.826,
  isGpsDetected: false,
};

const defaultLocationContextValue: LocationContextType = {
  activeAddress: DEFAULT_ACTIVE_ADDRESS,
  savedAddresses: [],
  location: DEFAULT_LOCATION_STATE,
  fullAddressLabel: `${DEFAULT_ACTIVE_ADDRESS.buildingOrSociety}, ${DEFAULT_ACTIVE_ADDRESS.roomOrFlat}`,
  isModalOpen: false,
  isDetectingGps: false,
  openLocationModal: () => {},
  closeLocationModal: () => {},
  setActiveAddress: () => {},
  saveAndSelectAddress: () => {},
  removeSavedAddress: () => {},
  setLocation: () => {},
  detectGpsLocation: async () => null,
};

const LocationContext = createContext<LocationContextType | null>(null);

function useSafeCheckout() {
  try {
    return useCheckout();
  } catch {
    return { setCheckout: () => {} };
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const { setCheckout } = useSafeCheckout();
  const [activeAddress, setActiveAddressState] =
    useState<DeliveryAddress>(DEFAULT_ACTIVE_ADDRESS);
  // Default savedAddresses starts completely EMPTY if nothing is in localStorage
  const [savedAddresses, setSavedAddresses] = useState<DeliveryAddress[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isGpsDetected, setIsGpsDetected] = useState(false);

  // Initialize from localStorage or sync with checkout
  useEffect(() => {
    try {
      const savedList = localStorage.getItem("cb_saved_addresses");
      if (savedList) {
        const parsedList = JSON.parse(savedList);
        if (Array.isArray(parsedList)) {
          setSavedAddresses(parsedList);
        }
      }

      const savedActive =
        localStorage.getItem("cb_active_delivery_address") ||
        localStorage.getItem("campus_location");

      if (savedActive) {
        const parsed = JSON.parse(savedActive);
        const resolvedTag: AddressTag =
          parsed.tag || parsed.type || "hostel";

        const resolved: DeliveryAddress = {
          id: parsed.id || "saved-active",
          tag: resolvedTag,
          type: resolvedTag,
          label:
            parsed.label ||
            parsed.buildingOrSociety ||
            parsed.hostel ||
            "Selected Location",
          roomOrFlat: parsed.roomOrFlat || parsed.room || "",
          buildingOrSociety:
            parsed.buildingOrSociety || parsed.hostel || "Hostel Block A",
          areaOrLandmark: parsed.areaOrLandmark || "",
          city: parsed.city || "Pune",
          lat: parsed.lat ?? parsed.latitude ?? null,
          lng: parsed.lng ?? parsed.longitude ?? null,
          isDefault: !!parsed.isDefault,
        };

        setActiveAddressState(resolved);
        setIsGpsDetected(!!parsed.isGpsDetected);

        setCheckout((prev) => ({
          ...prev,
          hostel_block: resolved.buildingOrSociety,
          address: resolved.roomOrFlat
            ? `${resolved.buildingOrSociety}, ${resolved.roomOrFlat}`
            : resolved.buildingOrSociety,
          landmark: resolved.areaOrLandmark || prev.landmark,
          latitude: resolved.lat ?? prev.latitude,
          longitude: resolved.lng ?? prev.longitude,
        }));
      }
    } catch {
      // ignore
    }
  }, [setCheckout]);

  const setActiveAddress = useCallback(
    (address: DeliveryAddress, isGps = false) => {
      const normalizedTag: AddressTag = address.tag || address.type || "other";
      const normalized: DeliveryAddress = {
        ...address,
        tag: normalizedTag,
        type: normalizedTag,
      };

      setActiveAddressState(normalized);
      setIsGpsDetected(isGps);

      try {
        localStorage.setItem(
          "cb_active_delivery_address",
          JSON.stringify({ ...normalized, isGpsDetected: isGps })
        );
        localStorage.setItem(
          "campus_location",
          JSON.stringify({
            hostel: normalized.buildingOrSociety,
            room: normalized.roomOrFlat,
            latitude: normalized.lat,
            longitude: normalized.lng,
            isGpsDetected: isGps,
          })
        );
      } catch {
        // ignore
      }

      // Sync with CheckoutContext
      setCheckout((prev) => ({
        ...prev,
        hostel_block: normalized.buildingOrSociety,
        address: normalized.roomOrFlat
          ? `${normalized.buildingOrSociety}, ${normalized.roomOrFlat}`
          : normalized.buildingOrSociety,
        landmark: normalized.areaOrLandmark || prev.landmark,
        latitude: normalized.lat ?? prev.latitude,
        longitude: normalized.lng ?? prev.longitude,
      }));
    },
    [setCheckout]
  );

  const saveAndSelectAddress = useCallback(
    (newAddr: Omit<DeliveryAddress, "id"> & { id?: string }) => {
      const normalizedTag: AddressTag = newAddr.tag || newAddr.type || "hostel";
      const addressToSave: DeliveryAddress = {
        ...newAddr,
        id: newAddr.id || `addr-${Date.now()}`,
        tag: normalizedTag,
        type: normalizedTag,
        label: newAddr.label || newAddr.buildingOrSociety,
      };

      setSavedAddresses((prev) => {
        const existingIdx = prev.findIndex((a) => a.id === addressToSave.id);
        let updated: DeliveryAddress[];
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = addressToSave;
        } else {
          updated = [addressToSave, ...prev];
        }

        try {
          localStorage.setItem("cb_saved_addresses", JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });

      setActiveAddress(addressToSave, false);
    },
    [setActiveAddress]
  );

  const removeSavedAddress = useCallback(
    (id: string) => {
      setSavedAddresses((prev) => {
        const updated = prev.filter((a) => a.id !== id);
        try {
          localStorage.setItem("cb_saved_addresses", JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
      toast.success("Saved address removed");
    },
    []
  );

  const setLocation = useCallback(
    (
      hostel: string,
      room = "",
      lat: number | null = null,
      lng: number | null = null,
      isGps = false
    ) => {
      const addr: DeliveryAddress = {
        id: `loc-${Date.now()}`,
        tag: "hostel",
        type: "hostel",
        label: hostel,
        roomOrFlat: room,
        buildingOrSociety: hostel,
        areaOrLandmark: "",
        city: "Pune",
        lat,
        lng,
      };
      setActiveAddress(addr, isGps);
    },
    [setActiveAddress]
  );

  const detectGpsLocation = useCallback(async (): Promise<DeliveryAddress | null> => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return null;
    }

    setIsDetectingGps(true);
    const toastId = toast.loading("Fetching GPS location...");

    return new Promise<DeliveryAddress | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setIsDetectingGps(false);
          const { latitude, longitude } = position.coords;

          // Attempt OpenStreetMap Nominatim reverse geocode
          const geo = await reverseGeocodeCoords(latitude, longitude);

          const detectedAddr: DeliveryAddress = {
            id: `gps-${Date.now()}`,
            tag: "other",
            type: "other",
            label: geo.buildingOrSociety,
            roomOrFlat: activeAddress.roomOrFlat || "Room / Flat",
            buildingOrSociety: geo.buildingOrSociety,
            areaOrLandmark: geo.areaOrLandmark,
            city: geo.city,
            lat: latitude,
            lng: longitude,
          };

          setActiveAddress(detectedAddr, true);
          toast.dismiss(toastId);
          toast.success(`Location detected: ${geo.buildingOrSociety}`);
          setIsModalOpen(false);
          resolve(detectedAddr);
        },
        (error) => {
          setIsDetectingGps(false);
          toast.dismiss(toastId);
          console.warn("GPS detection error:", error);

          const fallbackAddr: DeliveryAddress = {
            id: "fallback-hostel-a",
            tag: "hostel",
            type: "hostel",
            label: "Hostel Block A",
            roomOrFlat: activeAddress.roomOrFlat || "Rm 304",
            buildingOrSociety: "Hostel Block A",
            areaOrLandmark: "Campus Wing A",
            city: "Pune",
            lat: 18.4482,
            lng: 73.826,
          };

          setActiveAddress(fallbackAddr, false);
          toast.info("GPS unavailable: Set to Hostel Block A");
          resolve(fallbackAddr);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    });
  }, [activeAddress.roomOrFlat, setActiveAddress]);

  const fullAddressLabel = useMemo(() => {
    const building = activeAddress.buildingOrSociety || activeAddress.label;
    if (!building) return "Select Location";
    if (activeAddress.roomOrFlat) {
      return `${building}, ${activeAddress.roomOrFlat}`;
    }
    return building;
  }, [activeAddress.buildingOrSociety, activeAddress.label, activeAddress.roomOrFlat]);

  const locationState: LocationState = useMemo(
    () => ({
      hostel: activeAddress.buildingOrSociety,
      room: activeAddress.roomOrFlat,
      latitude: activeAddress.lat ?? null,
      longitude: activeAddress.lng ?? null,
      isGpsDetected,
    }),
    [
      activeAddress.buildingOrSociety,
      activeAddress.roomOrFlat,
      activeAddress.lat,
      activeAddress.lng,
      isGpsDetected,
    ]
  );

  const value = useMemo(
    () => ({
      activeAddress,
      savedAddresses,
      location: locationState,
      fullAddressLabel,
      isModalOpen,
      isDetectingGps,
      openLocationModal: () => setIsModalOpen(true),
      closeLocationModal: () => setIsModalOpen(false),
      setActiveAddress,
      saveAndSelectAddress,
      removeSavedAddress,
      setLocation,
      detectGpsLocation,
    }),
    [
      activeAddress,
      savedAddresses,
      locationState,
      fullAddressLabel,
      isModalOpen,
      isDetectingGps,
      setActiveAddress,
      saveAndSelectAddress,
      removeSavedAddress,
      setLocation,
      detectGpsLocation,
    ]
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    return defaultLocationContextValue;
  }
  return context;
}
