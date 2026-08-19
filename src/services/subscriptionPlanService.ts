import { AuthHttpError, authFetch, authJson } from "@/services/authFetch";
import type {
  MealType,
  SubscriptionType,
  Weekday,
  SubscriptionPlan,
  SubscriptionPlanInput,
  SubscriptionPlanUpdateInput,
} from "@/types";

export type {
  SubscriptionPlan,
  SubscriptionPlanInput,
  SubscriptionPlanUpdateInput,
};


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
  const body = await authJson<{ plan: SubscriptionPlan }>(
    "/subscription-plans/",
    {
      role: "restaurant_owner",
      method: "POST",
      body: JSON.stringify({
        ...input,
        active: input.active ?? true,
      }),
    }
  );
  return body.plan;
}

export async function updateSubscriptionPlan(
  planId: string,
  input: SubscriptionPlanUpdateInput
): Promise<SubscriptionPlan> {
  const body = await authJson<{ plan: SubscriptionPlan }>(
    `/subscription-plans/${encodeURIComponent(planId)}`,
    {
      role: "restaurant_owner",
      method: "PUT",
      body: JSON.stringify(input),
    }
  );
  return body.plan;
}

export async function deleteSubscriptionPlan(planId: string): Promise<void> {
  await authJson<{ message?: string }>(
    `/subscription-plans/${encodeURIComponent(planId)}`,
    {
      role: "restaurant_owner",
      method: "DELETE",
    }
  );
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
