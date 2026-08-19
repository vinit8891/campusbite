"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import { AuthHttpError } from "@/services/authFetch";
import {
  type SubscriptionPlan,
  type SubscriptionPlanInput,
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  getRestaurantPlans,
  updateSubscriptionPlan,
} from "@/services/subscriptionPlanService";
import type { Weekday } from "@/types";

export const WEEKDAYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const emptyPlanForm: SubscriptionPlanInput = {
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

export function useRestaurantSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SubscriptionPlanInput>(emptyPlanForm);
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
    setForm({ ...emptyPlanForm, restaurant_email: restaurantEmail });
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

  return {
    plans,
    loading,
    error,
    search,
    setSearch,
    showForm,
    setShowForm,
    editingId,
    form,
    setForm,
    busy,
    loadPlans,
    openCreate,
    openEdit,
    toggleDay,
    handleSubmit,
    handleToggleActive,
    handleDelete,
  };
}
