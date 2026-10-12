import React from "react";
import Image from "next/image";
import type { Order } from "@/types/orders";
import { OrderStatusBadge } from "@/components/common";

const statusTitleMap: Record<string, string> = {
  Pending: "Order Received",
  Accepted: "Order Accepted",
  Preparing: "Preparing Your Food",
  "Ready for Pickup": "Ready for Pickup",
  Assigned: "Delivery Partner Assigned",
  "Picked Up": "Order Picked Up",
  "Out for Delivery": "Out for Delivery",
  Delivered: "Order Delivered",
  Cancelled: "Order Cancelled",
  Rejected: "Order Rejected",
};

const statusSubtitleMap: Record<string, string> = {
  Pending: "Waiting for the restaurant to confirm your order.",
  Accepted: "The kitchen has accepted your order and will start cooking soon.",
  Preparing: "Your food is being freshly prepared on campus.",
  "Ready for Pickup": "Your order is packed and ready for pickup.",
  Assigned: "A rider has been assigned to bring your food.",
  "Picked Up": "Your rider has collected your meal from the counter.",
  "Out for Delivery": "Your courier is on the way with your food.",
  Delivered: "Your order has been delivered. Enjoy your meal!",
  Cancelled: "This order has been cancelled.",
  Rejected: "The restaurant was unable to accept this order.",
};

function formatStatusLabel(status?: string): string {
  if (!status) return "In Progress";
  return status;
}

export type OrderHeaderProps = {
  order: Order;
  isCancelled: boolean;
  isDelivered: boolean;
  estimatedDelivery: string;
  showRestaurantMap: boolean;
  hasRestaurantLocation: boolean;
};

export function OrderHeader({
  order,
  isCancelled,
  isDelivered,
  estimatedDelivery,
  showRestaurantMap,
  hasRestaurantLocation,
}: OrderHeaderProps) {
  const restaurant =
    order.restaurant_info ||
    (order as unknown as { restaurant?: Record<string, unknown> })?.restaurant ||
    {};
  const restaurantName =
    (restaurant as { name?: string })?.name || order.restaurant_name || "Campus Canteen";
  const restaurantImage = order.restaurant_image;
  const restaurantAddress =
    (restaurant as { address?: string })?.address ||
    (restaurant as { stall_location?: string })?.stall_location ||
    order.address?.split(",")[0]?.trim() ||
    "Zeal College Campus, Narhe";
  const restaurantPhone =
    (restaurant as { phone?: string })?.phone || order.restaurant_phone;
  const restaurantLat =
    (restaurant as { latitude?: number })?.latitude ?? order.restaurant_latitude ?? 18.4485;
  const restaurantLng =
    (restaurant as { longitude?: number })?.longitude ?? order.restaurant_longitude ?? 73.8242;
  const hasMapCoords =
    restaurantLat != null &&
    restaurantLng != null &&
    !isNaN(Number(restaurantLat)) &&
    !isNaN(Number(restaurantLng));

  const rawOrderId = order.id || order._id || "";
  const orderIdShort = rawOrderId ? rawOrderId.slice(-6).toUpperCase() : "ORDER";
  const handoverOtp = order.handover_otp ?? order.delivery_otp;

  return (
    <>
      {/* ========================================================= */}
      {/* REFINED MODERN ORDER HERO */}
      {/* ========================================================= */}
      <div className="mt-6 w-full rounded-3xl bg-zinc-900 text-white p-5 shadow-lg border border-zinc-800 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-orange-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          {/* Top Meta: Live status pulse & Back link */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-2.5 py-1 text-[11px] font-medium text-zinc-300 border border-zinc-700/60 backdrop-blur-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Tracking
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">
              #{orderIdShort}
            </span>
          </div>

          {/* Title & Estimated Time */}
          <div className="mt-3">
            <h1 className="text-xl font-bold tracking-tight text-white">
              {statusTitleMap[order.status] || (isCancelled ? "Order Cancelled" : isDelivered ? "Order Delivered" : "Order in Progress")}
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              {statusSubtitleMap[order.status] || "Your food is being freshly prepared on campus."}
            </p>
          </div>

          {/* Elegant Unified Status Pill */}
          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-1 text-xs font-semibold">
                <span>⏱️</span>
                <span>{formatStatusLabel(order.status)}</span>
              </span>
              {estimatedDelivery && (
                <span className="text-xs text-zinc-400 font-medium">
                  ETA: <span className="text-zinc-200 font-semibold">{estimatedDelivery}</span>
                </span>
              )}
            </div>

            {handoverOtp && (
              <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-600/40 rounded-lg px-2.5 py-1 text-xs">
                <span className="text-zinc-400 text-[10px] font-semibold uppercase">OTP</span>
                <span className="font-mono font-bold tracking-widest text-emerald-400">{handoverOtp}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* IMMEDIATE PICKUP SPOT CARD */}
      {/* ========================================================= */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-orange-200 bg-gradient-to-r from-orange-50/90 via-white to-amber-50/80 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-2xl text-white shadow-sm">
              📍
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                Pickup Spot
              </div>
              <h3 className="mt-1 text-xl font-bold text-gray-900">
                {restaurantName}
              </h3>
              <p className="mt-0.5 text-sm text-gray-600">
                {restaurantAddress}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasMapCoords && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${restaurantLat},${restaurantLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-500 active:scale-95"
              >
                📍 View Restaurant on Map
              </a>
            )}
            {restaurantPhone && (
              <a
                href={`tel:${restaurantPhone}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                📞 Call Eatery
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* RESTAURANT DETAILS CARD */}
      {/* ========================================================= */}
      <section className="mt-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-4">
          {restaurantImage ? (
            <Image
              src={restaurantImage}
              alt={restaurantName}
              width={72}
              height={72}
              className="h-[72px] w-[72px] rounded-2xl object-cover"
              unoptimized={restaurantImage.startsWith("http")}
            />
          ) : (
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-3xl">
              🍽️
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-500">Restaurant</p>

            <h2 className="text-2xl font-bold text-gray-900">
              {restaurantName}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {order.restaurant_cuisine || "Campus Area"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Location</p>
            <p className="mt-1 font-semibold text-gray-900">
              {restaurantAddress}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Restaurant Email</p>
            <p className="mt-1 break-all font-semibold text-gray-900">
              {order.restaurant_email}
            </p>
          </div>
        </div>

        {restaurantPhone && (
          <a
            href={`tel:${restaurantPhone}`}
            className="mt-4 inline-block rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            📞 Call Restaurant
          </a>
        )}

        {/* Embedded Restaurant Map */}
        {(showRestaurantMap || hasMapCoords) && !isDelivered && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-gray-900">
              Restaurant Map View
            </h3>

            {hasMapCoords ? (
              <>
                <div className="mt-3 overflow-hidden rounded-2xl border">
                  <iframe
                    title="Restaurant Location"
                    width="100%"
                    height="320"
                    loading="lazy"
                    className="border-0"
                    src={`https://maps.google.com/maps?q=${restaurantLat},${restaurantLng}&z=15&output=embed`}
                  />
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${restaurantLat},${restaurantLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Open in Google Maps
                </a>
              </>
            ) : (
              <div className="mt-3 rounded-2xl bg-orange-50 p-5">
                <p className="font-semibold text-orange-800">
                  Restaurant location coordinates are not available yet.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
