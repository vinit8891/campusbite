import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useCourierLocationStream,
  calculateHaversineDistance,
  isEnRouteStatus,
} from "@/hooks/useCourierLocationStream";
import * as deliveryService from "@/services/deliveryService";

describe("useCourierLocationStream & Geolocation Utilities", () => {
  let watchPositionMock: any;
  let clearWatchMock: any;
  let successCallback: ((pos: any) => void) | null = null;
  let errorCallback: ((err: any) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    successCallback = null;
    errorCallback = null;

    watchPositionMock = vi.fn((success, error, _options) => {
      successCallback = success;
      errorCallback = error;
      return 42; // watchId
    });

    clearWatchMock = vi.fn();

    // Mock navigator.geolocation
    Object.defineProperty(global.navigator, "geolocation", {
      value: {
        watchPosition: watchPositionMock,
        clearWatch: clearWatchMock,
        getCurrentPosition: vi.fn(),
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("isEnRouteStatus correctly identifies active delivery statuses", () => {
    expect(isEnRouteStatus("Out for Delivery")).toBe(true);
    expect(isEnRouteStatus("out_for_delivery")).toBe(true);
    expect(isEnRouteStatus("Picked Up")).toBe(true);
    expect(isEnRouteStatus("In Transit")).toBe(true);
    expect(isEnRouteStatus("on the way")).toBe(true);

    expect(isEnRouteStatus("Assigned")).toBe(false);
    expect(isEnRouteStatus("Ready for Pickup")).toBe(false);
    expect(isEnRouteStatus("Preparing")).toBe(false);
    expect(isEnRouteStatus("Delivered")).toBe(false);
    expect(isEnRouteStatus("Cancelled")).toBe(false);
    expect(isEnRouteStatus(null)).toBe(false);
  });

  it("calculateHaversineDistance calculates accurate meters between coordinates", () => {
    // Exact benchmark points (e.g. Pune campus hostel quad)
    const lat1 = 18.52043;
    const lon1 = 73.856743;

    // Point 1: Same coordinates -> 0 meters
    const d0 = calculateHaversineDistance(lat1, lon1, lat1, lon1);
    expect(d0).toBe(0);

    // Point 2: ~150 meters away
    const lat2 = 18.52150;
    const lon2 = 73.85720;
    const d1 = calculateHaversineDistance(lat1, lon1, lat2, lon2);
    expect(d1).toBeGreaterThan(100);
    expect(d1).toBeLessThan(200);

    // Point 3: ~1.5 km away
    const lat3 = 18.53000;
    const lon3 = 73.86500;
    const d2 = calculateHaversineDistance(lat1, lon1, lat3, lon3);
    expect(d2).toBeGreaterThan(1000);
  });

  it("activates GPS watcher when order is Out for Delivery and streams coordinates", async () => {
    const streamSpy = vi
      .spyOn(deliveryService, "streamCourierGPSLocation")
      .mockResolvedValue({
        success: true,
        is_within_200m: false,
        distance_meters: 450,
      });

    const { result } = renderHook(() =>
      useCourierLocationStream({
        orderId: "order-123",
        status: "Out for Delivery",
        destinationLat: 18.52043,
        destinationLng: 73.856743,
      })
    );

    expect(result.current.isStreaming).toBe(true);
    expect(watchPositionMock).toHaveBeenCalledTimes(1);
    expect(watchPositionMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        enableHighAccuracy: true,
        timeout: 15000,
      })
    );

    // Simulate GPS fix from browser
    await act(async () => {
      successCallback?.({
        coords: {
          latitude: 18.52500,
          longitude: 73.86000,
          heading: 90,
          speed: 5.5,
        },
      });
    });

    expect(result.current.lastPosition).toEqual(
      expect.objectContaining({
        latitude: 18.52500,
        longitude: 73.86000,
        heading: 90,
        speed: 5.5,
      })
    );

    expect(streamSpy).toHaveBeenCalledWith("order-123", {
      latitude: 18.52500,
      longitude: 73.86000,
      heading: 90,
      speed: 5.5,
    });
  });

  it("detects 200m proximity and triggers onProximityAlert callback", async () => {
    const proximityCb = vi.fn();
    vi.spyOn(deliveryService, "streamCourierGPSLocation").mockResolvedValue({
      success: true,
      is_within_200m: true,
      distance_meters: 80,
    });

    const destLat = 18.52043;
    const destLng = 73.856743;

    const { result } = renderHook(() =>
      useCourierLocationStream({
        orderId: "order-123",
        status: "Out for Delivery",
        destinationLat: destLat,
        destinationLng: destLng,
        onProximityAlert: proximityCb,
      })
    );

    // Send coordinates ~80m away from destination
    await act(async () => {
      successCallback?.({
        coords: {
          latitude: 18.52080,
          longitude: 73.85700,
          heading: 180,
          speed: 3.2,
        },
      });
    });

    expect(result.current.isWithin200m).toBe(true);
    expect(result.current.distanceMeters).toBeLessThanOrEqual(200);
    expect(proximityCb).toHaveBeenCalledTimes(1);
  });

  it("throttles network streaming requests to 10-second intervals", async () => {
    const streamSpy = vi
      .spyOn(deliveryService, "streamCourierGPSLocation")
      .mockResolvedValue({
        success: true,
        is_within_200m: false,
        distance_meters: 500,
      });

    renderHook(() =>
      useCourierLocationStream({
        orderId: "order-123",
        status: "Out for Delivery",
        throttleMs: 10000,
      })
    );

    const baseTime = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(baseTime);

    // 1st GPS tick -> streams to server
    await act(async () => {
      successCallback?.({
        coords: { latitude: 18.520, longitude: 73.850, heading: 0, speed: 0 },
      });
    });
    expect(streamSpy).toHaveBeenCalledTimes(1);

    // 2nd GPS tick 3 seconds later (within 10s throttle) -> should NOT stream to server
    vi.spyOn(Date, "now").mockReturnValue(baseTime + 3000);
    await act(async () => {
      successCallback?.({
        coords: { latitude: 18.521, longitude: 73.851, heading: 0, speed: 0 },
      });
    });
    expect(streamSpy).toHaveBeenCalledTimes(1);

    // 3rd GPS tick 11 seconds after 1st -> should stream to server
    vi.spyOn(Date, "now").mockReturnValue(baseTime + 11000);
    await act(async () => {
      successCallback?.({
        coords: { latitude: 18.522, longitude: 73.852, heading: 0, speed: 0 },
      });
    });
    expect(streamSpy).toHaveBeenCalledTimes(2);
  });

  it("gracefully handles permission denials without crashing", () => {
    const { result } = renderHook(() =>
      useCourierLocationStream({
        orderId: "order-123",
        status: "Out for Delivery",
      })
    );

    act(() => {
      errorCallback?.({
        code: 1, // PERMISSION_DENIED
        message: "User denied Geolocation",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
    });

    expect(result.current.isPermissionDenied).toBe(true);
    expect(result.current.error).toContain("Location permission denied");
  });

  it("cleans up geolocation watcher on unmount", () => {
    const { unmount } = renderHook(() =>
      useCourierLocationStream({
        orderId: "order-123",
        status: "Out for Delivery",
      })
    );

    expect(watchPositionMock).toHaveBeenCalledTimes(1);
    unmount();
    expect(clearWatchMock).toHaveBeenCalledWith(42);
  });
});
