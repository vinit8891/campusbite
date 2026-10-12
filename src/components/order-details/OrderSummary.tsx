import React from "react";
import type { Order } from "@/types/orders";
import { formatPaymentMethod } from "@/lib/paymentLabels";
import { formatINR } from "@/lib/formatters";
import { PaymentStatusBadge } from "@/components/common";
import { calculateCodRounding } from "@/lib/pricingEngine";

export type OrderSummaryProps = {
  order: Order;
};

export function OrderSummary({ order }: OrderSummaryProps) {
  const isCash =
    order.payment_method?.toLowerCase().includes("cash") ||
    order.payment_method?.toUpperCase() === "COD";

  // Calculate subtotal dynamically from items if order.items_subtotal is mismatched
  const computedSubtotal =
    Array.isArray(order?.items) && order.items.length > 0
      ? order.items.reduce(
          (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
          0
        )
      : Number(order?.items_subtotal || 0);

  const breakdown = order.pricing_breakdown as
    | {
        appSubtotal?: number;
        food_subtotal?: number;
        gstAmount?: number;
        restaurant_gst?: number;
        platformTechFee?: number;
        platform_fee?: number;
        deliveryFee?: number;
        delivery_fee?: number;
        tip_amount?: number;
      }
    | undefined;

  const subtotal = computedSubtotal;

  const gst =
    order?.gst != null
      ? Number(order.gst)
      : breakdown?.gstAmount ??
        breakdown?.restaurant_gst ??
        Number((subtotal * 0.05).toFixed(2));

  const isTakeaway = order.delivery_type === "COUNTER_TAKEAWAY";
  const techFee =
    order?.platform_fee != null
      ? Number(order.platform_fee)
      : breakdown?.platformTechFee ??
        breakdown?.platform_fee ??
        (isTakeaway ? 2.0 : 3.0);

  const deliveryFee =
    order?.delivery_fee != null
      ? Number(order.delivery_fee)
      : breakdown?.deliveryFee ??
        breakdown?.delivery_fee ??
        (isTakeaway
          ? 0.0
          : order.delivery_type === "EXPRESS_DOOR" ||
            order.delivery_type === "STANDARD"
          ? 40.0
          : 15.0);

  const tip = Number(order.tip_amount ?? breakdown?.tip_amount ?? 0);
  const discountAmount = Number(order.discount_amount ?? 0);

  const theoreticalTotal = Number(
    (subtotal + gst + techFee + deliveryFee + tip - discountAmount).toFixed(2)
  );

  const codInfo = isCash ? calculateCodRounding(theoreticalTotal) : null;
  const finalTotal =
    order.total ?? order.total_amount ?? (codInfo ? codInfo.roundedTotal : theoreticalTotal);

  // Delivery type badge label
  const deliveryTypeLabel =
    order.delivery_type === "COUNTER_TAKEAWAY"
      ? "🎒 Counter Takeaway"
      : order.delivery_type === "EXPRESS_DOOR" ||
        order.delivery_type === "STANDARD"
      ? "🚀 Express Direct Room Delivery"
      : "🏫 Campus Hostel Batch Drop";

  return (
    <section className="mt-8 grid gap-8 lg:grid-cols-2">
      {/* Delivery Destination */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-xl">
                📍
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Delivery Destination
                </h2>

                <p className="text-xs text-gray-500">
                  Hostel / PG & Room details
                </p>
              </div>
            </div>

            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 border border-orange-200">
              {deliveryTypeLabel}
            </span>
          </div>

          <div className="mt-6 rounded-2xl bg-gray-50 p-5 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Recipient
              </p>
              <p className="mt-0.5 font-bold text-gray-900">
                {order.customer_name}
              </p>
            </div>

            {order.hostel_block && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Campus Block / PG Hub
                </p>
                <p className="mt-0.5 text-sm font-semibold text-orange-600">
                  🏢 {order.hostel_block}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Room / Flat / Address
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-gray-700 font-medium">
                {order.address}
              </p>
            </div>

            <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-xs text-gray-600">
              <span className="font-medium">📞 Contact Phone:</span>
              <span className="font-bold text-gray-900">{order.phone}</span>
            </div>
          </div>
        </div>

        {/* Order Receipt Meta */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <div>
            <span className="font-semibold text-gray-700">Receipt ID: </span>
            <span className="font-mono text-gray-900 font-bold">#{order._id}</span>
          </div>
          {order.created_at && (
            <div>
              <span className="font-semibold text-gray-700">Ordered: </span>
              <span suppressHydrationWarning>{new Date(order.created_at).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment & Bill Breakdown */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100 text-xl">
                {isCash ? "💵" : "💳"}
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">Payment Breakdown</h2>

                <p className="text-xs text-gray-500">
                  Itemized statutory & fee details
                </p>
              </div>
            </div>

            <PaymentStatusBadge
              status={order.payment_status}
              method={order.payment_method}
              orderStatus={order.status}
              className="px-3 py-1 text-xs font-bold"
            />
          </div>

          <div className="mt-6 space-y-3">
            {/* Payment Method Line */}
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2.5 text-sm">
              <span className="text-xs font-medium text-gray-500">Payment Method</span>
              <span className="font-bold text-gray-900">
                {formatPaymentMethod(order.payment_method)}
              </span>
            </div>

            {/* Bill Line Items */}
            <div className="space-y-2 pt-2 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Items Subtotal</span>
                <span className="font-semibold text-gray-900">₹{formatINR(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Food GST (5%)</span>
                <span className="font-medium text-gray-800">₹{formatINR(gst)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Platform Tech Fee</span>
                <span className="font-medium text-gray-800">₹{formatINR(techFee)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Delivery Fee</span>
                <span className="font-medium text-gray-800">
                  {deliveryFee === 0 ? "FREE" : `₹${formatINR(deliveryFee)}`}
                </span>
              </div>

              {tip > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-600 font-medium">
                  <span>Courier Tip</span>
                  <span>₹{formatINR(tip)}</span>
                </div>
              )}

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-600 font-medium">
                  <span>Coupon Discount</span>
                  <span>-₹{formatINR(discountAmount)}</span>
                </div>
              )}

              {codInfo && codInfo.roundOff !== 0 && (
                <div className="flex items-center justify-between text-xs text-amber-700 font-medium bg-amber-50/70 px-2.5 py-1 rounded-lg">
                  <span>COD Cash Round Off</span>
                  <span>
                    {codInfo.roundOff > 0
                      ? `+₹${formatINR(codInfo.roundOff)}`
                      : `-₹${formatINR(Math.abs(codInfo.roundOff))}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-base font-bold text-gray-900">Total Paid</span>
              <p className="text-xs text-gray-400">Inclusive of all taxes & fees</p>
            </div>

            <span className="text-2xl font-black text-orange-600">
              ₹{formatINR(finalTotal)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

