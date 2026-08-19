/**
 * Shared subscription domain utilities and calendar date calculations.
 */

export const SUBSCRIPTION_STATUSES = [
  "active",
  "paused",
  "expired",
  "cancelled",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export function isSubscriptionActive(status?: string | null): boolean {
  return status === "active";
}

export function isSubscriptionPaused(status?: string | null): boolean {
  return status === "paused";
}

export function isSubscriptionCancelled(status?: string | null): boolean {
  return status === "cancelled";
}

export function isSubscriptionExpired(
  status?: string | null,
  endDate?: string | null,
  todayIso?: string
): boolean {
  if (status === "expired") return true;
  if (endDate && todayIso && endDate < todayIso) return true;
  return false;
}

/** Generates a YYYY-MM month key string from a Date. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Formats a YYYY-MM month key into human-readable month + year (e.g. "August 2026"). */
export function formatMonthTitle(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  return new Date(year, monthNum - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/** Builds monthly calendar grid cells with leading empty offsets for Monday-first calendars. */
export function buildCalendarDays(
  month: string
): Array<{ date: string | null; day: number | null }> {
  const [year, monthNum] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNum - 1, 1);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: Array<{ date: string | null; day: number | null }> = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push({ date: null, day: null });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ date: iso, day });
  }
  return cells;
}
