import React from "react";
import Link from "next/link";

export type DeliveryPartnerCardProps = {
  name?: string | null;
  phone?: string | null;
  vehicle?: string | null;
  status?: string | null;
  showCallButton?: boolean;
  trackOrderHref?: string;
  variant?: "banner" | "grid" | "card";
  className?: string;
};

export function DeliveryPartnerCard({
  name,
  phone,
  vehicle,
  status,
  showCallButton = true,
  trackOrderHref,
  variant = "banner",
  className = "",
}: DeliveryPartnerCardProps) {
  const displayName = name || "Delivery Partner";

  if (variant === "grid") {
    return (
      <section
        className={`rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">
            🛵
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Delivery Partner
            </h2>

            <p className="text-sm text-gray-500">
              Your delivery partner information.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Name</p>
            <p className="mt-1 font-semibold">{displayName}</p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Phone</p>
            <p className="mt-1 font-semibold">{phone || "Not available"}</p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Vehicle</p>
            <p className="mt-1 font-semibold">{vehicle || "Not specified"}</p>
          </div>

          {status && (
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Current Status</p>
              <p className="mt-1 font-semibold text-blue-600">{status}</p>
            </div>
          )}
        </div>

        {showCallButton && phone && (
          <a
            href={`tel:${phone}`}
            className="mt-5 inline-block rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            📞 Call Partner
          </a>
        )}
      </section>
    );
  }

  if (variant === "card") {
    return (
      <section
        className={`rounded-2xl border border-green-100 bg-green-50 p-5 shadow-sm ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl">
            🛵
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
              Delivery Partner
            </p>

            <h2 className="mt-1 break-words text-lg font-bold text-gray-900">
              {displayName}
            </h2>

            {phone && (
              <p className="mt-1 break-words text-sm text-gray-600">
                📞 {phone}
              </p>
            )}

            {vehicle && (
              <p className="mt-1 break-words text-sm text-gray-600">
                🏍 {vehicle}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  // default banner
  return (
    <div
      className={`rounded-xl border border-green-100 bg-green-50 p-4 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
            Delivery Partner
          </p>

          <p className="mt-1 font-bold text-gray-900">{displayName}</p>

          <p className="text-sm text-gray-600">
            {phone}
            {vehicle ? ` • ${vehicle}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {showCallButton && phone && (
            <a
              href={`tel:${phone}`}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              📞 Call
            </a>
          )}

          {trackOrderHref && (
            <Link
              href={trackOrderHref}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              📍 Track Order
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
