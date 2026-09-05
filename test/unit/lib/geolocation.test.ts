import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCoordsSafe } from "@/lib/geolocation";

describe("getCoordsSafe", () => {
  const originalGeolocation = navigator.geolocation;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: originalGeolocation,
      configurable: true,
      writable: true,
    });
  });

  it("returns coordinates when geolocation succeeds", async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) => {
        success({
          coords: {
            latitude: 28.7041,
            longitude: 77.1025,
          },
        });
      }),
    };

    Object.defineProperty(navigator, "geolocation", {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });

    const coords = await getCoordsSafe(1000);
    expect(coords.lat).toBe(28.7041);
    expect(coords.lng).toBe(77.1025);
  });

  it("returns empty object gracefully when GPS permission is denied", async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((_success, error) => {
        error(new Error("User denied Geolocation"));
      }),
    };

    Object.defineProperty(navigator, "geolocation", {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });

    const coords = await getCoordsSafe(1000);
    expect(coords).toEqual({});
  });

  it("returns empty object gracefully on timeout", async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation(() => {
        // do not call callback immediately to simulate delay
      }),
    };

    Object.defineProperty(navigator, "geolocation", {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });

    const coords = await getCoordsSafe(50); // fast timeout for test
    expect(coords).toEqual({});
  });

  it("returns empty object when geolocation is undefined", async () => {
    Object.defineProperty(navigator, "geolocation", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const coords = await getCoordsSafe(500);
    expect(coords).toEqual({});
  });
});
