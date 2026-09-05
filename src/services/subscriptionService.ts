import { authJson } from "@/services/authFetch";
import type {
  SubscriptionType,
  MealType,
  SubscriptionStatus,
  Weekday,
  Subscription,
  SubscriptionCreateInput,
  SubscriptionCalendarMeal,
  SubscriptionCalendar,
  SubscriptionSummary,
  SubscriptionGenerationStatus,
  SubscriptionPauseInput,
  SubscriptionPayment,
  SubscriptionRenewalResponse,
  PaginatedSubscriptionPayments,
  AdminSubscriptionPaymentSummary,
  RestaurantSubscriptionRevenueSummary,
  AdminSubscriptionsQuery,
} from "@/types";

export type {
  SubscriptionType,
  MealType,
  SubscriptionStatus,
  Weekday,
  Subscription,
  SubscriptionCreateInput,
  SubscriptionCalendarMeal,
  SubscriptionCalendar,
  SubscriptionSummary,
  SubscriptionGenerationStatus,
  SubscriptionPauseInput,
  SubscriptionPayment,
  SubscriptionRenewalResponse,
  PaginatedSubscriptionPayments,
  AdminSubscriptionPaymentSummary,
  RestaurantSubscriptionRevenueSummary,
  AdminSubscriptionsQuery,
};

export async function createSubscription(
  input: SubscriptionCreateInput
): Promise<Subscription> {
  const body = await authJson<{ subscription: Subscription }>(
    "/subscriptions/",
    {
      role: "customer",
      method: "POST",
      body: JSON.stringify({
        ...input,
        payment_status: input.payment_status ?? "pending",
        auto_renew: input.auto_renew ?? false,
      }),
    }
  );
  return body.subscription;
}

export async function getMySubscriptions(): Promise<Subscription[]> {
  const data = await authJson<{ items: Subscription[] }>("/subscriptions/my", {
    role: "customer",
    cache: "no-store",
  });
  return data.items ?? [];
}

export async function getSubscriptionById(
  subscriptionId: string
): Promise<Subscription> {
  return authJson<Subscription>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      role: "customer",
      cache: "no-store",
    }
  );
}

export async function pauseSubscription(
  subscriptionId: string,
  input: SubscriptionPauseInput
): Promise<Subscription> {
  const body = await authJson<{ subscription: Subscription }>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/pause`,
    {
      role: "customer",
      method: "PUT",
      body: JSON.stringify(input),
    }
  );
  return body.subscription;
}

export async function resumeSubscription(
  subscriptionId: string
): Promise<Subscription> {
  const body = await authJson<{ subscription: Subscription }>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/resume`,
    {
      role: "customer",
      method: "PUT",
    }
  );
  return body.subscription;
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<Subscription> {
  const body = await authJson<{ subscription: Subscription }>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    {
      role: "customer",
      method: "PUT",
    }
  );
  return body.subscription;
}


export async function getRestaurantSubscriptions(
  restaurantEmail: string
): Promise<Subscription[]> {
  const data = await authJson<{ items: Subscription[] }>(
    `/subscriptions/restaurant/${encodeURIComponent(restaurantEmail)}`,
    {
      role: "restaurant_owner",
      cache: "no-store",
    }
  );
  return data.items ?? [];
}

export async function getAdminSubscriptions(
  query: AdminSubscriptionsQuery = {}
): Promise<Subscription[]> {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.status) params.set("status", query.status);
  if (query.restaurant_email?.trim()) {
    params.set("restaurant_email", query.restaurant_email.trim());
  }
  if (query.customer_email?.trim()) {
    params.set("customer_email", query.customer_email.trim());
  }

  const suffix = params.toString();
  const path = suffix ? `/subscriptions/?${suffix}` : "/subscriptions/";

  const data = await authJson<{ items: Subscription[] }>(path, {
    role: "admin",
    cache: "no-store",
  });
  return data.items ?? [];
}

export async function getSubscriptionSummary(): Promise<SubscriptionSummary> {
  return authJson<SubscriptionSummary>("/subscriptions/summary", {
    role: "customer",
    cache: "no-store",
  });
}

export async function getAdminGenerationStatus(): Promise<SubscriptionGenerationStatus> {
  return authJson<SubscriptionGenerationStatus>(
    "/admin/subscriptions/generation-status",
    {
      role: "admin",
      cache: "no-store",
    }
  );
}

export async function getSubscriptionCalendar(
  month?: string
): Promise<SubscriptionCalendar> {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  const suffix = params.toString();
  const path = suffix
    ? `/subscriptions/calendar?${suffix}`
    : "/subscriptions/calendar";

  return authJson<SubscriptionCalendar>(path, {
    role: "customer",
    cache: "no-store",
  });
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function categorizeSubscriptions(items: Subscription[]) {
  const today = todayIsoDate();

  const active: Subscription[] = [];
  const upcoming: Subscription[] = [];
  const history: Subscription[] = [];

  for (const item of items) {
    if (item.status === "cancelled" || item.status === "expired") {
      history.push(item);
      continue;
    }

    if (item.end_date < today) {
      history.push(item);
      continue;
    }

    if (item.start_date > today) {
      upcoming.push(item);
      continue;
    }

    active.push(item);
  }

  return { active, upcoming, history };
}

export async function getMySubscriptionPayments(
  query: { page?: number; limit?: number; subscription_id?: string } = {}
): Promise<PaginatedSubscriptionPayments> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.subscription_id) params.set("subscription_id", query.subscription_id);
  const suffix = params.toString();
  const path = suffix
    ? `/subscriptions/payments/my?${suffix}`
    : "/subscriptions/payments/my";

  return authJson<PaginatedSubscriptionPayments>(path, {
    role: "customer",
    cache: "no-store",
  });
}

export async function renewSubscription(
  subscriptionId: string,
  confirmExpired = false
): Promise<SubscriptionRenewalResponse> {
  return authJson<SubscriptionRenewalResponse>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/renew`,
    {
      role: "customer",
      method: "POST",
      body: JSON.stringify({ confirm_expired: confirmExpired }),
    }
  );
}

export async function retrySubscriptionPayment(
  subscriptionId: string,
  confirmExpired = false
): Promise<SubscriptionRenewalResponse> {
  return authJson<SubscriptionRenewalResponse>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/retry`,
    {
      role: "customer",
      method: "POST",
      body: JSON.stringify({ confirm_expired: confirmExpired }),
    }
  );
}

export async function verifySubscriptionRenewal(
  subscriptionId: string,
  payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    payment_id?: string;
  }
) {
  return authJson<{ success: boolean; message?: string }>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/verify-renewal`,
    {
      role: "customer",
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function mockCompleteSubscriptionRenewal(
  subscriptionId: string,
  outcome: "success" | "failure" | "dismiss"
) {
  return authJson<{ payment_status: string; subscription?: Subscription }>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/mock-complete-renewal`,
    {
      role: "customer",
      method: "POST",
      body: JSON.stringify({ outcome }),
    }
  );
}


export async function getAdminSubscriptionPaymentSummary(): Promise<AdminSubscriptionPaymentSummary> {
  return authJson<AdminSubscriptionPaymentSummary>(
    "/admin/subscription-payments/summary",
    {
      role: "admin",
      cache: "no-store",
    }
  );
}

export async function getAdminSubscriptionPayments(
  query: {
    q?: string;
    payment_status?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<PaginatedSubscriptionPayments> {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.payment_status) params.set("payment_status", query.payment_status);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const suffix = params.toString();
  const path = suffix
    ? `/admin/subscription-payments/?${suffix}`
    : "/admin/subscription-payments/";

  return authJson<PaginatedSubscriptionPayments>(path, {
    role: "admin",
    cache: "no-store",
  });
}

export async function getRestaurantSubscriptionRevenueSummary(
  restaurantEmail: string
): Promise<RestaurantSubscriptionRevenueSummary> {
  return authJson<RestaurantSubscriptionRevenueSummary>(
    `/restaurant/subscription-payments/${encodeURIComponent(restaurantEmail)}/summary`,
    {
      role: "restaurant_owner",
      cache: "no-store",
    }
  );
}

export async function deleteAdminSubscription(
  subscriptionId: string
): Promise<{ success: boolean; message: string }> {
  return authJson<{ success: boolean; message: string }>(
    `/admin/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      role: "admin",
      method: "DELETE",
    }
  );
}

export interface SkipMealResponse {
  message: string;
  subscription: Subscription;
  skipped_date: string;
  new_end_date: string;
}

export async function skipSubscriptionDate(
  subscriptionId: string,
  date: string
): Promise<SkipMealResponse> {
  return authJson<SkipMealResponse>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/skip-date`,
    {
      role: "customer",
      method: "POST",
      body: JSON.stringify({ date }),
    }
  );
}

export const skipDate = skipSubscriptionDate;

export function getTodayToken(subscriptionId: string, dateStr?: string): string {
  const targetDate = dateStr || new Date().toISOString().slice(0, 10);
  let hash = 0;
  const combined = `${subscriptionId}-${targetDate}`;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  const tokenNum = Math.abs(hash % 9000) + 1000;
  return `#${tokenNum}`;
}

export interface MealRedemptionResult {
  success: boolean;
  message: string;
  customer_name: string;
  customer_email: string;
  plan_name: string;
  meal_type: string;
  redeemed_at: string;
}

export async function redeemSubscriptionMeal(payload: {
  token: string;
  restaurant_email?: string;
  date?: string;
}): Promise<MealRedemptionResult> {
  return authJson<MealRedemptionResult>("/subscriptions/redeem-token", {
    role: "restaurant_owner",
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface MessCounterSummary {
  date: string;
  meals_served: number;
  total_subscribers: number;
}

export async function getMessCounterSummary(
  targetDate?: string
): Promise<MessCounterSummary> {
  const suffix = targetDate ? `?target_date=${encodeURIComponent(targetDate)}` : "";
  return authJson<MessCounterSummary>(`/subscriptions/counter/summary${suffix}`, {
    role: "restaurant_owner",
    cache: "no-store",
  });
}


