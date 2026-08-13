import { AuthHttpError, authFetch, authJson } from "@/services/authFetch";
import type { MealType, SubscriptionType, Weekday } from "@/services/subscriptionService";

export type SubscriptionPlan = {
  plan_id: string;
  restaurant_email: string;
  name: string;
  description: string;
  subscription_type: SubscriptionType;
  meal_type: MealType;
  price: number;
  delivery_days: Weekday[];
  start_time: string;
  end_time: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type SubscriptionPlanInput = {
  restaurant_email: string;
  name: string;
  description?: string;
  subscription_type: SubscriptionType;
  meal_type: MealType;
  price: number;
  delivery_days: Weekday[];
  start_time: string;
  end_time: string;
  active?: boolean;
};

export type SubscriptionPlanUpdateInput = Partial<
  Omit<SubscriptionPlanInput, "restaurant_email">
>;

function extractError(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  return fallback;
}

export async function getRestaurantPlans(
  restaurantEmail: string,
  q?: string
): Promise<SubscriptionPlan[]> {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  const suffix = params.toString();
  const path = suffix
    ? `/subscription-plans/${encodeURIComponent(restaurantEmail)}?${suffix}`
    : `/subscription-plans/${encodeURIComponent(restaurantEmail)}`;

  const data = await authJson<{ items: SubscriptionPlan[] }>(path, {
    role: "restaurant_owner",
    cache: "no-store",
  });
  return data.items ?? [];
}

export async function getPublicPlans(
  restaurantEmail: string
): Promise<SubscriptionPlan[]> {
  const data = await authJson<{ items: SubscriptionPlan[] }>(
    `/subscription-plans/public/${encodeURIComponent(restaurantEmail)}`,
    {
      role: "customer",
      cache: "no-store",
    }
  );
  return data.items ?? [];
}

export async function createSubscriptionPlan(
  input: SubscriptionPlanInput
): Promise<SubscriptionPlan> {
  const res = await authFetch("/subscription-plans/", {
    role: "restaurant_owner",
    method: "POST",
    body: JSON.stringify({
      ...input,
      active: input.active ?? true,
    }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AuthHttpError(
      res.status,
      extractError(body, "Failed to create plan")
    );
  }

  return body.plan as SubscriptionPlan;
}

export async function updateSubscriptionPlan(
  planId: string,
  input: SubscriptionPlanUpdateInput
): Promise<SubscriptionPlan> {
  const res = await authFetch(
    `/subscription-plans/${encodeURIComponent(planId)}`,
    {
      role: "restaurant_owner",
      method: "PUT",
      body: JSON.stringify(input),
    }
  );

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AuthHttpError(
      res.status,
      extractError(body, "Failed to update plan")
    );
  }

  return body.plan as SubscriptionPlan;
}

export async function deleteSubscriptionPlan(planId: string): Promise<void> {
  const res = await authFetch(
    `/subscription-plans/${encodeURIComponent(planId)}`,
    {
      role: "restaurant_owner",
      method: "DELETE",
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new AuthHttpError(
      res.status,
      extractError(body, "Failed to delete plan")
    );
  }
}

export async function getAdminSubscriptionPlans(query?: {
  q?: string;
  restaurant_email?: string;
  active?: boolean;
}): Promise<SubscriptionPlan[]> {
  const params = new URLSearchParams();
  if (query?.q?.trim()) params.set("q", query.q.trim());
  if (query?.restaurant_email?.trim()) {
    params.set("restaurant_email", query.restaurant_email.trim());
  }
  if (query?.active !== undefined) {
    params.set("active", String(query.active));
  }

  const suffix = params.toString();
  const path = suffix
    ? `/admin/subscription-plans?${suffix}`
    : "/admin/subscription-plans";

  const data = await authJson<{ items: SubscriptionPlan[] }>(path, {
    role: "admin",
    cache: "no-store",
  });
  return data.items ?? [];
}

export function planDurationLabel(type: SubscriptionType) {
  return type === "weekly" ? "7 days" : "30 days";
}

export function formatPlanTiming(plan: SubscriptionPlan) {
  return `${plan.start_time} – ${plan.end_time}`;
}
