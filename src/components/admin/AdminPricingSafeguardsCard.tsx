"use client";

import React from "react";
import {
  ShieldAlert,
  ShoppingBag,
  Percent,
  Bike,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  MIN_DELIVERY_SUBTOTAL,
  SMALL_CART_THRESHOLD,
  PLATFORM_FEE_STANDARD,
  PLATFORM_FEE_SMALL_CART,
  COMMISSION_RATE,
  RIDER_BASE_PAYOUT,
} from "@/lib/orderPricing";
import { MAX_UNREMITTED_CASH_LIMIT } from "@/services/deliveryPartnerService";

export function AdminPricingSafeguardsCard() {
  const safeguards = [
    {
      id: "min-delivery",
      title: "Minimum Delivery Subtotal",
      value: `₹${MIN_DELIVERY_SUBTOTAL.toFixed(2)}`,
      badge: "Delivery Only",
      badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
      description: "Counter Takeaway exempt. Cart must be at least ₹35.00 for hostel drop-off.",
      icon: ShoppingBag,
      iconClass: "text-blue-600 bg-blue-50",
    },
    {
      id: "platform-tech-fee",
      title: "Platform Tech Fee Tiering",
      value: `₹${PLATFORM_FEE_STANDARD.toFixed(2)} / ₹${PLATFORM_FEE_SMALL_CART.toFixed(2)}`,
      subvalue: `< ₹${SMALL_CART_THRESHOLD.toFixed(0)}: ₹${PLATFORM_FEE_SMALL_CART.toFixed(0)}`,
      badge: "Dynamic Tiering",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
      description: "₹5.00 for small carts (< ₹50.00), ₹3.00 standard (≥ ₹50.00) without separate surcharge lines.",
      icon: Sparkles,
      iconClass: "text-amber-600 bg-amber-50",
    },
    {
      id: "canteen-commission",
      title: "Canteen Commission Rate",
      value: `${(COMMISSION_RATE * 100).toFixed(1)}%`,
      badge: "Standardized Take Rate",
      badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
      description: "Standard 18.0% platform take rate deducted at 9:00 PM consolidated daily UPI settlements.",
      icon: Percent,
      iconClass: "text-orange-600 bg-orange-50",
    },
    {
      id: "rider-payout-cih",
      title: "Rider Base Payout & CIH Limit",
      value: `₹${RIDER_BASE_PAYOUT.toFixed(2)}`,
      subvalue: `CIH Ceiling: ₹${MAX_UNREMITTED_CASH_LIMIT.toFixed(2)}`,
      badge: "Hard Lockout Active",
      badgeClass: "bg-teal-100 text-teal-800 border-teal-200",
      description: "Couriers earn ₹20.00/run + tips. Cash-in-Hand is capped at ₹500.00 before order claiming locks.",
      icon: Bike,
      iconClass: "text-teal-600 bg-teal-50",
    },
  ];

  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-stone-100 bg-gradient-to-r from-stone-50 via-stone-50/50 to-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 shadow-xs">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-stone-900 sm:text-lg">
                Active Platform Pricing Safeguards
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                Live Enforced
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Campus economics rules protecting delivery margins, courier float, and mess settlement accuracy
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Safeguards */}
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
        {safeguards.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-stone-100 bg-stone-50/60 p-5 transition-all hover:border-amber-200 hover:bg-white hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl p-2 ${item.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${item.badgeClass}`}>
                    {item.badge}
                  </span>
                </div>

                <h3 className="mt-4 text-xs font-bold uppercase tracking-wider text-stone-500">
                  {item.title}
                </h3>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-2xl font-black text-stone-900">
                    {item.value}
                  </p>
                  {item.subvalue && (
                    <span className="text-xs font-bold text-stone-600">
                      ({item.subvalue})
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs leading-relaxed text-stone-600">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AdminPricingSafeguardsCard;
