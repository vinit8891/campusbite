"use client";

import { CheckCircle2, Circle, XCircle } from "lucide-react";

type Props = {
  status: string;
};

const STEPPER_STAGES = [
  { key: "placed", label: "Order Placed", desc: "Sent to campus canteen kitchen" },
  { key: "accepted", label: "Kitchen Accepted", desc: "Order confirmed & food being prepared" },
  { key: "picked_up", label: "Runner Picked Up", desc: "Courier collected food from counter" },
  { key: "arrived_gate", label: "Arrived at Gate", desc: "Courier arrived at your campus spot gate / lobby" },
  { key: "delivered", label: "Delivered", desc: "Handover complete & enjoyed" },
];

function getStageIndex(status: string): number {
  const s = (status || "").toLowerCase().replace(/[-_]/g, " ").trim();
  if (s === "pending" || s === "placed") return 0;
  if (["accepted", "preparing", "cooking", "in prep", "ready", "ready for pickup"].includes(s)) return 1;
  if (["assigned", "picked up", "picked_up"].includes(s)) return 2;
  if (["out for delivery", "arrived", "arrived at gate", "in transit", "on the way"].includes(s)) return 3;
  if (["delivered", "completed"].includes(s)) return 4;
  return 0;
}

export default function OrderTimeline({ status }: Props) {
  const normalized = (status || "").toLowerCase().trim();
  if (normalized === "rejected" || normalized === "cancelled") {
    return (
      <div className="relative z-10 flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-4">
        <XCircle className="mt-0.5 text-red-600 shrink-0" size={24} />
        <div>
          <h3 className="font-bold text-red-700">
            {normalized === "cancelled" ? "Order Cancelled" : "Order Rejected"}
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

  const currentStage = getStageIndex(status);
  const isDelivered = currentStage >= 4;

  return (
    <div className="relative z-10 flex flex-col space-y-4">
      {STEPPER_STAGES.map((step, index) => {
        const isCompleted = isDelivered || currentStage > index;
        const isCurrent = !isDelivered && currentStage === index;

        return (
          <div key={step.key} className="flex items-start gap-3.5">
            {/* Step icon and connector line */}
            <div className="flex flex-col items-center shrink-0">
              {isCompleted ? (
                <CheckCircle2 className="text-emerald-600 h-6 w-6" />
              ) : isCurrent ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-white text-[11px] font-bold ring-4 ring-orange-100 animate-pulse">
                  ●
                </div>
              ) : (
                <Circle className="text-stone-300 h-6 w-6" />
              )}

              {index < STEPPER_STAGES.length - 1 && (
                <div
                  className={`mt-1 h-7 w-0.5 transition-colors ${
                    isCompleted ? "bg-emerald-500" : "bg-stone-200"
                  }`}
                />
              )}
            </div>

            {/* Step details */}
            <div className="pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className={`text-sm ${
                    isCurrent
                      ? "font-black text-stone-900"
                      : isCompleted
                      ? "font-bold text-stone-800"
                      : "font-medium text-stone-400"
                  }`}
                >
                  {step.label}
                </h3>

                {isCurrent && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase text-orange-700">
                    Live
                  </span>
                )}
                {isCompleted && !isCurrent && (
                  <span className="text-[11px] text-emerald-600 font-bold">
                    ✓ Done
                  </span>
                )}
              </div>

              <p className="text-xs text-stone-500 mt-0.5">
                {step.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}