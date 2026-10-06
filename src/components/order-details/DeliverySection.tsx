"use client";

import React, { useEffect, useRef } from "react";
import type { Order } from "@/types/orders";
import {
  CustomerOtpCard,
  DeliveryPartnerCard,
} from "@/components/common";
import { Bike, KeyRound, Sparkles, Navigation } from "lucide-react";

export type DeliverySectionProps = {
  order: Order;
  hasDeliveryLocation: boolean;
};

export function DeliverySection({
  order,
  hasDeliveryLocation,
}: DeliverySectionProps) {
  const partner = order.delivery_partner as Record<string, unknown> | undefined;
  const isWithin200m =
    Boolean(partner?.is_within_200m) ||
    (typeof partner?.distance_meters === "number" && (partner.distance_meters as number) <= 200);

  const distanceMeters =
    typeof partner?.distance_meters === "number" ? partner.distance_meters : null;

  const hostelBlock =
    (order as unknown as { hostel_block?: string }).hostel_block ||
    order.address?.split(",")[0]?.trim() ||
    "Hostel Dropoff";

  const displayOtp =
    (order as unknown as { handover_otp?: string | number })?.handover_otp != null
      ? String((order as unknown as { handover_otp?: string | number }).handover_otp)
      : order.delivery_otp != null
      ? String(order.delivery_otp)
      : (order as unknown as { otp?: string | number })?.otp != null
      ? String((order as unknown as { otp?: string | number }).otp)
      : null;

  const vibrationTriggered = useRef(false);

  useEffect(() => {
    if (isWithin200m && !vibrationTriggered.current && typeof navigator !== "undefined" && navigator.vibrate) {
      vibrationTriggered.current = true;
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {}
    }
  }, [isWithin200m]);

  return (
    <>
      {/* ========================================================= */}
      {/* 200M PROXIMITY ALERT BANNER */}
      {/* ========================================================= */}
      {isWithin200m && order.status !== "Delivered" && (
        <section
          role="alert"
          aria-live="assertive"
          data-testid="proximity-alert-banner"
          className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 p-1 shadow-2xl shadow-orange-950/20 animate-in fade-in slide-in-from-top-4 duration-500"
        >
          <div className="rounded-[22px] bg-stone-950/95 p-5 sm:p-6 text-white backdrop-blur-md border border-amber-400/40 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-stone-950 shadow-lg shadow-orange-500/30 animate-bounce">
                  <Bike className="h-6 w-6" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-90" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 ring-2 ring-stone-900" />
                  </span>
                </div>

                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 border border-amber-400/40 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-300 animate-pulse">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    Rider Proximity Alert • Within 200m
                  </span>
                  <h2 className="mt-1 text-lg sm:text-xl font-black text-white tracking-tight">
                    🛵 Courier Arriving! Rider is within 200m of {hostelBlock}.
                  </h2>
                  <p className="mt-0.5 text-xs sm:text-sm text-amber-200/90 font-medium">
                    Head downstairs to the lobby now with your 4-digit OTP {displayOtp ? `(${displayOtp})` : ""}.
                  </p>
                </div>
              </div>

              {displayOtp ? (
                <div className="flex flex-col items-start sm:items-end rounded-2xl bg-amber-400/15 border border-amber-400/30 p-3 shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                    Handover OTP
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-xl font-black text-amber-300">
                    <KeyRound className="h-4 w-4 text-amber-400" />
                    <span>{displayOtp}</span>
                  </div>
                </div>
              ) : null}
            </div>

            {distanceMeters != null && (
              <div className="flex items-center justify-between text-xs text-amber-300/80 border-t border-white/10 pt-2.5">
                <span>📍 Straight-line distance: ~{distanceMeters}m to dropoff point</span>
                <span className="font-semibold text-emerald-400">● Live GPS Active</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* DELIVERY PARTNER */}
      {/* ========================================================= */}
      {order.delivery_partner && (
        <DeliveryPartnerCard
          name={order.delivery_partner.name}
          phone={order.delivery_partner.phone}
          vehicle={order.delivery_partner.vehicle}
          status={order.status}
          variant="grid"
          className="mt-8"
        />
      )}

      {/* ========================================================= */}
      {/* LIVE LOCATION */}
      {/* ========================================================= */}
      {order.status === "Out for Delivery" &&
        order.delivery_partner && (
          <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
                📍
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Live Location
                </h2>

                <p className="text-sm text-gray-500">
                  Tracking delivery partner live location.
                </p>
              </div>
            </div>

            {hasDeliveryLocation ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-green-50 p-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-green-800">
                    Latitude: {order.delivery_partner?.latitude} • Longitude:{" "}
                    {order.delivery_partner?.longitude}
                  </p>
                  {distanceMeters != null && (
                    <span className="text-xs font-bold text-green-900 bg-green-200/80 px-2.5 py-1 rounded-full">
                      ~{distanceMeters}m to hostel
                    </span>
                  )}
                </div>

                <a
                  href={`https://www.google.com/maps?q=${order.delivery_partner?.latitude},${order.delivery_partner?.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 shadow-sm"
                >
                  <Navigation className="h-4 w-4" />
                  <span>Open in Google Maps</span>
                </a>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-orange-50 p-5">
                <p className="font-semibold text-orange-800">
                  Waiting for delivery partner location...
                </p>

                <p className="mt-1 text-sm text-orange-700">
                  This page automatically refreshes every 5 seconds.
                </p>
              </div>
            )}
          </section>
        )}

      {/* ========================================================= */}
      {/* OTP */}
      {/* ========================================================= */}
      {order.status === "Out for Delivery" && (
        <CustomerOtpCard
          otp={order.delivery_otp}
          verified={order.otp_verified}
          variant="detailed"
          className="mt-8"
        />
      )}
    </>
  );
}

export default DeliverySection;
