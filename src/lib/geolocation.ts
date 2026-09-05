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
