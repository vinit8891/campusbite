import React from "react";
import Link from "next/link";
import type { Order } from "@/types/orders";
import ReviewModal from "@/components/reviews/ReviewModal";
import { ROUTES, orderDetailsPath, restaurantDetailsPath } from "@/lib/routes";

export type OrderActionsProps = {
  order: Order;
  isPending: boolean;
  isDelivered: boolean;
  isCancelled: boolean;
  onRefreshOrder?: () => void;
};

export function OrderActions({
  order,
  isPending,
  isDelivered,
  isCancelled,
  onRefreshOrder,
}: OrderActionsProps) {
  return (
    <section className="mt-10 flex flex-col gap-3 pb-10 sm:flex-row sm:justify-center">
      {isPending && (
        <button
          type="button"
          className="rounded-full bg-red-600 px-7 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
        >
          Cancel Order
        </button>
      )}

      {!isDelivered && !isCancelled && (
        <Link
          href={orderDetailsPath(order._id)}
          className="rounded-full bg-blue-600 px-7 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Track Order
        </Link>
      )}

      {isDelivered && (
        <>
          <Link
            href={
              order.restaurant_slug
                ? restaurantDetailsPath(order.restaurant_slug)
                : ROUTES.RESTAURANTS
            }
            className="rounded-full bg-orange-500 px-7 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:bg-orange-600"
          >
            Order Again
          </Link>

          {!order.review_submitted ? (
            <ReviewModal
              orderId={order._id}
              restaurantEmail={order.restaurant_email}
              deliveryPartnerPhone={order.delivery_partner?.phone || ""}
              customerName={order.customer_name}
              onSuccess={onRefreshOrder}
            />
          ) : (
            <span className="rounded-full bg-gray-100 px-7 py-3 text-center text-sm font-semibold text-gray-500">
              ✓ Reviewed
            </span>
          )}
        </>
      )}

      <Link
        href={ROUTES.HOME}
        className="rounded-full border border-gray-200 bg-white px-7 py-3 text-center text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-100"
      >
        Back Home
      </Link>
    </section>
  );
}

