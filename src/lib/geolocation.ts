/**
 * Safe Geolocation utilities with timeout fallbacks and degradation handling.
 */

export type GeoCoordinates = {
  lat?: number;
  lng?: number;
};

/**
 * Attempts to retrieve user GPS coordinates with a strict timeout (default 2500ms).
 * Degrades gracefully if GPS is disabled, denied, or timed out.
 */
export async function getCoordsSafe(
  timeoutMs = 2500
): Promise<GeoCoordinates> {
  if (typeof window === "undefined" || !navigator?.geolocation) {
    return {};
  }

  return new Promise((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        console.warn(`GPS request timed out after ${timeoutMs}ms, continuing with fallback.`);
        resolve({});
      }
    }, timeoutMs);

    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          }
        },
        (err) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            console.warn("GPS unavailable or denied, continuing pickup:", err.message);
            resolve({});
          }
        },
        {
          enableHighAccuracy: false,
          timeout: timeoutMs,
          maximumAge: 10000,
        }
      );
    } catch (err) {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        console.warn("Geolocation API invocation error:", err);
        resolve({});
      }
    }
  });
}

/**
 * Generates an accurate Google Maps navigation intent URL.
 * Automatically extracts embedded (lat, lng) from composite address strings like:
 * "Detected Location (18.4381, 73.8300), Room 304, Ref: Near North Gate"
 */
export function getDirectionsUrl(
  lat?: number | null,
  lng?: number | null,
  address?: string
): string {
  if (
    lat != null &&
    lng != null &&
    !Number.isNaN(Number(lat)) &&
    !Number.isNaN(Number(lng))
  ) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  if (address) {
    const match = address.match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
    if (match) {
      return `https://www.google.com/maps/dir/?api=1&destination=${match[1]},${match[2]}`;
    }
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address || "Campus"
  )}`;
}

