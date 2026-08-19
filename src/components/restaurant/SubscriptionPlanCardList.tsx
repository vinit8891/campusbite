import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type SubscriptionPlan,
  formatPlanTiming,
  planDurationLabel,
} from "@/services/subscriptionPlanService";

type SubscriptionPlanCardListProps = {
  plans: SubscriptionPlan[];
  onOpenEdit: (plan: SubscriptionPlan) => void;
  onToggleActive: (plan: SubscriptionPlan) => void;
  onDelete: (planId: string) => void;
};

export function SubscriptionPlanCardList({
  plans,
  onOpenEdit,
  onToggleActive,
  onDelete,
}: SubscriptionPlanCardListProps) {
  return (
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
            <Button size="sm" variant="outline" onClick={() => onOpenEdit(plan)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onToggleActive(plan)}
            >
              {plan.active ? "Disable" : "Enable"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => onDelete(plan.plan_id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
