import React from "react";
import Image from "next/image";
import Link from "next/link";

import type { Order, OrderOtp } from "@/types/orders";
import { isActiveStatus } from "@/lib/orderDomain";
import { formatOrderDate } from "@/lib/formatters";

import { formatPaymentMethod } from "@/lib/paymentLabels";
import { ROUTES, orderDetailsPath, trackOrderPath } from "@/lib/routes";


import dynamic from "next/dynamic";
import OrderNotification from "@/components/notifications/OrderNotification";
import LiveDeliveryNotification from "@/components/notifications/LiveDeliveryNotification";
import OrderTimeline from "@/components/orders/OrderTimeline";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  CustomerOtpCard,
  DeliveryPartnerCard,
} from "@/components/common";

const ReviewModal = dynamic(
  () => import("@/components/reviews/ReviewModal"),
  { ssr: false }
);

export type OrderCardProps = {
  order: Order;
  orderOtp?: OrderOtp;
  onRefreshOrders?: () => void;
};

export function OrderCard({
  order,
  orderOtp,
  onRefreshOrders,
}: OrderCardProps) {
  const active = isActiveStatus(order.status);
  const restaurantName = order.restaurant_name ?? "Campus Restaurant";
  const restaurantCuisine = order.restaurant_cuisine ?? "Campus Dining";

  const itemCount = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <OrderNotification status={order.status} />
      <LiveDeliveryNotification status={order.status} />

      {/* Order Header */}
      <div className="border-b border-gray-100 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {order.restaurant_image ? (
              <Image
                src={order.restaurant_image}
                alt={restaurantName}
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                unoptimized={order.restaurant_image.startsWith("http")}
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-2xl">
                🍽️
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold text-gray-900">
                  {restaurantName}
                </h2>

                <OrderStatusBadge status={order.status} />
              </div>

              <p className="mt-1 text-sm text-gray-500">
                {restaurantCuisine}
              </p>

              <p className="mt-0.5 truncate text-xs text-gray-400">
                {order.restaurant_email}
              </p>
            </div>
          </div>

          <div className="shrink-0 sm:text-right">
            <p className="text-xs font-medium text-gray-400">Order #</p>
            <p className="font-bold text-gray-900">
              {order._id.slice(-8).toUpperCase()}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Placed {formatOrderDate(order.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-4 p-5 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2">
          <h3 className="mb-3 font-bold text-gray-900">Ordered Items</h3>

          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={44}
                      height={44}
                      className="h-11 w-11 shrink-0 rounded-xl object-cover"
                      unoptimized={item.image.startsWith("http")}
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-lg">
                      🍴
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {item.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      ₹{item.price} × {item.quantity}
                    </p>
                  </div>
                </div>

                <p className="shrink-0 font-semibold text-gray-900">
                  ₹{item.price * item.quantity}
                </p>
              </div>
            ))}
          </div>

          {/* Timeline */}
          {active && (
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <OrderTimeline status={order.status} />
            </div>
          )}

          {/* Delivery Partner */}
          {order.delivery_partner && (
            <div className="mt-4">
              <DeliveryPartnerCard
                name={order.delivery_partner.name}
                phone={order.delivery_partner.phone}
                vehicle={order.delivery_partner.vehicle}
                showCallButton={false}
                trackOrderHref={
                  order.status === "Out for Delivery"
                    ? `/track-order/${order._id}`
                    : undefined
                }
              />

              {/* OTP */}
              {!orderOtp?.verified &&
                (order.status === "Picked Up" ||
                  order.status === "Out for Delivery") &&
                orderOtp?.otp && (
                  <CustomerOtpCard
                    otp={orderOtp.otp}
                    verified={orderOtp.verified}
                    className="mt-4"
                  />
                )}
            </div>
          )}

          {/* Review */}
          {order.status === "Delivered" &&
            !order.review_submitted && (
              <div className="mt-4">
                <ReviewModal
                  orderId={order._id}
                  restaurantEmail={order.restaurant_email}
                  deliveryPartnerPhone={
                    order.delivery_partner?.phone || ""
                  }
                  customerName={order.customer_name}
                  onSuccess={onRefreshOrders}
                />
              </div>
            )}

          {order.status === "Delivered" &&
            order.review_submitted && (
              <div className="mt-4 rounded-xl border border-green-200 bg-white p-4 text-center">
                <h3 className="font-bold text-green-700">⭐ Thank You!</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Your review has been submitted successfully.
                </p>
              </div>
            )}
        </div>

        {/* Summary */}
        <aside className="rounded-2xl bg-gray-50 p-5">
          <h3 className="font-bold text-gray-900">Order Summary</h3>

          <div className="mt-4 space-y-3 text-sm">
            {/* Payment */}
            <div className="flex items-start justify-between gap-4">
              <span className="text-gray-500">Payment</span>

              <span className="text-right font-medium text-gray-800">
                {formatPaymentMethod(order.payment_method)}
                <PaymentStatusBadge
                  status={order.payment_status}
                  method={order.payment_method}
                  className="mt-1 block text-[11px]"
                />
              </span>
            </div>

            {/* Items */}
            <div className="flex justify-between">
              <span className="text-gray-500">Items</span>
              <span className="font-medium text-gray-800">
                {itemCount}
              </span>
            </div>

            {/* Total */}
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-orange-600">₹{order.total}</span>
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="mt-5 border-t pt-5">
            <p className="text-sm font-semibold text-gray-700">
              Delivering to
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {order.customer_name}
            </p>
            <p className="text-sm text-gray-500">{order.phone}</p>
            <p className="mt-2 line-clamp-2 break-words text-sm text-gray-500">
              {order.address}
            </p>
          </div>
        </aside>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 border-t border-gray-100 p-5 sm:flex-row sm:justify-end">
        <Link
          href={orderDetailsPath(order._id)}
          className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-center text-sm font-semibold text-gray-700 transition hover:border-orange-300 hover:text-orange-600"
        >
          View Details
        </Link>

        {active && (
          <Link
            href={trackOrderPath(order._id)}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            📍 Track Order
          </Link>
        )}

        {order.status === "Delivered" && (
          <Link
            href={ROUTES.RESTAURANTS}
            className="rounded-xl bg-orange-500 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Order Again
          </Link>
        )}
      </div>

    </article>
  );
}
