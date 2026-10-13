import { describe, it, expect } from "vitest";
import {
  isClientSide,
  isLocalStorageAvailable,
  isSessionStorageAvailable,
  isOnline,
  isMobileDevice,
  checkBrowserCapabilities,
} from "@/lib/browserCapabilities";

describe("BrowserCapabilities Diagnostics", () => {
  it("detects client environment accurately in jsdom", () => {
    expect(isClientSide()).toBe(true);
  });

  it("checks localStorage availability safely", () => {
    expect(isLocalStorageAvailable()).toBe(true);
  });

  it("checks sessionStorage availability safely", () => {
    expect(isSessionStorageAvailable()).toBe(true);
  });

  it("detects online network status", () => {
    expect(typeof isOnline()).toBe("boolean");
  });

  it("detects mobile devices based on user agent", () => {
    const androidUa =
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36";
    const iPhoneUa =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1";
    const desktopWinUa =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36";
    const desktopMacUa =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36";

    expect(isMobileDevice(androidUa)).toBe(true);
    expect(isMobileDevice(iPhoneUa)).toBe(true);
    expect(isMobileDevice(desktopWinUa)).toBe(false);
    expect(isMobileDevice(desktopMacUa)).toBe(false);
  });

  it("returns structured browser capability snapshot including isMobile", () => {
    const caps = checkBrowserCapabilities();
    expect(caps).toHaveProperty("isClient", true);
    expect(caps).toHaveProperty("localStorage", true);
    expect(caps).toHaveProperty("sessionStorage", true);
    expect(caps).toHaveProperty("isMobile");
    expect(typeof caps.isMobile).toBe("boolean");
  });
});
