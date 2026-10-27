import React from "react";
import Link from "next/link";
import { Phone, ShieldAlert } from "lucide-react";

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
  const displayName = name || "Campus Runner";

  const sosLink = `https://wa.me/919024197988?text=${encodeURIComponent(
    `🚨 Emergency SOS / Help: Need urgent assistance with my CampusBite runner delivery (${displayName}).`
  )}`;

  if (variant === "grid") {
    return (
      <section
        className={`relative z-10 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
            🛵
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Campus Runner Details
            </h2>

            <p className="text-sm text-gray-500">
              Student delivery partner assigned to your order.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Runner Name</p>
            <p className="mt-1 font-semibold">{displayName}</p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Phone</p>
            <p className="mt-1 font-semibold">{phone || "Not available"}</p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Vehicle / Batch</p>
            <p className="mt-1 font-semibold">{vehicle || "Campus Runner"}</p>
          </div>

          {status && (
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Current Status</p>
              <p className="mt-1 font-semibold text-blue-600">{status}</p>
            </div>
          )}
        </div>

        {/* Action Buttons (Minimum 44px tap targets for mobile UT) */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {showCallButton && phone && (
            <a
              href={`tel:${phone}`}
              className="min-h-[44px] h-11 px-5 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-xs active:scale-95 transition cursor-pointer"
            >
              <Phone className="h-4 w-4" />
              <span>Call Runner</span>
            </a>
          )}

          <a
            href={sosLink}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-sm font-bold active:scale-95 transition cursor-pointer"
          >
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            <span>Emergency SOS / Help</span>
          </a>

          {trackOrderHref && (
            <Link
              href={trackOrderHref}
              className="min-h-[44px] h-11 px-5 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-sm font-bold active:scale-95 transition"
            >
              <span>📍 Live GPS Track</span>
            </Link>
          )}
        </div>
      </section>
    );
  }

  if (variant === "card") {
    return (
      <section
        className={`relative z-10 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 shadow-sm flex flex-col justify-between ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-2xs">
            🛵
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Campus Runner
            </p>

            <h2 className="mt-0.5 break-words text-base font-bold text-gray-900">
              {displayName}
            </h2>

            {phone && (
              <p className="mt-0.5 break-words text-xs text-gray-600">
                📞 {phone}
              </p>
            )}

            {vehicle && (
              <p className="mt-0.5 break-words text-xs text-gray-500">
                🏍 {vehicle}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons (Minimum 44px tap targets) */}
        <div className="mt-4 pt-3 border-t border-blue-100/80 flex flex-wrap items-center gap-2">
          {showCallButton && phone ? (
            <a
              href={`tel:${phone}`}
              className="min-h-[44px] h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs active:scale-95 transition flex-1 cursor-pointer"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Call Runner</span>
            </a>
          ) : (
            <span className="text-xs text-stone-400 font-medium py-2">
              Runner phone will appear once assigned
            </span>
          )}

          <a
            href={sosLink}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] h-11 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold active:scale-95 transition cursor-pointer"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
            <span>SOS / Help</span>
          </a>
        </div>
      </section>
    );
  }

  // default banner
  return (
    <div
      className={`relative z-10 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Campus Runner
          </p>

          <p className="mt-0.5 font-bold text-gray-900">{displayName}</p>

          <p className="text-xs text-gray-600">
            {phone || "Assigned runner"}
            {vehicle ? ` • ${vehicle}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showCallButton && phone && (
            <a
              href={`tel:${phone}`}
              className="min-h-[44px] h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Call Runner</span>
            </a>
          )}

          <a
            href={sosLink}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] h-11 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
            <span>SOS / Help</span>
          </a>

          {trackOrderHref && (
            <Link
              href={trackOrderHref}
              className="min-h-[44px] h-11 px-4 inline-flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition"
            >
              <span>📍 Track Order</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default DeliveryPartnerCard;
