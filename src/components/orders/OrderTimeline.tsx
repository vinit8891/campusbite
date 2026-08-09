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

export default function OrderTimeline({ status }: Props) {
  if (status === "Rejected" || status === "Cancelled") {
    return (
      <div className="flex items-start gap-4">
        <XCircle
          className="mt-0.5 text-red-600"
          size={24}
        />

        <div>
          <h3 className="font-bold text-red-700">
            {status === "Cancelled"
              ? "Order Cancelled"
              : "Order Rejected"}
          </h3>

          <p className="text-sm text-red-600">
            {status === "Cancelled"
              ? "This order has been cancelled."
              : "The restaurant could not accept your order."}
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = steps.indexOf(status);

  return (
    <div className="space-y-5">
      {steps.map((step, index) => {
        const completed =
          currentIndex >= 0 && index <= currentIndex;

        const current = step === status;

        return (
          <div
            key={step}
            className="flex items-start gap-4"
          >
            <div className="flex flex-col items-center">
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

              {index < steps.length - 1 && (
                <div
                  className={`mt-1 h-6 w-0.5 ${
                    completed
                      ? "bg-green-300"
                      : "bg-gray-200"
                  }`}
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
                {stepLabels[step]}
              </h3>

              {current && (
                <p className="mt-1 text-sm text-green-600">
                  Current status
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}