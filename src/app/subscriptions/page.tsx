"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CreditCard, Pause, Play, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { AuthHttpError } from "@/services/authFetch";
import { getRestaurantsPage } from "@/services/restaurantService";
import {
  formatPlanTiming,
  getPublicPlans,
  planDurationLabel,
  type SubscriptionPlan,
} from "@/services/subscriptionPlanService";
import MockCheckoutModal from "@/components/checkout/MockCheckoutModal";
import { openRazorpayCheckout } from "@/lib/razorpayCheckout";
import { getRazorpayConfig } from "@/services/paymentService";
import {
  type Subscription,
  type SubscriptionPayment,
  type SubscriptionRenewalResponse,
  type SubscriptionSummary,
  cancelSubscription,
  categorizeSubscriptions,
  createSubscription,
  getMySubscriptionPayments,
  getMySubscriptions,
  getSubscriptionSummary,
  mockCompleteSubscriptionRenewal,
  pauseSubscription,
  renewSubscription,
  resumeSubscription,
  retrySubscriptionPayment,
  todayIsoDate,
  verifySubscriptionRenewal,
} from "@/services/subscriptionService";
import { ROUTES } from "@/constants/routes";

const selectClassName =
  "h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function paymentStatusBadge(status: string) {
  const colors: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    pending: "bg-amber-100 text-amber-800",
    processing: "bg-blue-100 text-blue-800",
    failed: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        colors[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function BillingSection({
  subscriptions,
  payments,
  paymentsLoading,
  billingBusy,
  onRenew,
  onRetry,
}: {
  subscriptions: Subscription[];
  payments: SubscriptionPayment[];
  paymentsLoading: boolean;
  billingBusy: string | null;
  onRenew: (subscription: Subscription) => void;
  onRetry: (subscription: Subscription) => void;
}) {
  const today = todayIsoDate();
  const primary =
    subscriptions.find(
      (item) =>
        item.status !== "cancelled" &&
        item.end_date >= today &&
        (item.status === "active" || item.status === "paused")
    ) || subscriptions[0];

  if (!primary) return null;

  const lastPayment = payments[0];
  const renewalDue =
    lastPayment?.renewal_due || primary.end_date || null;
  const canRenew =
    primary.status !== "cancelled" &&
    primary.payment_status !== "failed" &&
    primary.payment_status !== "processing";
  const canRetry = primary.payment_status === "failed";

  return (
    <section className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Billing</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-sm text-muted-foreground">Current Plan</p>
          <p className="mt-1 font-medium">
            {primary.plan_name ||
              `${primary.meal_type} · ${primary.subscription_type}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {primary.restaurant_email}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Billing Status</p>
          <div className="mt-1">{paymentStatusBadge(primary.payment_status)}</div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Renewal Due</p>
          <p className="mt-1 font-medium">{formatDate(renewalDue)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Last Payment</p>
          {lastPayment ? (
            <p className="mt-1 font-medium">
              ₹{Number(lastPayment.amount).toFixed(2)} ·{" "}
              {formatDateTime(lastPayment.paid_at)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No payments yet</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {canRenew ? (
          <Button
            size="sm"
            disabled={billingBusy === primary.subscription_id}
            onClick={() => onRenew(primary)}
          >
            Renew Now
          </Button>
        ) : null}
        {canRetry ? (
          <Button
            size="sm"
            variant="outline"
            disabled={billingBusy === primary.subscription_id}
            onClick={() => onRetry(primary)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Payment
          </Button>
        ) : null}
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Payment History
        </h3>
        {paymentsLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No billing history yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Paid At</th>
                  <th className="px-3 py-2">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.payment_id} className="border-b last:border-0">
                    <td className="px-3 py-2">{payment.billing_period || "—"}</td>
                    <td className="px-3 py-2">
                      ₹{Number(payment.amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 capitalize">
                      {payment.payment_method}
                    </td>
                    <td className="px-3 py-2 capitalize">
                      {payment.payment_status}
                    </td>
                    <td className="px-3 py-2">
                      {formatDateTime(payment.paid_at)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {payment.transaction_reference || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    paused: "bg-amber-100 text-amber-800",
    expired: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        colors[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function SubscriptionCard({
  subscription,
  onPause,
  onResume,
  onCancel,
  busy,
}: {
  subscription: Subscription;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  busy: string | null;
}) {
  const isBusy = busy === subscription.subscription_id;

  return (
    <article className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold capitalize">
            {subscription.plan_name
              ? subscription.plan_name
              : `${subscription.meal_type} · ${subscription.subscription_type}`}
          </h3>
          <p className="text-sm text-muted-foreground">
            {subscription.restaurant_email}
          </p>
        </div>
        {statusBadge(subscription.status)}
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Period</dt>
          <dd>
            {formatDate(subscription.start_date)} –{" "}
            {formatDate(subscription.end_date)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Price</dt>
          <dd>₹{subscription.price.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Delivery days</dt>
          <dd className="capitalize">
            {subscription.delivery_days.join(", ")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Payment</dt>
          <dd className="capitalize">{subscription.payment_status}</dd>
        </div>
        {subscription.pause_from && subscription.pause_to ? (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Paused</dt>
            <dd>
              {formatDate(subscription.pause_from)} –{" "}
              {formatDate(subscription.pause_to)}
            </dd>
          </div>
        ) : null}
      </dl>

      {subscription.status !== "cancelled" &&
      subscription.status !== "expired" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {subscription.status === "paused" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => onResume(subscription.subscription_id)}
            >
              <Play className="mr-2 h-4 w-4" />
              Resume
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => onPause(subscription.subscription_id)}
            >
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
            disabled={isBusy}
            onClick={() => onCancel(subscription.subscription_id)}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-44 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function SubscriptionsPage() {
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [restaurants, setRestaurants] = useState<
    { email: string; name: string }[]
  >([]);
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
  const [billingBusy, setBillingBusy] = useState<string | null>(null);
  const [mockOpen, setMockOpen] = useState(false);
  const [mockBusy, setMockBusy] = useState(false);
  const [pendingRenewal, setPendingRenewal] = useState<{
    subscription: Subscription;
    payment: SubscriptionRenewalResponse;
  } | null>(null);

  const selectedPlan = plans.find((plan) => plan.plan_id === selectedPlanId);

  const groups = useMemo(() => categorizeSubscriptions(items), [items]);

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
      setError(
        err instanceof Error ? err.message : "Unable to load subscriptions"
      );
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
          data.items
            .filter((r) => r.email)
            .map((r) => ({ email: r.email, name: r.name }))
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
        const items = await getPublicPlans(selectedRestaurant);
        setPlans(items);
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
      toast.error(
        err instanceof Error ? err.message : "Failed to create subscription"
      );
    } finally {
      setSubscribeBusy(false);
    }
  }

  async function handlePause(subscriptionId: string) {
    const sub = items.find((item) => item.subscription_id === subscriptionId);
    if (!sub) return;

    const pauseFrom = window.prompt(
      "Pause from (YYYY-MM-DD)",
      sub.start_date
    );
    if (!pauseFrom) return;

    const pauseTo = window.prompt("Pause until (YYYY-MM-DD)", sub.end_date);
    if (!pauseTo) return;

    setBusyId(subscriptionId);
    try {
      const updated = await pauseSubscription(subscriptionId, {
        pause_from: pauseFrom,
        pause_to: pauseTo,
      });
      setItems((prev) =>
        prev.map((item) =>
          item.subscription_id === subscriptionId ? updated : item
        )
      );
      toast.success("Subscription paused");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to pause subscription"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleResume(subscriptionId: string) {
    setBusyId(subscriptionId);
    try {
      const updated = await resumeSubscription(subscriptionId);
      setItems((prev) =>
        prev.map((item) =>
          item.subscription_id === subscriptionId ? updated : item
        )
      );
      toast.success("Subscription resumed");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to resume subscription"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(subscriptionId: string) {
    if (!window.confirm("Cancel this subscription?")) return;

    setBusyId(subscriptionId);
    try {
      const updated = await cancelSubscription(subscriptionId);
      setItems((prev) =>
        prev.map((item) =>
          item.subscription_id === subscriptionId ? updated : item
        )
      );
      toast.success("Subscription cancelled");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel subscription"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function runRenewalCheckout(
    subscription: Subscription,
    payment: SubscriptionRenewalResponse
  ) {
    const config = await getRazorpayConfig();
    if (!config.enabled || !payment.key_id) {
      throw new Error("Online payments are not available right now.");
    }

    if (config.mode === "mock" || config.mock_checkout_available) {
      setPendingRenewal({ subscription, payment });
      setMockOpen(true);
      return;
    }

    await openRazorpayCheckout({
      keyId: payment.key_id,
      payment: {
        order_id: subscription.subscription_id,
        payment_id: payment.payment_id,
        razorpay_order_id: payment.razorpay_order_id,
        amount: payment.amount,
        amount_paise: payment.amount_paise,
        currency: payment.currency,
        key_id: payment.key_id,
        payment_status: payment.payment_status,
      },
      customerName: subscription.customer_email,
      customerEmail: subscription.customer_email,
      description: `Subscription renewal · ${subscription.plan_name || subscription.meal_type}`,
      onSuccess: async (result) => {
        try {
          const verified = await verifySubscriptionRenewal(
            subscription.subscription_id,
            {
              ...result,
              payment_id: payment.payment_id,
            }
          );
          if (verified.success) {
            toast.success("Subscription renewed successfully");
            await loadSubscriptions();
          } else {
            toast.error("Payment verification failed");
            await loadSubscriptions();
          }
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Payment verification failed"
          );
          await loadSubscriptions();
        } finally {
          setBillingBusy(null);
        }
      },
      onDismiss: () => {
        setBillingBusy(null);
        toast.message("Payment cancelled");
      },
      onFailure: async () => {
        toast.error("Payment failed");
        await loadSubscriptions();
        setBillingBusy(null);
      },
    });
  }

  async function handleRenew(subscription: Subscription) {
    const today = todayIsoDate();
    const isExpired =
      subscription.status === "expired" || subscription.end_date < today;
    if (
      isExpired &&
      !window.confirm(
        "This subscription has expired. Continue with manual renewal?"
      )
    ) {
      return;
    }

    setBillingBusy(subscription.subscription_id);
    try {
      const payment = await renewSubscription(
        subscription.subscription_id,
        isExpired
      );
      await runRenewalCheckout(subscription, payment);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start renewal");
      setBillingBusy(null);
    }
  }

  async function handleRetry(subscription: Subscription) {
    setBillingBusy(subscription.subscription_id);
    try {
      const payment = await retrySubscriptionPayment(subscription.subscription_id);
      await runRenewalCheckout(subscription, payment);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to retry payment");
      setBillingBusy(null);
    }
  }

  async function runMockRenewalOutcome(
    outcome: "success" | "failure" | "dismiss"
  ) {
    if (!pendingRenewal || mockBusy) return;

    setMockBusy(true);
    try {
      const result = await mockCompleteSubscriptionRenewal(
        pendingRenewal.subscription.subscription_id,
        outcome
      );

      if (outcome === "success" && result.payment_status === "paid") {
        toast.success("Subscription renewed successfully");
        setMockOpen(false);
        setPendingRenewal(null);
        await loadSubscriptions();
        return;
      }

      if (outcome === "failure") {
        toast.error("Payment failed");
      } else {
        toast.message("Payment cancelled");
      }
      setMockOpen(false);
      setPendingRenewal(null);
      await loadSubscriptions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mock payment failed");
    } finally {
      setMockBusy(false);
      setBillingBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Mess Subscriptions</h1>
            <p className="mt-1 text-muted-foreground">
              View and manage your meal plans. Dates cannot be changed after
              activation.
            </p>
          </div>
          {isLoggedIn ? (
            <div className="flex flex-wrap gap-2">
              <Link href={ROUTES.SUBSCRIPTIONS_CALENDAR}>
                <Button variant="outline">Meal calendar</Button>
              </Link>
              <Button onClick={() => setShowCreate((v) => !v)}>
                {showCreate ? "Close" : "Subscribe"}
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button>Log in</Button>
            </Link>
          )}
        </div>

        {isLoggedIn ? (
          <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryLoading ? (
              <>
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
              </>
            ) : (
              <>
                <article className="rounded-2xl border bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Today&apos;s Meal
                  </h2>
                  {summary?.today_meal ? (
                    <div className="mt-2">
                      <p className="font-semibold capitalize">
                        {summary.today_meal.meal_type}
                        {summary.today_meal.plan_name
                          ? ` · ${summary.today_meal.plan_name}`
                          : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {summary.today_meal.restaurant_email}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No meal scheduled for today.
                    </p>
                  )}
                </article>

                <article className="rounded-2xl border bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Upcoming Meal
                  </h2>
                  {summary?.upcoming_meal ? (
                    <div className="mt-2">
                      <p className="font-semibold">
                        {formatDate(summary.upcoming_meal.date)}
                      </p>
                      <p className="text-sm capitalize">
                        {summary.upcoming_meal.meal_type}
                        {summary.upcoming_meal.plan_name
                          ? ` · ${summary.upcoming_meal.plan_name}`
                          : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No upcoming meals scheduled.
                    </p>
                  )}
                </article>

                <article className="rounded-2xl border bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Last Generated Order
                  </h2>
                  {summary?.last_generated_order ? (
                    <div className="mt-2">
                      <p className="font-semibold">
                        {summary.last_generated_order.meal_name || "Mess meal"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(
                          summary.last_generated_order.subscription_order_date
                        )}{" "}
                        · {summary.last_generated_order.status}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No generated orders yet.
                    </p>
                  )}
                </article>

                <article className="rounded-2xl border bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Status
                  </h2>
                  <div className="mt-2">
                    {summary?.subscription_status ? (
                      statusBadge(summary.subscription_status)
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No active subscription
                      </p>
                    )}
                  </div>
                </article>
              </>
            )}
          </section>
        ) : null}

        {isLoggedIn && items.length > 0 ? (
          <BillingSection
            subscriptions={items}
            payments={payments}
            paymentsLoading={paymentsLoading}
            billingBusy={billingBusy}
            onRenew={handleRenew}
            onRetry={handleRetry}
          />
        ) : null}

        {showCreate ? (
          <form
            onSubmit={handleSubscribe}
            className="mb-8 space-y-6 rounded-2xl border bg-white p-6 shadow-sm"
          >
            <div>
              <h2 className="text-lg font-semibold">Subscribe to a plan</h2>
              <p className="text-sm text-muted-foreground">
                Choose a restaurant, pick an available plan, then select your
                start date.
              </p>
            </div>

            <label className="block space-y-1 text-sm">
              <span>1. Restaurant</span>
              <select
                required
                className={selectClassName}
                value={selectedRestaurant}
                onChange={(e) => setSelectedRestaurant(e.target.value)}
              >
                <option value="">Select restaurant</option>
                {restaurants.map((r) => (
                  <option key={r.email} value={r.email}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-3">
              <p className="text-sm font-medium">2. Available plans</p>
              {!selectedRestaurant ? (
                <p className="text-sm text-muted-foreground">
                  Select a restaurant to view plans.
                </p>
              ) : plansLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-28 w-full rounded-xl" />
                  <Skeleton className="h-28 w-full rounded-xl" />
                </div>
              ) : plans.length === 0 ? (
                <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  This restaurant has no active plans yet.
                </p>
              ) : (
                <div className="grid gap-3">
                  {plans.map((plan) => (
                    <label
                      key={plan.plan_id}
                      className={`cursor-pointer rounded-xl border p-4 transition ${
                        selectedPlanId === plan.plan_id
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="plan"
                          value={plan.plan_id}
                          checked={selectedPlanId === plan.plan_id}
                          onChange={() => setSelectedPlanId(plan.plan_id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-semibold">{plan.name}</h3>
                            <span className="font-medium">
                              ₹{plan.price.toFixed(2)}
                            </span>
                          </div>
                          {plan.description ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {plan.description}
                            </p>
                          ) : null}
                          <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                            <div>
                              <span className="text-muted-foreground">
                                Meal:{" "}
                              </span>
                              <span className="capitalize">{plan.meal_type}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Duration:{" "}
                              </span>
                              {planDurationLabel(plan.subscription_type)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Days:{" "}
                              </span>
                              <span className="capitalize">
                                {plan.delivery_days.join(", ")}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Timing:{" "}
                              </span>
                              {formatPlanTiming(plan)}
                            </div>
                          </dl>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <label className="block max-w-xs space-y-1 text-sm">
              <span>3. Start date</span>
              <Input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={!selectedPlanId}
              />
              {selectedPlan ? (
                <p className="text-xs text-muted-foreground">
                  {planDurationLabel(selectedPlan.subscription_type)} from your
                  selected start date. End date is set automatically.
                </p>
              ) : null}
            </label>

            <Button
              type="submit"
              disabled={!selectedPlanId || !startDate || subscribeBusy}
            >
              Subscribe
            </Button>
          </form>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <LoadingSkeleton />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white p-12 text-center">
            <CalendarDays className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="text-xl font-semibold">No subscriptions yet</h2>
            <p className="mt-2 text-muted-foreground">
              Subscribe to a mess plan to see active meals, upcoming starts,
              and history here.
            </p>
            {isLoggedIn ? (
              <Button className="mt-6" onClick={() => setShowCreate(true)}>
                Browse plans
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-10">
            <section>
              <h2 className="mb-4 text-xl font-semibold">Active</h2>
              {groups.active.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active subscriptions right now.
                </p>
              ) : (
                <div className="space-y-4">
                  {groups.active.map((sub) => (
                    <SubscriptionCard
                      key={sub.subscription_id}
                      subscription={sub}
                      onPause={handlePause}
                      onResume={handleResume}
                      onCancel={handleCancel}
                      busy={busyId}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold">Upcoming</h2>
              {groups.upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No upcoming subscriptions scheduled.
                </p>
              ) : (
                <div className="space-y-4">
                  {groups.upcoming.map((sub) => (
                    <SubscriptionCard
                      key={sub.subscription_id}
                      subscription={sub}
                      onPause={handlePause}
                      onResume={handleResume}
                      onCancel={handleCancel}
                      busy={busyId}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold">History</h2>
              {groups.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No past subscriptions yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {groups.history.map((sub) => (
                    <SubscriptionCard
                      key={sub.subscription_id}
                      subscription={sub}
                      onPause={handlePause}
                      onResume={handleResume}
                      onCancel={handleCancel}
                      busy={busyId}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {mockOpen && pendingRenewal ? (
        <MockCheckoutModal
          amount={pendingRenewal.payment.amount}
          orderId={pendingRenewal.subscription.subscription_id}
          busy={mockBusy}
          onSuccess={() => void runMockRenewalOutcome("success")}
          onFailure={() => void runMockRenewalOutcome("failure")}
          onDismiss={() => void runMockRenewalOutcome("dismiss")}
        />
      ) : null}
    </div>
  );
}
