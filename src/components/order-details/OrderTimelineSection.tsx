import React from "react";
import { ORDER_STATUSES } from "@/hooks/order-details/useOrderStatus";

export type OrderTimelineSectionProps = {
  currentIndex: number;
  currentStatusRef: React.RefObject<HTMLDivElement | null>;
  isCancelled: boolean;
};

function getStatusBadgeStyle(status: string) {
  const s = status.toLowerCase();
  if (s.includes("pending") || s.includes("accepted")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (s.includes("prep") || s.includes("ready")) {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }
  if (
    s.includes("delivery") ||
    s.includes("delivered") ||
    s.includes("picked") ||
    s.includes("assigned")
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  return "bg-zinc-50 text-zinc-700 border-zinc-200";
}

export function OrderTimelineSection({
  currentIndex,
  currentStatusRef,
  isCancelled,
}: OrderTimelineSectionProps) {
  if (isCancelled) return null;

  return (
    <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Order Status</h2>

        <p className="mt-1 text-sm text-gray-500">
          Follow your order from kitchen to delivery.
        </p>
      </div>

      <div className="mt-8">
        {ORDER_STATUSES.map((status, index) => {
          const isDelivered = currentIndex >= ORDER_STATUSES.length - 1;
          const completed = isDelivered || currentIndex > index;
          const current = !isDelivered && currentIndex === index;

          return (
            <div
              key={status}
              ref={current ? currentStatusRef : undefined}
              className="flex items-start gap-4"
            >
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                    completed
                      ? "bg-emerald-500 text-white"
                      : current
                      ? "bg-orange-500 text-white ring-4 ring-orange-100 animate-pulse"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {completed ? "✓" : current ? "●" : "○"}
                </div>

                {index < ORDER_STATUSES.length - 1 && (
                  <div
                    className={`h-10 w-0.5 ${
                      currentIndex > index
                        ? "bg-emerald-500"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>

              {/* Status text */}
              <div className="pb-8 pt-1">
                <div className="flex items-center gap-2">
                  <p
                    className={`font-semibold ${
                      current
                        ? "text-zinc-900"
                        : completed
                        ? "text-zinc-800"
                        : "text-zinc-400"
                    }`}
                  >
                    {status}
                  </p>
                  {current && (
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold border ${getStatusBadgeStyle(
                        status
                      )}`}
                    >
                      In Progress
                    </span>
                  )}
                </div>

                {current && (
                  <p className="mt-1 text-sm text-gray-500">
                    Current order status
                  </p>
                )}

                {completed && !current && (
                  <p className="mt-1 text-xs text-emerald-600 font-medium">
                    ✓ Completed
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
