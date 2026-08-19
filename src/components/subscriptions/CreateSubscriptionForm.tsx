import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { selectClassName } from "@/lib/formatters";
import {
  formatPlanTiming,
  planDurationLabel,
  type SubscriptionPlan,
} from "@/services/subscriptionPlanService";

export type CreateSubscriptionFormProps = {
  restaurants: { email: string; name: string }[];
  selectedRestaurant: string;
  onSelectRestaurant: (email: string) => void;
  plans: SubscriptionPlan[];
  plansLoading: boolean;
  selectedPlanId: string;
  onSelectPlanId: (planId: string) => void;
  selectedPlan?: SubscriptionPlan;
  startDate: string;
  onStartDateChange: (date: string) => void;
  subscribeBusy: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function CreateSubscriptionForm({
  restaurants,
  selectedRestaurant,
  onSelectRestaurant,
  plans,
  plansLoading,
  selectedPlanId,
  onSelectPlanId,
  selectedPlan,
  startDate,
  onStartDateChange,
  subscribeBusy,
  onSubmit,
}: CreateSubscriptionFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 space-y-6 rounded-2xl border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-semibold">Subscribe to a plan</h2>
        <p className="text-sm text-muted-foreground">
          Choose a restaurant, pick an available plan, then select your start
          date.
        </p>
      </div>

      <label className="block space-y-1 text-sm">
        <span>1. Restaurant</span>
        <select
          required
          className={selectClassName}
          value={selectedRestaurant}
          onChange={(e) => onSelectRestaurant(e.target.value)}
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
                    onChange={() => onSelectPlanId(plan.plan_id)}
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
                        <span className="text-muted-foreground">Meal: </span>
                        <span className="capitalize">{plan.meal_type}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration: </span>
                        {planDurationLabel(plan.subscription_type)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Days: </span>
                        <span className="capitalize">
                          {plan.delivery_days.join(", ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Timing: </span>
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
          onChange={(e) => onStartDateChange(e.target.value)}
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
  );
}
