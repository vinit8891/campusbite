"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import { AuthHttpError } from "@/services/authFetch";
import {
  type SubscriptionPlan,
  type SubscriptionPlanInput,
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  formatPlanTiming,
  getRestaurantPlans,
  planDurationLabel,
  updateSubscriptionPlan,
} from "@/services/subscriptionPlanService";
import type { MealType, SubscriptionType, Weekday } from "@/services/subscriptionService";

const WEEKDAYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const selectClassName =
  "h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const emptyForm: SubscriptionPlanInput = {
  restaurant_email: "",
  name: "",
  description: "",
  subscription_type: "weekly",
  meal_type: "lunch",
  price: 0,
  delivery_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  start_time: "12:00",
  end_time: "14:00",
  active: true,
};

export default function RestaurantSubscriptionPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SubscriptionPlanInput>(emptyForm);
  const [busy, setBusy] = useState(false);

  const restaurantEmail = useMemo(() => getRestaurantOwnerEmail() ?? "", []);

  async function loadPlans(query?: string) {
    if (!restaurantEmail) {
      setError("Restaurant session not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const items = await getRestaurantPlans(restaurantEmail, query);
      setPlans(items);
    } catch (err) {
      if (err instanceof AuthHttpError && err.status === 401) return;
      setError(err instanceof Error ? err.message : "Unable to load plans");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlans();
  }, [restaurantEmail]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, restaurant_email: restaurantEmail });
    setShowForm(true);
  }

  function openEdit(plan: SubscriptionPlan) {
    setEditingId(plan.plan_id);
    setForm({
      restaurant_email: plan.restaurant_email,
      name: plan.name,
      description: plan.description,
      subscription_type: plan.subscription_type,
      meal_type: plan.meal_type,
      price: plan.price,
      delivery_days: plan.delivery_days,
      start_time: plan.start_time,
      end_time: plan.end_time,
      active: plan.active,
    });
    setShowForm(true);
  }

  function toggleDay(day: Weekday) {
    setForm((prev) => ({
      ...prev,
      delivery_days: prev.delivery_days.includes(day)
        ? prev.delivery_days.filter((item) => item !== day)
        : [...prev.delivery_days, day],
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);

    try {
      if (editingId) {
        const updated = await updateSubscriptionPlan(editingId, {
          name: form.name,
          description: form.description,
          subscription_type: form.subscription_type,
          meal_type: form.meal_type,
          price: form.price,
          delivery_days: form.delivery_days,
          start_time: form.start_time,
          end_time: form.end_time,
          active: form.active,
        });
        setPlans((prev) =>
          prev.map((plan) => (plan.plan_id === editingId ? updated : plan))
        );
        toast.success("Plan updated");
      } else {
        const created = await createSubscriptionPlan({
          ...form,
          restaurant_email: restaurantEmail,
        });
        setPlans((prev) => [created, ...prev]);
        toast.success("Plan created");
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save plan");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(plan: SubscriptionPlan) {
    try {
      const updated = await updateSubscriptionPlan(plan.plan_id, {
        active: !plan.active,
      });
      setPlans((prev) =>
        prev.map((item) => (item.plan_id === plan.plan_id ? updated : item))
      );
      toast.success(updated.active ? "Plan enabled" : "Plan disabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update plan");
    }
  }

  async function handleDelete(planId: string) {
    if (!window.confirm("Delete this subscription plan?")) return;

    try {
      await deleteSubscriptionPlan(planId);
      setPlans((prev) => prev.filter((plan) => plan.plan_id !== planId));
      toast.success("Plan deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete plan");
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground">
            Create reusable mess plans for customers to subscribe.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create plan
        </Button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void loadPlans(search);
        }}
        className="mb-6 flex gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search plans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : null}

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-2xl border bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold">
            {editingId ? "Edit plan" : "Create plan"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Name</span>
              <Input
                required
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </label>

            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Description</span>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Plan type</span>
              <select
                className={selectClassName}
                value={form.subscription_type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    subscription_type: e.target.value as SubscriptionType,
                  }))
                }
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Meal type</span>
              <select
                className={selectClassName}
                value={form.meal_type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    meal_type: e.target.value as MealType,
                  }))
                }
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="combo">Combo</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Price (₹)</span>
              <Input
                type="number"
                min="1"
                step="0.01"
                required
                value={form.price || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    price: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, active: e.target.checked }))
                }
              />
              Plan is active
            </label>

            <label className="space-y-1 text-sm">
              <span>Start time</span>
              <Input
                type="time"
                required
                value={form.start_time}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, start_time: e.target.value }))
                }
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>End time</span>
              <Input
                type="time"
                required
                value={form.end_time}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, end_time: e.target.value }))
                }
              />
            </label>

            <div className="sm:col-span-2">
              <p className="mb-2 text-sm">Delivery days</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`rounded-full px-3 py-1 text-sm capitalize ${
                      form.delivery_days.includes(day)
                        ? "bg-orange-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button type="submit" disabled={busy}>
              {editingId ? "Save changes" : "Create plan"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-12 text-center">
          <h2 className="text-xl font-semibold">No subscription plans yet</h2>
          <p className="mt-2 text-muted-foreground">
            Create your first plan so customers can subscribe to your mess.
          </p>
          <Button className="mt-6" onClick={openCreate}>
            Create plan
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <article
              key={plan.plan_id}
              className="rounded-2xl border bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.description ? (
                    <p className="text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    plan.active
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {plan.active ? "Active" : "Disabled"}
                </span>
              </div>

              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Meal</dt>
                  <dd className="capitalize">{plan.meal_type}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd>{planDurationLabel(plan.subscription_type)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Price</dt>
                  <dd>₹{plan.price.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Timing</dt>
                  <dd>{formatPlanTiming(plan)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Delivery days</dt>
                  <dd className="capitalize">{plan.delivery_days.join(", ")}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(plan)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleToggleActive(plan)}
                >
                  {plan.active ? "Disable" : "Enable"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => void handleDelete(plan.plan_id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
