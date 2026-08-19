import { describe, it, expect } from "vitest";
import { isBestseller, sanitizePrice } from "@/lib/menuDomain";

describe("menuDomain utilities", () => {
  describe("isBestseller", () => {
    it("returns true if bestseller flag is set", () => {
      expect(isBestseller({ bestseller: true })).toBe(true);
      expect(isBestseller({ is_bestseller: true })).toBe(true);
      expect(isBestseller({ best_seller: true })).toBe(true);
    });

    it("returns false if bestseller flags are false or missing", () => {
      expect(isBestseller({ bestseller: false })).toBe(false);
      expect(isBestseller({})).toBe(false);
      expect(isBestseller(null)).toBe(false);
      expect(isBestseller(undefined)).toBe(false);
    });
  });

  describe("sanitizePrice", () => {
    it("returns number directly if valid and >= 0", () => {
      expect(sanitizePrice(150)).toBe(150);
      expect(sanitizePrice(0)).toBe(0);
      expect(sanitizePrice(99.5)).toBe(99.5);
    });

    it("parses numeric strings and currency strings correctly", () => {
      expect(sanitizePrice("150")).toBe(150);
      expect(sanitizePrice("₹240.50")).toBe(240.5);
      expect(sanitizePrice(" 99 ")).toBe(99);
    });

    it("returns fallback for invalid prices", () => {
      expect(sanitizePrice(-10, 0)).toBe(0);
      expect(sanitizePrice(NaN, 50)).toBe(50);
      expect(sanitizePrice(null, 20)).toBe(20);
      expect(sanitizePrice(undefined, 0)).toBe(0);
      expect(sanitizePrice({}, 100)).toBe(100);
    });
  });
});
