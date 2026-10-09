"use client";

import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/navbar";
import { Skeleton } from "@/components/ui/skeleton";

const MockCheckoutModal = dynamic(
  () => import("@/components/checkout/MockCheckoutModal"),
  { ssr: false }
);
import {
  SubscriptionHeader,
  SubscriptionStats,
  BillingSection,
  CreateSubscriptionForm,
  SubscriptionEmptyState,
  SubscriptionGroupSection,
  WeeklyMessSelector,
} from "@/components/subscriptions";
import {
  useSubscriptionGroups,
  useRenewalCheckout,
} from "@/hooks/subscriptions";
import { useCustomerSubscriptions } from "@/hooks/subscriptions/useCustomerSubscriptions";

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
  const {
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
  } = useCustomerSubscriptions();

  const groups = useSubscriptionGroups(items);

  const {
    billingBusy,
    mockOpen,
    mockBusy,
    pendingRenewal,
    handleRenew,
    handleRetry,
    runMockRenewalOutcome,
  } = useRenewalCheckout(loadSubscriptions);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <SubscriptionHeader
          isLoggedIn={isLoggedIn}
          showCreate={showCreate}
          onToggleCreate={() => setShowCreate((v) => !v)}
        />

        {isLoggedIn ? (
          <SubscriptionStats summary={summary} summaryLoading={summaryLoading} />
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
          <div className="mb-8 space-y-6">
            <WeeklyMessSelector
              restaurantEmail={selectedRestaurant || (restaurants[0]?.email ?? "")}
              restaurantName={restaurants.find((r) => r.email === selectedRestaurant)?.name || "Campus Central Mess"}
              isLoggedIn={isLoggedIn}
              onSubscriptionCreated={() => {
                void loadSubscriptions();
                setShowCreate(false);
              }}
            />

            <details className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <summary className="cursor-pointer text-sm font-semibold text-stone-700 hover:text-stone-900">
                ⚙️ Browse specific canteen fixed-menu plans instead
              </summary>
              <div className="mt-4 pt-4 border-t border-stone-100">
                <CreateSubscriptionForm
                  restaurants={restaurants}
                  selectedRestaurant={selectedRestaurant}
                  onSelectRestaurant={setSelectedRestaurant}
                  plans={plans}
                  plansLoading={plansLoading}
                  selectedPlanId={selectedPlanId}
                  onSelectPlanId={setSelectedPlanId}
                  selectedPlan={selectedPlan}
                  startDate={startDate}
                  onStartDateChange={setStartDate}
                  subscribeBusy={subscribeBusy}
                  onSubmit={handleSubscribe}
                />
              </div>
            </details>
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <LoadingSkeleton />
        ) : items.length === 0 ? (
          <SubscriptionEmptyState
            isLoggedIn={isLoggedIn}
            onBrowsePlans={() => setShowCreate(true)}
          />
        ) : (
          <div className="space-y-10">
            <SubscriptionGroupSection
              title="Active"
              subscriptions={groups.active}
              emptyText="No active subscriptions right now."
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              busyId={busyId}
            />

            <SubscriptionGroupSection
              title="Upcoming"
              subscriptions={groups.upcoming}
              emptyText="No upcoming subscriptions scheduled."
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              busyId={busyId}
            />

            <SubscriptionGroupSection
              title="History"
              subscriptions={groups.history}
              emptyText="No past subscriptions yet."
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              busyId={busyId}
            />
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
