import React from "react";

export type CustomerOtpCardProps = {
  otp?: number | string | null;
  verified?: boolean;
  variant?: "compact" | "detailed" | "banner";
  className?: string;
};

export function CustomerOtpCard({
  otp,
  verified = false,
  variant = "compact",
  className = "",
}: CustomerOtpCardProps) {
  if (verified) {
    return (
      <div
        className={`rounded-2xl border border-green-200 bg-green-50 p-5 text-center shadow-sm ${className}`}
      >
        <p className="font-semibold text-green-700">✓ Delivery OTP Verified</p>
      </div>
    );
  }

  if (!otp) {
    return null;
  }

  if (variant === "detailed") {
    return (
      <section
        className={`rounded-3xl border border-orange-200 bg-orange-50 p-6 shadow-sm ${className}`}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-2xl">
            🔐
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-bold text-orange-900">Delivery OTP</h2>

            <p className="mt-1 text-sm text-orange-800">
              Give the delivery partner your OTP when your food arrives.
            </p>

            <div className="mt-5">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-white px-8 py-5 text-4xl font-black tracking-[10px] text-orange-600 shadow-sm">
                  {otp}
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-orange-800">
                Share this OTP only after receiving your order.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // compact / banner style
  return (
    <div
      className={`rounded-xl border-2 border-orange-300 bg-orange-100 p-4 text-center ${className}`}
    >
      <h4 className="text-sm font-bold text-orange-900">🔐 Delivery OTP</h4>

      <p className="mt-1 text-4xl font-extrabold tracking-[8px] text-orange-700">
        {otp}
      </p>

      <p className="mt-1 text-xs text-gray-600">
        Share this OTP only after receiving your order.
      </p>
    </div>
  );
}
