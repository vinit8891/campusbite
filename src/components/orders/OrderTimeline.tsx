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
  "Picked Up",
  "Out for Delivery",
  "Delivered",
];

export default function OrderTimeline({
  status,
}: Props) {
  if (status === "Rejected") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-3">
          <XCircle
            className="text-red-600"
            size={26}
          />

          <div>
            <h3 className="font-bold text-red-700">
              Order Rejected
            </h3>

            <p className="text-sm text-red-600">
              The restaurant could not accept
              your order.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentIndex =
    steps.indexOf(status);

  return (
    <div className="space-y-4">

      {steps.map((step, index) => {
        const completed =
          index <= currentIndex;

        return (
          <div
            key={step}
            className="flex items-start gap-4"
          >
            <div>

              {completed ? (
                <CheckCircle2
                  className="text-green-600"
                  size={24}
                />
              ) : (
                <Circle
                  className="text-gray-300"
                  size={24}
                />
              )}

            </div>

            <div>

              <h3
                className={`font-semibold ${
                  completed
                    ? "text-black"
                    : "text-gray-400"
                }`}
              >
                {step}
              </h3>

            </div>

          </div>
        );
      })}
    </div>
  );
}