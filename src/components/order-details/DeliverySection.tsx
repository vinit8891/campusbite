import React from "react";
import type { Order } from "@/types/orders";
import {
  CustomerOtpCard,
  DeliveryPartnerCard,
} from "@/components/common";

export type DeliverySectionProps = {
  order: Order;
  hasDeliveryLocation: boolean;
};

export function DeliverySection({
  order,
  hasDeliveryLocation,
}: DeliverySectionProps) {
  return (
    <>
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
                <div className="rounded-2xl bg-green-50 p-4">
                  <p className="text-sm font-semibold text-green-800">
                    Latitude: {order.delivery_partner?.latitude} • Longitude:{" "}
                    {order.delivery_partner?.longitude}
                  </p>
                </div>

                <a
                  href={`https://www.google.com/maps?q=${order.delivery_partner?.latitude},${order.delivery_partner?.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  Open in Google Maps
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
