"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { streamCourierGPSLocation, type CourierLocationPayload } from "@/services/deliveryService";

export interface CourierPosition {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface UseCourierLocationStreamOptions {
  orderId?: string | null;
  status?: string | null;
  enabled?: boolean;
  throttleMs?: number; // default 10,000ms (10 seconds)
  destinationLat?: number | null;
  destinationLng?: number | null;
  onProximityAlert?: (distanceMeters: number) => void;
}

export interface UseCourierLocationStreamResult {
  isStreaming: boolean;
  lastPosition: CourierPosition | null;
  distanceMeters: number | null;
  isWithin200m: boolean;
  error: string | null;
  isPermissionDenied: boolean;
  retry: () => void;
  pushCoordinates: (
    latitude: number,
    longitude: number,
    heading?: number | null,
    speed?: number | null
  ) => Promise<void>;
}

export function isEnRouteStatus(status?: string | null): boolean {
  if (!status) return false;
  const normalized = status.toLowerCase().replace(/[-_]/g, " ").trim();
  return [
    "out for delivery",
    "picked up",
    "in transit",
    "on the way",
    "out_for_delivery",
    "picked_up",
  ].includes(normalized);
}

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useCourierLocationStream({
  orderId,
  status,
  enabled,
  throttleMs = 10000,
  destinationLat,
  destinationLng,
  onProximityAlert,
}: UseCourierLocationStreamOptions = {}): UseCourierLocationStreamResult {
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastPosition, setLastPosition] = useState<CourierPosition | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [isWithin200m, setIsWithin200m] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const lastPushTimestampRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);
  const proximityTriggeredRef = useRef<boolean>(false);

  const shouldStream =
    enabled ?? (Boolean(orderId) && isEnRouteStatus(status));

  const pushCoordinates = useCallback(
    async (
      latitude: number,
      longitude: number,
      heading?: number | null,
      speed?: number | null
    ) => {
      const pos: CourierPosition = {
        latitude,
        longitude,
        heading: heading ?? null,
        speed: speed ?? null,
        timestamp: Date.now(),
      };
      setLastPosition(pos);

      // 1. Calculate local distance if destination coordinates are available
      if (
        destinationLat != null &&
        destinationLng != null &&
        !Number.isNaN(destinationLat) &&
        !Number.isNaN(destinationLng)
      ) {
        const dist = calculateHaversineDistance(
          latitude,
          longitude,
          destinationLat,
          destinationLng
        );
        const within200 = dist <= 200;
        setDistanceMeters(Math.round(dist * 10) / 10);
        setIsWithin200m(within200);

        if (within200 && !proximityTriggeredRef.current) {
          proximityTriggeredRef.current = true;
          onProximityAlert?.(dist);
        }
      }

      // 2. Stream to backend API
      if (orderId) {
        try {
          const payload: CourierLocationPayload = {
            latitude,
            longitude,
            heading: heading ?? null,
            speed: speed ?? null,
          };
          const res = await streamCourierGPSLocation(orderId, payload);
          if (res?.is_within_200m != null) {
            setIsWithin200m(Boolean(res.is_within_200m));
          }
          if (res?.distance_meters != null) {
            setDistanceMeters(res.distance_meters);
          }
          lastPushTimestampRef.current = Date.now();
        } catch (err) {
          // Graceful silent fallback without crashing UI
          console.debug("Courier location streaming push error:", err);
        }
      }
    },
    [orderId, destinationLat, destinationLng, onProximityAlert]
  );

  const retry = useCallback(() => {
    setError(null);
    setIsPermissionDenied(false);
    setRetryCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator?.geolocation) {
      setError("Geolocation API is not supported in this environment.");
      setIsStreaming(false);
      return;
    }

    if (!shouldStream) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);
    setError(null);

    const handleSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, heading, speed } = pos.coords;
      const now = Date.now();

      // Check 10-second throttle
      if (
        now - lastPushTimestampRef.current >= throttleMs ||
        lastPushTimestampRef.current === 0
      ) {
        lastPushTimestampRef.current = now;
        void pushCoordinates(latitude, longitude, heading, speed);
      } else {
        // Update local position without making network call if within throttle window
        const p: CourierPosition = {
          latitude,
          longitude,
          heading: heading ?? null,
          speed: speed ?? null,
          timestamp: now,
        };
        setLastPosition(p);

        if (destinationLat != null && destinationLng != null) {
          const dist = calculateHaversineDistance(
            latitude,
            longitude,
            destinationLat,
            destinationLng
          );
          const within200 = dist <= 200;
          setDistanceMeters(Math.round(dist * 10) / 10);
          setIsWithin200m(within200);
          if (within200 && !proximityTriggeredRef.current) {
            proximityTriggeredRef.current = true;
            onProximityAlert?.(dist);
          }
        }
      }
    };

    const handleError = (geoErr: GeolocationPositionError) => {
      console.warn("Courier GPS watch error:", geoErr.message);
      if (geoErr.code === geoErr.PERMISSION_DENIED) {
        setIsPermissionDenied(true);
        setError("Location permission denied. Please allow location access.");
      } else if (geoErr.code === geoErr.TIMEOUT) {
        setError("GPS request timed out. Retrying in background...");
      } else {
        setError(geoErr.message || "Unable to retrieve GPS location.");
      }
      // Do not crash active manifest view
    };

    try {
      const id = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        }
      );
      watchIdRef.current = id;
    } catch (invocErr) {
      console.warn("Failed to initiate watchPosition:", invocErr);
      setError("Unable to start GPS watcher.");
      setIsStreaming(false);
    }

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsStreaming(false);
    };
  }, [
    shouldStream,
    throttleMs,
    pushCoordinates,
    retryCount,
    destinationLat,
    destinationLng,
    onProximityAlert,
  ]);

  return {
    isStreaming,
    lastPosition,
    distanceMeters,
    isWithin200m,
    error,
    isPermissionDenied,
    retry,
    pushCoordinates,
  };
}

export default useCourierLocationStream;
