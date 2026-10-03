"use client";

import {
  CheckCircle2,
  Circle,
  XCircle,
} from "lucide-react";

type Props = {
  status: string;
};

const steps = [
  "Placed",
  "Accepted",
  "Preparing",
  "Ready for Pickup",
  "Assigned",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
];

const stepLabels: Record<string, string> = {
  Placed: "Order Placed",
  Accepted: "Order Accepted",
  Preparing: "Preparing Your Food",
  "Ready for Pickup": "Ready for Pickup",
  Assigned: "Delivery Partner Assigned",
  "Picked Up": "Order Picked Up",
  "Out for Delivery": "Out for Delivery",
  Delivered: "Delivered",
};

function getTimelineProgression(status: string): number {
  const s = (status || "").toLowerCase().replace(/[-_]/g, " ").trim();
  if (s === "pending" || s === "placed") return 0;
  if (s === "accepted") return 1;
  if (["preparing", "cooking", "in prep", "in_prep"].includes(s)) return 2;
  if (["ready", "ready for pickup", "ready_for_pickup"].includes(s)) return 3;
  if (s === "assigned") return 4;
  if (
    [
      "picked up",
      "picked_up",
      "out for delivery",
      "out_for_delivery",
      "in transit",
      "in_transit",
      "on the way",
    ].includes(s)
  ) {
    // Both Picked Up and Out for Delivery advance past Picked Up (step 5) to Out for Delivery (step 6)
    return 6;
  }
  if (["delivered", "completed"].includes(s)) return 7;
  return 0;
}

export default function OrderTimeline({ status }: Props) {
  const normalized = (status || "").toLowerCase().trim();
  if (normalized === "rejected" || normalized === "cancelled") {
    return (
      <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-4">
        <XCircle
          className="mt-0.5 text-red-600 shrink-0"
          size={24}
        />

        <div>
          <h3 className="font-bold text-red-700">
            {normalized === "cancelled"
              ? "Order Cancelled"
              : "Order Rejected"}
          </h3>

          <p className="text-sm text-red-600">
            {normalized === "cancelled"
              ? "This order has been cancelled."
              : "The restaurant could not accept your order."}
          </p>
        </div>
      </div>
    );
  }

  const progressionIndex = getTimelineProgression(status);
  const isDelivered = progressionIndex === 7;

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isCompleted =
          isDelivered || progressionIndex > index;
        const isCurrent =
          !isDelivered && progressionIndex === index;

        return (
          <div
            key={step}
            className="flex items-start gap-4"
          >
            <div className="flex flex-col items-center">
              {isCompleted ? (
                <CheckCircle2
                  className="text-emerald-600"
                  size={24}
                />
              ) : isCurrent ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-[11px] font-bold ring-4 ring-emerald-100 animate-pulse">
                  ●
                </div>
              ) : (
                <Circle
                  className="text-stone-300"
                  size={24}
                />
              )}

              {index < steps.length - 1 && (
                <div
                  className={`mt-1.5 h-6 w-0.5 transition-colors ${
                    isCompleted
                      ? "bg-emerald-500"
                      : "bg-stone-200"
                  }`}
                />
              )}
            </div>

            <div className="pt-0.5">
              <h3
                className={`text-sm ${
                  isCurrent
                    ? "font-black text-stone-900"
                    : isCompleted
                    ? "font-bold text-stone-800"
                    : "font-medium text-stone-400"
                }`}
              >
                {stepLabels[step]}
              </h3>

              {isCurrent && (
                <p className="mt-0.5 text-xs font-bold text-emerald-600 flex items-center gap-1">
                  ● Current status
                </p>
              )}

              {isCompleted && !isCurrent && index < steps.length - 1 && (
                <p className="mt-0.5 text-[11px] font-medium text-emerald-700/80">
                  ✓ Completed
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}