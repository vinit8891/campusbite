import "@testing-library/jest-dom/vitest";
import * as matchers from "vitest-axe/matchers";
import type { AxeMatchers } from "vitest-axe/matchers";
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./mocks/server";
import { AUTH_STORAGE_KEYS } from "@/lib/authTokens";

expect.extend(matchers);

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  export interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface AsymmetricMatchersContaining extends AxeMatchers {}
}

// Start MSW mock server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});

// Setup default mock auth tokens before each test
beforeEach(() => {
  localStorage.setItem(AUTH_STORAGE_KEYS.customerToken, "mock-customer-token");
  localStorage.setItem(AUTH_STORAGE_KEYS.restaurantToken, "mock-restaurant-token");
  localStorage.setItem(AUTH_STORAGE_KEYS.deliveryToken, "mock-delivery-token");
  localStorage.setItem(AUTH_STORAGE_KEYS.adminToken, "mock-admin-token");
  localStorage.setItem(AUTH_STORAGE_KEYS.customerUser, JSON.stringify({ phone: "9876543210", name: "John Doe" }));
  localStorage.setItem(AUTH_STORAGE_KEYS.deliveryPartner, JSON.stringify({ phone: "9876543210", name: "Ramesh Partner" }));
  localStorage.setItem(AUTH_STORAGE_KEYS.restaurantOwner, JSON.stringify({ email: "diner@campus.edu", name: "Chef" }));
});

// Reset handlers and clean DOM after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  vi.clearAllMocks();
});

// Close MSW mock server after all tests
afterAll(() => {
  server.close();
});

// Mock Next.js navigation
vi.mock("next/navigation", () => {
  const router = {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  };

  return {
    useRouter: () => router,
    useParams: () => ({ id: "test-id", slug: "test-restaurant" }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/",
    notFound: vi.fn(),
  };
});

// Mock window alert, confirm, prompt
window.alert = vi.fn();
window.confirm = vi.fn(() => true);
window.prompt = vi.fn(() => "2026-08-20");

// Mock window matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
