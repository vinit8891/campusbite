"use client";

import React, { useEffect } from "react";
import { X, Store, User, MapPin, Receipt, Bike, ShoppingBag, ShieldCheck } from "lucide-react";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/common";
import { formatAdminDate } from "@/lib/adminFormat";
import { formatPaymentMethod } from "@/lib/paymentLabels";
import { shortId } from "@/lib/formatters";
import type { AdminOrder } from "@/services/adminService";
import type { OrderPricingBreakdown, PricingBreakdown } from "@/types";

export interface AdminOrderDetailsModalProps {
  isOpen: boolean;
  order: AdminOrder | null;
  onClose: () => void;
}

export function AdminOrderDetailsModal({
  isOpen,
  order,
  onClose,
}: AdminOrderDetailsModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  // Determine fulfillment type
  const rawType = (
    order.order_type ||
    order.delivery_type ||
    order.delivery_for ||
    ""
  ).toUpperCase();
  const isTakeaway =
    rawType.includes("TAKEAWAY") ||
    rawType.includes("PICKUP") ||
    rawType.includes("COUNTER");
  const fulfillmentType = isTakeaway ? "TAKEAWAY" : "DELIVERY";

  // Financial components
  const items = order.items || [];
  const foodSubtotal =
    order.food_subtotal ??
    (items.length > 0
      ? items.reduce(
          (acc, it) => acc + Number(it.price || 0) * Number(it.quantity || 1),
          0
        )
      : Number(order.total ?? 0));

  const pb = order.pricing_breakdown as
    | (OrderPricingBreakdown & PricingBreakdown)
    | undefined;

  const smallOrderFee = Number(
    order.small_order_fee ??
      pb?.small_order_fee ??
      pb?.smallOrderFee ??
      0
  );
  const platformFee = Number(
    order.platform_fee ??
      pb?.platform_fee ??
      pb?.platformTechFee ??
      (foodSubtotal <= 100 ? 3.0 : 5.0)
  );
  const gst = Number(
    order.restaurant_gst ??
      pb?.restaurant_gst ??
      pb?.gstAmount ??
      Number((foodSubtotal * 0.05).toFixed(2))
  );
  const deliveryFee = isTakeaway
    ? 0.0
    : Number(order.delivery_fee ?? pb?.delivery_fee ?? pb?.deliveryFee ?? 15.0);
  const total = Number(order.total ?? 0);

  // Takeaway exemption check (< ₹35 subtotal)
  const isTakeawayExempt = isTakeaway && foodSubtotal < 35.0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-order-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-stone-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 font-bold">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="admin-order-details-title"
                  className="text-base font-black text-stone-900"
                >
                  Order #{shortId(order._id)}
                </h2>
                <span
                  data-testid="fulfillment-badge"
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide border ${
                    isTakeaway
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-blue-50 text-blue-800 border-blue-200"
                  }`}
                >
                  {isTakeaway ? (
                    <ShoppingBag className="mr-1 h-3 w-3" />
                  ) : (
                    <Bike className="mr-1 h-3 w-3" />
                  )}
                  {fulfillmentType}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Created on {formatAdminDate(order.created_at)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-stone-700">
          {/* Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-stone-50 p-4 border border-stone-100">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Current Status
              </span>
              <div>
                <OrderStatusBadge status={order.status} size="md" />
              </div>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Payment ({formatPaymentMethod(order.payment_method)})
              </span>
              <div>
                <PaymentStatusBadge
                  status={order.payment_status}
                  method={order.payment_method}
                  orderStatus={order.status}
                  size="md"
                />
              </div>
            </div>
          </div>

          {/* Customer & Restaurant Metadata */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Customer Box */}
            <div className="rounded-2xl border border-stone-100 bg-stone-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-xs uppercase tracking-wider">
                <User className="h-4 w-4 text-stone-500" />
                <span>Customer</span>
              </div>
              <div>
                <p className="font-semibold text-stone-900">
                  {order.customer_name || "—"}
                </p>
                {order.customer_email && (
                  <p className="text-xs text-stone-500">{order.customer_email}</p>
                )}
                {(order.phone || order.customer_phone) && (
                  <p className="text-xs text-stone-500 font-mono mt-0.5">
                    📞 {order.phone || order.customer_phone}
                  </p>
                )}
              </div>
            </div>

            {/* Restaurant Box */}
            <div className="rounded-2xl border border-stone-100 bg-stone-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-xs uppercase tracking-wider">
                <Store className="h-4 w-4 text-stone-500" />
                <span>Canteen / Mess</span>
              </div>
              <div>
                <p className="font-semibold text-stone-900">
                  {order.restaurant_name || order.restaurant_email || "—"}
                </p>
                {order.restaurant_email && (
                  <p className="text-xs text-stone-500">
                    {order.restaurant_email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Takeaway Exemption Badge if applicable */}
          {isTakeawayExempt && (
            <div
              data-testid="takeaway-exemption-badge"
              className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs font-semibold text-emerald-900"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Takeaway Exemption (&lt;₹35 Subtotal Allowed)</span>
            </div>
          )}

          {/* Ordered Items Manifest */}
          {items.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Item Manifest ({items.length} {items.length === 1 ? "item" : "items"})
              </h3>
              <div className="rounded-2xl border border-stone-100 divide-y divide-stone-100 overflow-hidden bg-white">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-800">
                        {it.quantity}x
                      </span>
                      <span className="font-medium text-stone-900">
                        {it.name}
                      </span>
                    </div>
                    <span className="font-semibold text-stone-900">
                      ₹{(Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Breakdown & Surcharges */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Financial Breakdown & Surcharges
            </h3>
            <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Food Subtotal</span>
                <span className="font-semibold text-stone-900">
                  ₹{foodSubtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-stone-600">
                <span>Restaurant GST (5%)</span>
                <span className="font-semibold text-stone-900">
                  ₹{gst.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-stone-600">
                <span>
                  Delivery Fee {isTakeaway ? "(Takeaway Waived)" : "(Hostel Delivery)"}
                </span>
                <span className="font-semibold text-stone-900">
                  ₹{deliveryFee.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-stone-600">
                <span>Platform Tech Fee</span>
                <span className="font-semibold text-stone-900">
                  ₹{platformFee.toFixed(2)}
                </span>
              </div>

              {/* Small Order Surcharge */}
              {smallOrderFee > 0 && (
                <div
                  data-testid="small-order-breakdown-row"
                  className="flex justify-between font-semibold text-amber-800 bg-amber-100/60 p-2 rounded-lg border border-amber-200/80"
                >
                  <span className="flex items-center gap-1">
                    <span>⚡ Small Order Surcharge (under ₹50)</span>
                  </span>
                  <span>+₹{smallOrderFee.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-stone-200 pt-2.5 flex justify-between text-sm font-black text-stone-900">
                <span>Grand Total</span>
                <span className="text-base text-emerald-700">
                  ₹{total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-stone-100 bg-stone-50 px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminOrderDetailsModal;
