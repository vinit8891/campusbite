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

export interface LocationState {
  hostel: string;
  room: string;
  latitude: number | null;
  longitude: number | null;
  isGpsDetected: boolean;
}

interface LocationContextType {
  location: LocationState;
  fullAddressLabel: string;
  isModalOpen: boolean;
  isDetectingGps: boolean;
  openLocationModal: () => void;
  closeLocationModal: () => void;
  setLocation: (
    hostel: string,
    room?: string,
    lat?: number | null,
    lng?: number | null,
    isGps?: boolean
  ) => void;
  detectGpsLocation: () => Promise<void>;
}

const DEFAULT_LOCATION: LocationState = {
  hostel: "Hostel Block A",
  room: "Rm 304",
  latitude: 18.4482,
  longitude: 73.826,
  isGpsDetected: false,
};

const defaultLocationContextValue: LocationContextType = {
  location: DEFAULT_LOCATION,
  fullAddressLabel: "Hostel Block A, Rm 304",
  isModalOpen: false,
  isDetectingGps: false,
  openLocationModal: () => {},
  closeLocationModal: () => {},
  setLocation: () => {},
  detectGpsLocation: async () => {},
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
  const [location, setLocationState] = useState<LocationState>(DEFAULT_LOCATION);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Initialize from localStorage or sync with checkout
  useEffect(() => {
    try {
      const saved = localStorage.getItem("campus_location");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.hostel) {
          setLocationState({
            hostel: parsed.hostel,
            room: parsed.room || "Rm 304",
            latitude: parsed.latitude ?? null,
            longitude: parsed.longitude ?? null,
            isGpsDetected: !!parsed.isGpsDetected,
          });
          setCheckout((prev) => ({
            ...prev,
            hostel_block: parsed.hostel,
            address: parsed.room ? `${parsed.hostel}, ${parsed.room}` : parsed.hostel,
            latitude: parsed.latitude ?? prev.latitude,
            longitude: parsed.longitude ?? prev.longitude,
          }));
        }
      }
    } catch {
      // ignore
    }
  }, [setCheckout]);

  const setLocation = useCallback(
    (
      hostel: string,
      room = "",
      lat: number | null = null,
      lng: number | null = null,
      isGps = false
    ) => {
      const nextLocation: LocationState = {
        hostel,
        room: room || "Rm 304",
        latitude: lat,
        longitude: lng,
        isGpsDetected: isGps,
      };

      setLocationState(nextLocation);

      try {
        localStorage.setItem("campus_location", JSON.stringify(nextLocation));
      } catch {
        // ignore
      }

      // Sync with CheckoutContext
      setCheckout((prev) => ({
        ...prev,
        hostel_block: hostel,
        address: room ? `${hostel}, ${room}` : hostel,
        latitude: lat ?? prev.latitude,
        longitude: lng ?? prev.longitude,
      }));
    },
    [setCheckout]
  );

  const detectGpsLocation = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsDetectingGps(true);
    const toastId = toast.loading("Fetching GPS location...");

    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsDetectingGps(false);
          const { latitude, longitude } = position.coords;
          const matched = matchNearestCampusLocation(latitude, longitude);

          const resolvedHostel = matched.isInsideCampus
            ? matched.preset.name
            : "Main Campus Gate / Zeal Campus (GPS Detected)";

          setLocation(
            resolvedHostel,
            location.room || "Rm 304",
            latitude,
            longitude,
            true
          );
          toast.dismiss(toastId);
          toast.success(`Location set to ${resolvedHostel}`);
          setIsModalOpen(false);
          resolve();
        },
        (error) => {
          setIsDetectingGps(false);
          toast.dismiss(toastId);
          console.warn("GPS detection error:", error);
          const fallbackHostel = "Hostel Block A";
          setLocation(
            fallbackHostel,
            location.room || "Rm 304",
            18.4482,
            73.826,
            false
          );
          toast.info("GPS unavailable: Set to Hostel Block A");
          resolve();
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    });
  }, [location.room, setLocation]);

  const fullAddressLabel = useMemo(() => {
    if (!location.hostel) return "Select Location";
    if (location.room) {
      return `${location.hostel}, ${location.room}`;
    }
    return location.hostel;
  }, [location.hostel, location.room]);

  const value = useMemo(
    () => ({
      location,
      fullAddressLabel,
      isModalOpen,
      isDetectingGps,
      openLocationModal: () => setIsModalOpen(true),
      closeLocationModal: () => setIsModalOpen(false),
      setLocation,
      detectGpsLocation,
    }),
    [
      location,
      fullAddressLabel,
      isModalOpen,
      isDetectingGps,
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
