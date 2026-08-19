"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { AuthHttpError } from "@/services/authFetch";
import { getRestaurantsPage } from "@/services/restaurantService";
import {
  getPublicPlans,
  type SubscriptionPlan,
} from "@/services/subscriptionPlanService";
import {
  type Subscription,
  type SubscriptionPayment,
  type SubscriptionSummary,
  cancelSubscription,
  createSubscription,
  getMySubscriptionPayments,
  getMySubscriptions,
  getSubscriptionSummary,
  pauseSubscription,
  resumeSubscription,
} from "@/services/subscriptionService";

export function useCustomerSubscriptions() {
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [restaurants, setRestaurants] = useState<{ email: string; name: string }[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [subscribeBusy, setSubscribeBusy] = useState(false);
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  const selectedPlan = plans.find((plan) => plan.plan_id === selectedPlanId);

  async function loadSubscriptions() {
    setLoading(true);
    setError("");
    try {
      if (!isLoggedIn && !localStorage.getItem("token")) {
        setError("Please log in to manage subscriptions.");
        setItems([]);
        setSummary(null);
        return;
      }
      const [data, summaryData, paymentsData] = await Promise.all([
        getMySubscriptions(),
        getSubscriptionSummary(),
        getMySubscriptionPayments({ limit: 20 }),
      ]);
      setItems(data);
      setSummary(summaryData);
      setPayments(paymentsData.items ?? []);
    } catch (err) {
      if (err instanceof AuthHttpError && err.status === 401) return;
      setError(err instanceof Error ? err.message : "Unable to load subscriptions");
    } finally {
      setLoading(false);
      setSummaryLoading(false);
      setPaymentsLoading(false);
    }
  }

  useEffect(() => {
    void loadSubscriptions();
  }, [isLoggedIn]);

  useEffect(() => {
    if (!showCreate) return;
    void (async () => {
      try {
        const data = await getRestaurantsPage({ limit: 100 });
        setRestaurants(
          data.items.filter((r) => r.email).map((r) => ({ email: r.email, name: r.name }))
        );
      } catch {
        setRestaurants([]);
      }
    })();
  }, [showCreate]);

  useEffect(() => {
    if (!selectedRestaurant) {
      setPlans([]);
      setSelectedPlanId("");
      return;
    }
    void (async () => {
      setPlansLoading(true);
      try {
        const planItems = await getPublicPlans(selectedRestaurant);
        setPlans(planItems);
        setSelectedPlanId("");
      } catch {
        setPlans([]);
      } finally {
        setPlansLoading(false);
      }
    })();
  }, [selectedRestaurant]);

  async function handleSubscribe(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedPlanId || !startDate) return;
    setSubscribeBusy(true);
    try {
      const created = await createSubscription({
        plan_id: selectedPlanId,
        start_date: startDate,
        payment_status: "pending",
        auto_renew: false,
      });
      toast.success("Subscription created");
      setShowCreate(false);
      setSelectedRestaurant("");
      setSelectedPlanId("");
      setStartDate("");
      setItems((prev) => [created, ...prev]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create subscription");
    } finally {
      setSubscribeBusy(false);
    }
  }

  async function handlePause(subscriptionId: string) {
    const sub = items.find((item) => item.subscription_id === subscriptionId);
    if (!sub) return;
    const pauseFrom = window.prompt("Pause from (YYYY-MM-DD)", sub.start_date);
    if (!pauseFrom) return;
    const pauseTo = window.prompt("Pause until (YYYY-MM-DD)", sub.end_date);
    if (!pauseTo) return;
    setBusyId(subscriptionId);
    try {
      const updated = await pauseSubscription(subscriptionId, { pause_from: pauseFrom, pause_to: pauseTo });
      setItems((prev) => prev.map((item) => (item.subscription_id === subscriptionId ? updated : item)));
      toast.success("Subscription paused");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to pause subscription");
    } finally {
      setBusyId(null);
    }
  }

  async function handleResume(subscriptionId: string) {
    setBusyId(subscriptionId);
    try {
      const updated = await resumeSubscription(subscriptionId);
      setItems((prev) => prev.map((item) => (item.subscription_id === subscriptionId ? updated : item)));
      toast.success("Subscription resumed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resume subscription");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(subscriptionId: string) {
    if (!window.confirm("Cancel this subscription?")) return;
    setBusyId(subscriptionId);
    try {
      const updated = await cancelSubscription(subscriptionId);
      setItems((prev) => prev.map((item) => (item.subscription_id === subscriptionId ? updated : item)));
      toast.success("Subscription cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel subscription");
    } finally {
      setBusyId(null);
    }
  }

  return {
    isLoggedIn,
    items,
    loading,
    error,
    busyId,
    showCreate,
    setShowCreate,
    restaurants,
    selectedRestaurant,
    setSelectedRestaurant,
    plans,
    plansLoading,
    selectedPlanId,
    setSelectedPlanId,
    selectedPlan,
    startDate,
    setStartDate,
    subscribeBusy,
    summary,
    summaryLoading,
    payments,
    paymentsLoading,
    loadSubscriptions,
    handleSubscribe,
    handlePause,
    handleResume,
    handleCancel,
  };
}
