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

export interface WeeklyMessPlanPricingInput {
  planType?: "WEEKLY" | "MONTHLY" | "weekly" | "monthly";
  mealType: "breakfast" | "lunch" | "dinner" | "combo";
  deliveryPreference: "DINE_IN" | "HOSTEL_LOBBY_DELIVERY" | "dine_in" | "hostel_lobby_delivery";
  baseMealPrice?: number;
  customMealsCount?: number;
}

export interface WeeklyMessPlanPricingResult {
  planType: "WEEKLY" | "MONTHLY";
  mealType: string;
  deliveryPreference: "DINE_IN" | "HOSTEL_LOBBY_DELIVERY";
  validityDays: number;
  mealsCount: number;
  baseMealPrice: number;
  foodSubtotal: number;
  baseFoodTotal: number;
  deliveryAddon: number;
  platformFee: number;
  totalPrice: number;
  dailyCost: number;
  estimatedSavings: number;
}

export function calculateWeeklyPlanPrice(
  input: WeeklyMessPlanPricingInput
): WeeklyMessPlanPricingResult {
  const normPlan = (input.planType || "WEEKLY").toUpperCase() as "WEEKLY" | "MONTHLY";
  const normPref = (input.deliveryPreference || "DINE_IN").toUpperCase() as
    | "DINE_IN"
    | "HOSTEL_LOBBY_DELIVERY";
  const normMeal = input.mealType.toLowerCase();
  const validityDays = normPlan === "WEEKLY" ? 7 : 30;

  let mealsCount = 7;
  const isBothMeals = normMeal === "both" || normMeal === "combo";
  if (input.customMealsCount && input.customMealsCount > 0) {
    mealsCount = input.customMealsCount;
  } else if (normPlan === "WEEKLY") {
    mealsCount = isBothMeals ? 14 : 7;
  } else {
    mealsCount = isBothMeals ? 60 : 30;
  }

  const baseMealPrice = input.baseMealPrice && input.baseMealPrice > 0 ? input.baseMealPrice : 80;
  const deliveryRate = normPref === "HOSTEL_LOBBY_DELIVERY" ? 15 : 0;
  const deliveryAddon = Math.round(deliveryRate * mealsCount * 100) / 100;
  const platformFee = normPlan === "WEEKLY" ? 25 : 75;
  const foodSubtotal = Math.round(baseMealPrice * mealsCount * 100) / 100;
  const totalPrice = Math.round((foodSubtotal + deliveryAddon + platformFee) * 100) / 100;
  const dailyCost = Math.round((totalPrice / validityDays) * 100) / 100;

  // Comparison benchmark: single-order standard restaurant pricing (approx ₹110/meal + ₹30 delivery each)
  const aLaCarteBenchmark = mealsCount * (110 + (normPref === "HOSTEL_LOBBY_DELIVERY" ? 30 : 0));
  const estimatedSavings = Math.max(0, Math.round((aLaCarteBenchmark - totalPrice) * 100) / 100);

  return {
    planType: normPlan,
    mealType: normMeal,
    deliveryPreference: normPref,
    validityDays,
    mealsCount,
    baseMealPrice,
    foodSubtotal,
    baseFoodTotal: foodSubtotal,
    deliveryAddon,
    platformFee,
    totalPrice,
    dailyCost,
    estimatedSavings,
  };
}
