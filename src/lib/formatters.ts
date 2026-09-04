/**
 * Centralized formatting, validation, and layout helpers for CampusBite.
 */

/** Accessible styling string for standard form select controls. */
export const selectClassName =
  "h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Truncates an ID or hash string to a human-readable short form.
 * e.g., "64f1a2b3c4d5e6f7a8b9c0d1" -> "64f1a2b3…"
 */
export function shortId(id?: string | null, length = 8): string {
  if (!id) return "—";
  const str = String(id).trim();
  if (!str) return "—";
  return str.length > length + 2 ? `${str.slice(0, length)}…` : str;
}

/**
 * Safely formats a date (ISO string, Date instance, or YYYY-MM-DD)
 * to a localized date string (e.g. "19/8/2026").
 */
export function formatDate(
  value?: string | number | Date | null,
  fallback = "—"
): string {
  if (!value) return fallback;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    // Handle YYYY-MM-DD plain date strings without timezone shifts
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parsed = new Date(`${trimmed}T00:00:00`);
      return Number.isNaN(parsed.getTime()) ? fallback : parsed.toLocaleDateString();
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString();
}

/**
 * Safely formats a timestamp to a localized date and time string
 * (e.g. "19/8/2026, 12:30:00 pm").
 */
export function formatDateTime(
  value?: string | number | Date | null,
  fallback = "—"
): string {
  if (!value) return fallback;
  if (typeof value === "string" && !value.trim()) return fallback;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString();
}

/** Safely formats time only (e.g. "12:30 PM"). */
export function formatTime(
  value?: string | number | Date | null,
  fallback = "—"
): string {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Formats a numeric or string amount to Indian Rupee (INR) currency format.
 * e.g., 250 -> "₹250", 250.5 -> "₹250.50"
 */
export function formatCurrencyINR(
  amount?: number | string | null,
  options: { hideDecimalsIfWhole?: boolean } = { hideDecimalsIfWhole: true }
): string {
  if (amount === undefined || amount === null || amount === "") return "₹0";
  const num = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(num)) return "₹0";

  if (options.hideDecimalsIfWhole && Number.isInteger(num)) {
    return `₹${num.toLocaleString("en-IN")}`;
  }

  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Validates whether a given string is a standard 10-digit Indian mobile number. */
export function isValidPhone(phone?: string | null): boolean {
  if (!phone) return false;
  return /^[0-9]{10}$/.test(String(phone).trim());
}

/**
 * Sanitizes and formats a 10-digit mobile number into readable groups.
 * e.g. "9876543210" -> "+91 98765 43210"
 */
export function formatPhoneNumber(
  phone?: string | null,
  includeCountryCode = false
): string {
  if (!phone) return "—";
  const cleaned = String(phone).replace(/\D/g, "").slice(-10);
  if (cleaned.length !== 10) return String(phone);

  const formatted = `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  return includeCountryCode ? `+91 ${formatted}` : formatted;
}

/**
 * Appends non-empty query parameters to a base URL path.
 * Strips undefined, null, empty string, or whitespace-only values.
 */
export function withQuery(
  path: string,
  params: Record<string, string | number | boolean | null | undefined>
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) search.set(key, trimmed);
    } else if (typeof value === "boolean") {
      search.set(key, String(value));
    } else if (typeof value === "number" && !Number.isNaN(value)) {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/** Formats order placement dates into medium date + short time (en-IN). */
export function formatOrderDate(
  date?: string | number | Date | null
): string {
  if (!date) return "Recently";
  const parsedDate = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

/**
 * Formats a timestamp into relative updated time string.
 * e.g. "Updated just now", "Updated 15 sec ago", "Updated 1 min ago", "Updated 5 min ago"
 */
export function formatUpdatedTime(date?: Date | string | number | null): string {
  if (!date) return "Waiting for update";
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Waiting for update";

  const seconds = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000));
  if (seconds < 5) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds} sec ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return "Updated 1 min ago";

  return `Updated ${minutes} min ago`;
}

/**
 * Formats a restaurant email, slug, or identifier into a clean, human-readable eatery name.
 * e.g. "Campus Corner Grill" -> "Campus Corner Grill"
 * e.g. "owner@test.com" -> "Owner Canteen"
 * e.g. "rajesh.dhaba@campus.edu" -> "Rajesh Dhaba"
 */
export function formatRestaurantName(
  nameOrEmail?: string | null,
  fallback = "Campus Eatery"
): string {
  if (!nameOrEmail || !nameOrEmail.trim()) return fallback;
  const str = nameOrEmail.trim();

  // If it's not an email, return as-is
  if (!str.includes("@")) return str;

  // Extract the part before @ and replace dots/dashes/underscores with spaces
  const prefix = str.split("@")[0].replace(/[._-]+/g, " ").trim();
  if (!prefix) return fallback;

  const capitalized = prefix
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  const lower = capitalized.toLowerCase();
  if (
    lower.includes("canteen") ||
    lower.includes("dhaba") ||
    lower.includes("kitchen") ||
    lower.includes("mess") ||
    lower.includes("point") ||
    lower.includes("grill") ||
    lower.includes("cafe") ||
    lower.includes("corner")
  ) {
    return capitalized;
  }

  return `${capitalized} Canteen`;
}

