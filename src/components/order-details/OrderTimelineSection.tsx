import React from "react";
import { ORDER_STATUSES } from "@/hooks/order-details/useOrderStatus";

export type OrderTimelineSectionProps = {
  currentIndex: number;
  currentStatusRef: React.RefObject<HTMLDivElement | null>;
  isCancelled: boolean;
};

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
          const completed = currentIndex > index;
          const current = currentIndex === index;

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
                      ? "bg-orange-500 text-white"
                      : current
                      ? "bg-orange-500 text-white ring-4 ring-orange-100"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {completed ? "✓" : current ? "●" : "○"}
                </div>

                {index < ORDER_STATUSES.length - 1 && (
                  <div
                    className={`h-10 w-0.5 ${
                      currentIndex > index
                        ? "bg-orange-500"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>

              {/* Status text */}
              <div className="pb-8 pt-1">
                <p
                  className={`font-semibold ${
                    current
                      ? "text-orange-600"
                      : completed
                      ? "text-gray-900"
                      : "text-gray-400"
                  }`}
                >
                  {status}
                </p>

                {current && (
                  <p className="mt-1 text-sm text-gray-500">
                    Current order status
                  </p>
                )}

                {completed && !current && (
                  <p className="mt-1 text-xs text-green-600">
                    Completed
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
