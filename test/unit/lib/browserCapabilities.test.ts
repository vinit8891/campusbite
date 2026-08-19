import { describe, it, expect } from "vitest";
import {
  isClientSide,
  isLocalStorageAvailable,
  isSessionStorageAvailable,
  isOnline,
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

  it("returns structured browser capability snapshot", () => {
    const caps = checkBrowserCapabilities();
    expect(caps).toHaveProperty("isClient", true);
    expect(caps).toHaveProperty("localStorage", true);
    expect(caps).toHaveProperty("sessionStorage", true);
  });
});
