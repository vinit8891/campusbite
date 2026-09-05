"use client";

import { useEffect, useState } from "react";
import { AuthHttpError } from "@/services/authFetch";
import {
  type Subscription,
  type SubscriptionGenerationStatus,
  type SubscriptionPayment,
  type SubscriptionStatus,
  type AdminSubscriptionPaymentSummary,
  getAdminGenerationStatus,
  getAdminSubscriptionPaymentSummary,
  getAdminSubscriptionPayments,
  getAdminSubscriptions,
} from "@/services/subscriptionService";

export const ADMIN_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "active",
  "paused",
  "expired",
  "cancelled",
];

export const ADMIN_SUBSCRIPTION_PAYMENT_STATUSES = [
  "paid",
  "pending",
  "processing",
  "failed",
];

export function useAdminSubscriptions() {
  const [items, setItems] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generationStatus, setGenerationStatus] =
    useState<SubscriptionGenerationStatus | null>(null);
  const [paymentSummary, setPaymentSummary] =
    useState<AdminSubscriptionPaymentSummary | null>(null);
  const [paymentItems, setPaymentItems] = useState<SubscriptionPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | "">("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [restaurantEmail, setRestaurantEmail] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  async function fetchPayments(filters?: { payment_status?: string }) {
    setPaymentsLoading(true);
    try {
      const [summary, payments] = await Promise.all([
        getAdminSubscriptionPaymentSummary(),
        getAdminSubscriptionPayments({
          payment_status: (filters?.payment_status ?? paymentStatus) || undefined,
          limit: 20,
        }),
      ]);
      setPaymentSummary(summary);
      setPaymentItems(payments.items ?? []);
    } catch {
      setPaymentSummary(null);
      setPaymentItems([]);
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function fetchItems(filters?: {
    q?: string;
    status?: SubscriptionStatus | "";
    restaurant_email?: string;
    customer_email?: string;
  }) {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminSubscriptions({
        q: (filters?.q ?? q).trim() || undefined,
        status: (filters?.status ?? status) || undefined,
        restaurant_email:
          (filters?.restaurant_email ?? restaurantEmail).trim() || undefined,
        customer_email:
          (filters?.customer_email ?? customerEmail).trim() || undefined,
      });
      setItems(data);
    } catch (err) {
      if (err instanceof AuthHttpError && err.status === 401) return;
      setError(
        err instanceof Error ? err.message : "Unable to load subscriptions"
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchItems();
    void fetchPayments();
    void (async () => {
      try {
        const genStatus = await getAdminGenerationStatus();
        setGenerationStatus(genStatus);
      } catch {
        setGenerationStatus(null);
      }
    })();
  }, []);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    void fetchItems();
  }

  function handleReset() {
    setQ("");
    setStatus("");
    setRestaurantEmail("");
    setCustomerEmail("");
    void fetchItems({
      q: "",
      status: "",
      restaurant_email: "",
      customer_email: "",
    });
  }

  return {
    items,
    setItems,
    loading,
    error,
    generationStatus,
    paymentSummary,
    paymentItems,
    paymentsLoading,
    q,
    setQ,
    status,
    setStatus,
    paymentStatus,
    setPaymentStatus,
    restaurantEmail,
    setRestaurantEmail,
    customerEmail,
    setCustomerEmail,
    fetchPayments,
    fetchItems,
    handleSearch,
    handleReset,
  };
}

