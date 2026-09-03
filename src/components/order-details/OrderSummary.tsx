import React from "react";
import type { Order } from "@/types/orders";
import { formatPaymentMethod } from "@/lib/paymentLabels";
import { PaymentStatusBadge } from "@/components/common";

export type OrderSummaryProps = {
  order: Order;
};

export function OrderSummary({ order }: OrderSummaryProps) {
  const isCash = order.payment_method?.toLowerCase().includes("cash");

  return (
    <section className="mt-8 grid gap-8 lg:grid-cols-2">
      {/* Delivery Address */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-xl">
            📍
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Delivery Address
            </h2>

            <p className="text-sm text-gray-500">
              Where your order will be delivered.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-gray-50 p-5">
          <p className="font-bold text-gray-900">
            {order.customer_name}
          </p>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            {order.address}
          </p>

          <p className="mt-3 text-sm font-medium text-gray-700">
            📞 {order.phone}
          </p>
        </div>
      </div>

      {/* Payment */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-xl">
            {isCash ? "💵" : "💳"}
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">Payment</h2>

            <p className="text-sm text-gray-500">
              Payment information for this order.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
            <div>
              <p className="text-xs text-gray-500">Payment Method</p>

              <p className="mt-1 font-bold text-gray-900">
                {formatPaymentMethod(order.payment_method)}
              </p>
            </div>

            <span className="text-2xl">{isCash ? "💵" : "💳"}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Payment Status</span>

            <PaymentStatusBadge
              status={order.payment_status}
              method={order.payment_method}
              orderStatus={order.status}
              className="px-3 py-1 text-xs font-bold"
            />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900">Total</span>

              <span className="text-2xl font-extrabold text-orange-600">
                ₹{order.total}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
