import { describe, it, expect, vi } from "vitest";
import {
  shortId,
  formatDate,
  formatDateTime,
  formatTime,
  formatCurrencyINR,
  isValidPhone,
  formatPhoneNumber,
  withQuery,
  formatOrderDate,
  formatUpdatedTime,
  selectClassName,
} from "@/lib/formatters";

describe("formatters utilities", () => {
  it("exports selectClassName constant", () => {
    expect(typeof selectClassName).toBe("string");
    expect(selectClassName).toContain("rounded-lg");
  });

  describe("shortId", () => {
    it("truncates long strings with ellipsis", () => {
      expect(shortId("64f1a2b3c4d5e6f7a8b9c0d1", 8)).toBe("64f1a2b3…");
      expect(shortId("short", 8)).toBe("short");
      expect(shortId(null)).toBe("—");
      expect(shortId("")).toBe("—");
    });
  });

  describe("formatDate, formatDateTime & formatTime", () => {
    it("formats ISO date string without shifting plain date", () => {
      const formatted = formatDate("2026-08-19");
      expect(formatted).not.toBe("—");
      expect(formatDate(null)).toBe("—");
      expect(formatDate("invalid-date")).toBe("—");
      expect(formatDate(Date.now())).not.toBe("—");
    });

    it("formats date and time accurately", () => {
      const now = new Date(2026, 7, 19, 14, 30, 0);
      expect(formatDateTime(now)).not.toBe("—");
      expect(formatDateTime(null)).toBe("—");
      expect(formatDateTime("   ")).toBe("—");
      expect(formatDateTime("invalid")).toBe("—");
      expect(formatTime(now)).not.toBe("—");
      expect(formatTime(null)).toBe("—");
      expect(formatTime("invalid")).toBe("—");
    });
  });

  describe("formatCurrencyINR", () => {
    it("formats integer amounts without decimals by default", () => {
      expect(formatCurrencyINR(250)).toBe("₹250");
      expect(formatCurrencyINR(0)).toBe("₹0");
      expect(formatCurrencyINR("1500")).toBe("₹1,500");
    });

    it("formats decimal amounts properly", () => {
      expect(formatCurrencyINR(250.5)).toBe("₹250.50");
      expect(formatCurrencyINR(250, { hideDecimalsIfWhole: false })).toBe("₹250.00");
      expect(formatCurrencyINR(null)).toBe("₹0");
      expect(formatCurrencyINR("invalid")).toBe("₹0");
    });
  });

  describe("isValidPhone & formatPhoneNumber", () => {
    it("validates 10-digit Indian phone numbers", () => {
      expect(isValidPhone("9876543210")).toBe(true);
      expect(isValidPhone("12345")).toBe(false);
      expect(isValidPhone("987654321012")).toBe(false);
      expect(isValidPhone(null)).toBe(false);
    });

    it("formats phone number with/without country code", () => {
      expect(formatPhoneNumber("9876543210")).toBe("98765 43210");
      expect(formatPhoneNumber("9876543210", true)).toBe("+91 98765 43210");
      expect(formatPhoneNumber("123")).toBe("123");
      expect(formatPhoneNumber(null)).toBe("—");
    });
  });

  describe("withQuery", () => {
    it("builds query string and strips undefined/null/empty params", () => {
      const url = withQuery("/api/orders", {
        status: "Accepted",
        q: "burger",
        page: 1,
        empty: "",
        nil: null,
        undef: undefined,
        flag: true,
      });
      expect(url).toBe("/api/orders?status=Accepted&q=burger&page=1&flag=true");
    });

    it("returns base path if no valid query parameters", () => {
      expect(withQuery("/api/orders", { q: "", empty: null })).toBe("/api/orders");
    });
  });

  describe("formatOrderDate & formatUpdatedTime", () => {
    it("formatOrderDate returns localized string", () => {
      expect(formatOrderDate(new Date())).not.toBe("Recently");
      expect(formatOrderDate(Date.now())).not.toBe("Recently");
      expect(formatOrderDate("invalid")).toBe("Recently");
      expect(formatOrderDate(null)).toBe("Recently");
    });

    it("formatUpdatedTime handles relative seconds and minutes", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(formatUpdatedTime(new Date(now - 2000))).toBe("Updated just now");
      expect(formatUpdatedTime(new Date(now - 15000))).toBe("Updated 15 sec ago");
      expect(formatUpdatedTime(new Date(now - 65000))).toBe("Updated 1 min ago");
      expect(formatUpdatedTime(new Date(now - 300000))).toBe("Updated 5 min ago");
      expect(formatUpdatedTime("invalid")).toBe("Waiting for update");
      expect(formatUpdatedTime(null)).toBe("Waiting for update");

      vi.useRealTimers();
    });
  });
});
