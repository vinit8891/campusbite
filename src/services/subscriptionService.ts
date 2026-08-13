import { AuthHttpError, authFetch, authJson } from "@/services/authFetch";

export type SubscriptionType = "weekly" | "monthly";
export type MealType = "breakfast" | "lunch" | "dinner" | "combo";
export type SubscriptionStatus =
  | "active"
  | "paused"
  | "expired"
  | "cancelled";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type Subscription = {
  subscription_id: string;
  plan_id?: string | null;
  plan_name?: string | null;
  customer_email: string;
  restaurant_email: string;
  subscription_type: SubscriptionType;
  meal_type: MealType;
  start_date: string;
  end_date: string;
  status: SubscriptionStatus;
  delivery_days: Weekday[];
  price: number;
  payment_status: string;
  auto_renew: boolean;
  skipped_dates: string[];
  pause_from: string | null;
  pause_to: string | null;
  start_time?: string | null;
  end_time?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SubscriptionCreateInput = {
  plan_id?: string;
  restaurant_email?: string;
  subscription_type?: SubscriptionType;
  meal_type?: MealType;
  start_date: string;
  end_date?: string;
  delivery_days?: Weekday[];
  price?: number;
  payment_status?: string;
  auto_renew?: boolean;
};

export type SubscriptionCalendarMeal = {
  date: string;
  kind: string;
  subscription_id?: string;
  plan_id?: string | null;
  restaurant_email?: string;
  meal_type?: MealType;
  start_time?: string | null;
  end_time?: string | null;
  plan_name?: string | null;
};

export type SubscriptionCalendar = {
  today_meals: SubscriptionCalendarMeal[];
  upcoming_meals: SubscriptionCalendarMeal[];
  skipped_dates: string[];
  paused_dates: string[];
  range_start: string;
  range_end: string;
};

export type SubscriptionSummary = {
  today_meal: SubscriptionCalendarMeal | null;
  upcoming_meal: SubscriptionCalendarMeal | null;
  last_generated_order: {
    order_id: string;
    status: string;
    payment_status?: string;
    subscription_order_date?: string;
    meal_name?: string | null;
    restaurant_email?: string;
    total?: number;
  } | null;
  subscription_status: SubscriptionStatus | null;
};

export type SubscriptionGenerationStatus = {
  last_generation_time: string | null;
  last_target_date: string | null;
  last_generated_count: number;
  last_skipped_count: number;
  last_trigger: string | null;
  scheduler: {
    enabled: boolean;
    running: boolean;
    status: string;
    daily_time: string | null;
    next_execution: string | null;
  };
};

export type SubscriptionPauseInput = {
  pause_from: string;
  pause_to: string;
};

export type SubscriptionPayment = {
  payment_id: string;
  subscription_id?: string;
  amount: number;
  billing_period: string;
  payment_method: string;
  payment_status: string;
  paid_at?: string | null;
  renewal_due?: string | null;
  transaction_reference?: string | null;
};

export type SubscriptionRenewalResponse = {
  subscription_id: string;
  payment_id: string;
  razorpay_order_id: string;
  amount: number;
  amount_paise: number;
  currency: string;
  key_id: string | null;
  payment_status: string;
  idempotent?: boolean;
};

export type PaginatedSubscriptionPayments = {
  items: SubscriptionPayment[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type AdminSubscriptionPaymentSummary = {
  total_subscription_revenue: number;
  paid_payments: number;
  pending_payments: number;
  failed_payments: number;
};

export type RestaurantSubscriptionRevenueSummary = {
  active_subscriptions: number;
  monthly_subscription_revenue: number;
  pending_subscription_payments: number;
};

export type AdminSubscriptionsQuery = {
  q?: string;
  status?: SubscriptionStatus | "";
  restaurant_email?: string;
  customer_email?: string;
};

function extractError(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  return fallback;
}

export async function createSubscription(
  input: SubscriptionCreateInput
): Promise<Subscription> {
  const res = await authFetch("/subscriptions/", {
    role: "customer",
    method: "POST",
    body: JSON.stringify({
      ...input,
      payment_status: input.payment_status ?? "pending",
      auto_renew: input.auto_renew ?? false,
    }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AuthHttpError(
      res.status,
      extractError(body, "Failed to create subscription")
    );
  }

  return body.subscription as Subscription;
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
  const res = await authFetch(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/pause`,
    {
      role: "customer",
      method: "PUT",
      body: JSON.stringify(input),
    }
  );

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AuthHttpError(
      res.status,
      extractError(body, "Failed to pause subscription")
    );
  }

  return body.subscription as Subscription;
}

export async function resumeSubscription(
  subscriptionId: string
): Promise<Subscription> {
  const res = await authFetch(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/resume`,
    {
      role: "customer",
      method: "PUT",
    }
  );

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AuthHttpError(
      res.status,
      extractError(body, "Failed to resume subscription")
    );
  }

  return body.subscription as Subscription;
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<Subscription> {
  const res = await authFetch(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    {
      role: "customer",
      method: "PUT",
    }
  );

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AuthHttpError(
      res.status,
      extractError(body, "Failed to cancel subscription")
    );
  }

  return body.subscription as Subscription;
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
  const res = await authFetch(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/renew`,
    {
      role: "customer",
      method: "POST",
      body: JSON.stringify({ confirm_expired: confirmExpired }),
    }
  );
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AuthHttpError(
      res.status,
      extractError(body, "Failed to start renewal payment")
    );
  }
  return body as SubscriptionRenewalResponse;
}

export async function retrySubscriptionPayment(
  subscriptionId: string,
  confirmExpired = false
): Promise<SubscriptionRenewalResponse> {
  const res = await authFetch(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/retry`,
    {
      role: "customer",
      method: "POST",
      body: JSON.stringify({ confirm_expired: confirmExpired }),
    }
  );
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AuthHttpError(
      res.status,
      extractError(body, "Failed to retry payment")
    );
  }
  return body as SubscriptionRenewalResponse;
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
  const res = await authFetch(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/verify-renewal`,
    {
      role: "customer",
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AuthHttpError(
      res.status,
      extractError(body, "Renewal verification failed")
    );
  }
  return body;
}

export async function mockCompleteSubscriptionRenewal(
  subscriptionId: string,
  outcome: "success" | "failure" | "dismiss"
) {
  const res = await authFetch(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/mock-complete-renewal`,
    {
      role: "customer",
      method: "POST",
      body: JSON.stringify({ outcome }),
    }
  );
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AuthHttpError(
      res.status,
      extractError(body, "Mock renewal failed")
    );
  }
  return body;
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
