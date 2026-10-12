"use client";

import React from "react";
import type { Order } from "@/types";
import { formatINR } from "@/lib/formatters";

export interface PaymentBreakdownProps {
  order?: Partial<Order> | null;
  className?: string;
}

export function PaymentBreakdown({ order, className = "" }: PaymentBreakdownProps) {
  // Calculate subtotal dynamically from items if order.items_subtotal is mismatched
  const computedSubtotal = Array.isArray(order?.items)
    ? order.items.reduce(
        (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 1),
        0
      )
    : Number(order?.items_subtotal || 0);

  const gst = order?.gst ?? Number((computedSubtotal * 0.05).toFixed(2));
  const platformFee = order?.platform_fee ?? 3.0;
  const deliveryFee = order?.delivery_fee ?? 15.0;
  const grandTotal = computedSubtotal + gst + platformFee + deliveryFee;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm text-zinc-700">
        <span>Items Subtotal</span>
        <span className="font-semibold text-zinc-900">₹{formatINR(computedSubtotal)}</span>
      </div>
      <div className="flex justify-between text-sm text-zinc-600">
        <span>Food GST (5%)</span>
        <span>₹{formatINR(gst)}</span>
      </div>
      <div className="flex justify-between text-sm text-zinc-600">
        <span>Platform Tech Fee</span>
        <span>₹{formatINR(platformFee)}</span>
      </div>
      <div className="flex justify-between text-sm text-zinc-600">
        <span>Delivery Fee</span>
        <span>₹{formatINR(deliveryFee)}</span>
      </div>
      <div className="flex justify-between text-base font-bold pt-2 border-t border-zinc-200 text-zinc-900">
        <span>Total Paid</span>
        <span className="text-orange-600">₹{formatINR(grandTotal)}</span>
      </div>
    </div>
  );
}

export const OrderReceipt = PaymentBreakdown;
export default PaymentBreakdown;
