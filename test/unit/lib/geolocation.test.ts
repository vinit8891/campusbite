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

describe("getDirectionsUrl", () => {
  it("uses explicit coordinates when provided", async () => {
    const { getDirectionsUrl } = await import("@/lib/geolocation");
    const url = getDirectionsUrl(18.4482, 73.826, "Hostel Block A");
    expect(url).toBe("https://www.google.com/maps/dir/?api=1&destination=18.4482,73.826");
  });

  it("extracts coordinates embedded in composite address strings", async () => {
    const { getDirectionsUrl } = await import("@/lib/geolocation");
    const address = "Detected Location (18.4381, 73.8300), Flat 201, Ref: Near North Gate";
    const url = getDirectionsUrl(null, null, address);
    expect(url).toBe("https://www.google.com/maps/dir/?api=1&destination=18.4381,73.8300");
  });

  it("falls back to encoded search query when no coordinates are present", async () => {
    const { getDirectionsUrl } = await import("@/lib/geolocation");
    const address = "Room 304, Tagore Hostel, North Campus";
    const url = getDirectionsUrl(null, null, address);
    expect(url).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    );
  });
});

