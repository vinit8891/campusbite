import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { requestGeolocation, useUserLocation } from "@/hooks/useUserLocation";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn().mockReturnValue("toast-id"),
    dismiss: vi.fn(),
  },
}));

describe("requestGeolocation & useUserLocation Geolocation Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("requestGeolocation", () => {
    it("returns null silently without firing any toast on background failure (isManualClick = false)", async () => {
      const mockGetCurrentPosition = vi.fn().mockImplementation((_success, error) => {
        error({ code: 1, message: "User denied Geolocation" });
      });

      vi.stubGlobal("navigator", {
        ...global.navigator,
        geolocation: { getCurrentPosition: mockGetCurrentPosition },
      });

      const coords = await requestGeolocation(false);

      expect(coords).toBeNull();
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.info).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it("triggers permission denied error toast when isManualClick = true and permission is denied", async () => {
      const mockGetCurrentPosition = vi.fn().mockImplementation((_success, error) => {
        error({ code: 1, message: "User denied Geolocation" });
      });

      vi.stubGlobal("navigator", {
        ...global.navigator,
        geolocation: { getCurrentPosition: mockGetCurrentPosition },
      });

      const coords = await requestGeolocation(true);

      expect(coords).toBeNull();
      expect(toast.error).toHaveBeenCalledWith(
        "Location permission denied. Please allow access in browser settings."
      );

      vi.unstubAllGlobals();
    });

    it("triggers indoor/timeout error toast when isManualClick = true and timeout occurs", async () => {
      const mockGetCurrentPosition = vi.fn().mockImplementation((_success, error) => {
        error({ code: 3, message: "Timeout expired" });
      });

      vi.stubGlobal("navigator", {
        ...global.navigator,
        geolocation: { getCurrentPosition: mockGetCurrentPosition },
      });

      const coords = await requestGeolocation(true);

      expect(coords).toBeNull();
      expect(toast.error).toHaveBeenCalledWith(
        "Unable to fetch precise GPS indoors. Please pick your hostel manually."
      );

      vi.unstubAllGlobals();
    });

    it("performs two-stage fallback: attempts high accuracy first, then low accuracy network/cell", async () => {
      const mockGetCurrentPosition = vi
        .fn()
        // Attempt 1: High accuracy fails
        .mockImplementationOnce((_success, error, options) => {
          expect(options.enableHighAccuracy).toBe(true);
          expect(options.timeout).toBe(7000);
          expect(options.maximumAge).toBe(120000);
          error({ code: 2, message: "High accuracy unavailable" });
        })
        // Attempt 2: Low accuracy succeeds
        .mockImplementationOnce((success, _error, options) => {
          expect(options.enableHighAccuracy).toBe(false);
          expect(options.timeout).toBe(10000);
          expect(options.maximumAge).toBe(300000);
          success({
            coords: {
              latitude: 18.4482,
              longitude: 73.826,
            },
          });
        });

      vi.stubGlobal("navigator", {
        ...global.navigator,
        geolocation: { getCurrentPosition: mockGetCurrentPosition },
      });

      const coords = await requestGeolocation(false);

      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(2);
      expect(coords).toEqual({
        latitude: 18.4482,
        longitude: 73.826,
      });

      vi.unstubAllGlobals();
    });
  });

  describe("useUserLocation Hook", () => {
    it("falls back silently to default campus location when requestLocation(false) fails in background", async () => {
      const mockGetCurrentPosition = vi.fn().mockImplementation((_success, error) => {
        error({ code: 1, message: "Permission denied" });
      });

      vi.stubGlobal("navigator", {
        ...global.navigator,
        geolocation: { getCurrentPosition: mockGetCurrentPosition },
      });

      const { result } = renderHook(() => useUserLocation());

      await act(async () => {
        const loc = await result.current.requestLocation(false);
        expect(loc).toBeNull();
      });

      // Retains default location
      expect(result.current.location.lat).toBe(18.4485);
      expect(result.current.location.lng).toBe(73.8267);
      expect(result.current.campusLabel).toBe("Near Zeal College, Narhe");

      // No toasts fired
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it("updates location and fires success toast when requestLocation(true) is manually triggered", async () => {
      const mockGetCurrentPosition = vi.fn().mockImplementation((success) => {
        success({
          coords: {
            latitude: 18.45,
            longitude: 73.83,
          },
        });
      });

      vi.stubGlobal("navigator", {
        ...global.navigator,
        geolocation: { getCurrentPosition: mockGetCurrentPosition },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          address: {
            suburb: "Narhe Campus",
          },
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { result } = renderHook(() => useUserLocation());

      await act(async () => {
        const loc = await result.current.requestLocation(true);
        expect(loc).toEqual({
          lat: 18.45,
          lng: 73.83,
          campusLabel: "Near Narhe Campus",
        });
      });

      expect(toast.success).toHaveBeenCalledWith("Location updated!");

      vi.unstubAllGlobals();
    });
  });
});
