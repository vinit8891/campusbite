import React from "react";
import Image from "next/image";
import type { Order } from "@/types/orders";
import { OrderStatusBadge } from "@/components/common";

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
  const restaurantName =
    order.restaurant_info?.name || order.restaurant_name || "Restaurant";
  const restaurantImage = order.restaurant_image;
  const restaurantAddress =
    order.restaurant_info?.address ||
    order.address?.split(",")[0]?.trim() ||
    "Campus Eatery";
  const restaurantPhone =
    order.restaurant_info?.phone || order.restaurant_phone;
  const restaurantLat =
    order.restaurant_info?.latitude ?? order.restaurant_latitude;
  const restaurantLng =
    order.restaurant_info?.longitude ?? order.restaurant_longitude;
  const hasMapCoords =
    restaurantLat != null &&
    restaurantLng != null &&
    !isNaN(Number(restaurantLat)) &&
    !isNaN(Number(restaurantLng));

  return (
    <>
      {/* ========================================================= */}
      {/* PREMIUM ORDER HERO */}
      {/* ========================================================= */}
      <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-4xl shadow-inner">
              🍽️
            </div>

            <div>
              <p className="text-sm font-medium text-orange-100">
                {isCancelled
                  ? "Order Cancelled"
                  : isDelivered
                  ? "Order Delivered"
                  : "Order Confirmed"}
              </p>

              <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                #{order._id.slice(-8)}
              </h1>

              {order.created_at && (
                <p suppressHydrationWarning className="mt-2 text-sm text-orange-100">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm sm:min-w-[210px]">
            <p className="text-sm text-orange-100">Estimated Delivery</p>

            <p className="mt-1 text-2xl font-extrabold">
              {estimatedDelivery}
            </p>

            <div className="mt-3">
              <OrderStatusBadge status={order.status} />
            </div>
          </div>
        </div>
      </section>

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
                href={`https://maps.google.com/?q=${restaurantLat},${restaurantLng}`}
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
                  href={`https://maps.google.com/?q=${restaurantLat},${restaurantLng}`}
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
