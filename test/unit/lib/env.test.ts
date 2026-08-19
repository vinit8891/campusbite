import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isValidUrl,
  getNodeEnv,
  getApiBaseUrl,
  validateEnv,
} from "@/lib/env";

describe("Environment Validation (src/lib/env.ts)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("isValidUrl validates standard http and https URLs", () => {
    expect(isValidUrl("http://localhost:8000")).toBe(true);
    expect(isValidUrl("https://api.campusbite.com")).toBe(true);
    expect(isValidUrl("not-a-url")).toBe(false);
    expect(isValidUrl("ftp://files.example.com")).toBe(false);
  });

  it("getNodeEnv returns test in test environment", () => {
    expect(getNodeEnv()).toBe("test");
  });

  it("getApiBaseUrl strips trailing slashes and falls back safely", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.campusbite.com///";
    expect(getApiBaseUrl()).toBe("https://api.campusbite.com");

    delete process.env.NEXT_PUBLIC_API_URL;
    expect(getApiBaseUrl()).toBe("http://127.0.0.1:8000");
  });

  it("validateEnv detects invalid URLs", () => {
    process.env.NEXT_PUBLIC_API_URL = "invalid-url";
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("validateEnv passes with valid configuration", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.campusbite.com";
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "mock-key";
    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
