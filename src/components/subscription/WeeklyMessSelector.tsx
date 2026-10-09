"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Utensils,
  Bike,
  Sparkles,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Building2,
  ArrowRight,
  TrendingDown,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  calculateWeeklyPlanPrice,
  type WeeklyMessPlanPricingResult,
} from "@/lib/subscriptionDomain";
import type { MealType, PlanType, DeliveryPreference, Subscription } from "@/types";
import { createSubscription } from "@/services/subscriptionService";

export interface WeeklyMessSelectorProps {
  restaurantEmail: string;
  restaurantName?: string;
  onSubscriptionCreated?: (sub: Subscription) => void;
  isLoggedIn?: boolean;
}

export const CAMPUS_HOSTEL_BLOCKS = [
  "Hostel Block A (North Campus)",
  "Hostel Block B (North Campus)",
  "Hostel Block C (South Campus)",
  "Aryabhatta Hall (East Wing)",
  "Ramanujan Hall (West Wing)",
  "Sarabhai Research Hostel",
  "Kalpana Chawla Girls Hostel",
  "PG & Doctoral Residence",
];

export function WeeklyMessSelector({
  restaurantEmail,
  restaurantName = "Campus Central Mess",
  onSubscriptionCreated,
  isLoggedIn = true,
}: WeeklyMessSelectorProps) {
  const [planType, setPlanType] = useState<"WEEKLY" | "MONTHLY">("WEEKLY");
  const [fulfillment, setFulfillment] = useState<"DINE_IN" | "HOSTEL_LOBBY_DELIVERY">("DINE_IN");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [hostelBlock, setHostelBlock] = useState(CAMPUS_HOSTEL_BLOCKS[0]);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [busy, setBusy] = useState(false);

  const pricing: WeeklyMessPlanPricingResult = calculateWeeklyPlanPrice({
    planType,
    mealType,
    deliveryPreference: fulfillment,
    baseMealPrice: 80.0,
  });

  const handlePurchase = async () => {
    if (!isLoggedIn) {
      toast.error("Please log in to purchase a mess subscription");
      return;
    }
    if (!startDate) {
      toast.error("Please select a start date");
      return;
    }
    if (fulfillment === "HOSTEL_LOBBY_DELIVERY" && !hostelBlock) {
      toast.error("Please select your hostel block for lobby delivery");
      return;
    }

    setBusy(true);
    try {
      const created = await createSubscription({
        restaurant_email: restaurantEmail,
        subscription_type: planType.toLowerCase() as "weekly" | "monthly",
        plan_type: planType,
        delivery_preference: fulfillment,
        meal_type: mealType,
        start_date: startDate,
        delivery_days: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ],
        price: pricing.totalPrice,
        base_meal_price: pricing.baseMealPrice,
        meals_count: pricing.mealsCount,
        delivery_addon: pricing.deliveryAddon,
        platform_fee: pricing.platformFee,
        hostel_block: fulfillment === "HOSTEL_LOBBY_DELIVERY" ? hostelBlock : undefined,
        payment_status: "paid",
        auto_renew: false,
      });

      toast.success(
        `🎉 ${planType === "WEEKLY" ? "Weekly 7-Day" : "Monthly 30-Day"} Mess Pass activated successfully!`
      );

      if (onSubscriptionCreated) {
        onSubscriptionCreated(created);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to activate subscription");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-md space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-black tracking-wide text-orange-700 uppercase">
              <Sparkles className="h-3 w-3" />
              Direct Mess Engine
            </span>
            <span className="text-xs font-semibold text-stone-500">
              • {restaurantName}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Flexible Student Mess Subscriptions
          </h2>
          <p className="text-xs text-stone-500">
            Guaranteed daily hot meals with ₹0 counter wait or batched hostel lobby drop.
          </p>
        </div>

        {pricing.estimatedSavings > 0 && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 px-3.5 py-2 text-emerald-800 shadow-xs">
            <TrendingDown className="h-4 w-4 text-emerald-600 shrink-0" />
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                Estimated Savings
              </span>
              <span className="text-xs font-black text-emerald-950">
                Save ~₹{pricing.estimatedSavings}/pass
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 1. Plan Type Selector Tabs */}
      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-wider text-stone-600 block">
          1. Select Validity Plan
        </label>
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-stone-100/80 rounded-2xl max-w-md">
          <button
            type="button"
            data-testid="tab-weekly"
            onClick={() => setPlanType("WEEKLY")}
            className={`flex flex-col items-center justify-center py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              planType === "WEEKLY"
                ? "bg-white text-stone-900 shadow-sm border border-stone-200/80"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <span className="text-sm font-extrabold">Weekly 7-Day Pass</span>
            <span className="text-[10px] text-stone-500 font-medium">7 – 14 Meals • Most Flexible</span>
          </button>

          <button
            type="button"
            data-testid="tab-monthly"
            onClick={() => setPlanType("MONTHLY")}
            className={`flex flex-col items-center justify-center py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              planType === "MONTHLY"
                ? "bg-white text-stone-900 shadow-sm border border-stone-200/80"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <span className="text-sm font-extrabold">Monthly 30-Day Pass</span>
            <span className="text-[10px] text-stone-500 font-medium">30 – 60 Meals • Maximum Savings</span>
          </button>
        </div>
      </div>

      {/* 2. Fulfillment Preference */}
      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-wider text-stone-600 block">
          2. Fulfillment Preference
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            data-testid="pref-dine-in"
            onClick={() => setFulfillment("DINE_IN")}
            className={`text-left flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              fulfillment === "DINE_IN"
                ? "border-orange-500 bg-orange-50/40 text-stone-900 shadow-xs"
                : "border-stone-200 hover:border-stone-300 text-stone-700 bg-white"
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                fulfillment === "DINE_IN"
                  ? "bg-orange-500 text-white"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              <Utensils className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-stone-900">
                  🚶 Walk-in Mess Hall
                </span>
                <span className="text-xs font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  ₹0 Delivery
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Scan QR or 4-digit token at the counter. Hot unlimited thali buffet.
              </p>
            </div>
          </button>

          <button
            type="button"
            data-testid="pref-hostel-delivery"
            onClick={() => setFulfillment("HOSTEL_LOBBY_DELIVERY")}
            className={`text-left flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              fulfillment === "HOSTEL_LOBBY_DELIVERY"
                ? "border-orange-500 bg-orange-50/40 text-stone-900 shadow-xs"
                : "border-stone-200 hover:border-stone-300 text-stone-700 bg-white"
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                fulfillment === "HOSTEL_LOBBY_DELIVERY"
                  ? "bg-orange-500 text-white"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              <Bike className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-stone-900">
                  🛵 Hostel Lobby Drop
                </span>
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                  +₹15/meal
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Guaranteed courier delivery to your hostel lobby gate at fixed wave times.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Hostel Block Dropdown (if Hostel Delivery) */}
      {fulfillment === "HOSTEL_LOBBY_DELIVERY" && (
        <div className="animate-in fade-in slide-in-from-top-2 rounded-2xl bg-amber-500/10 border border-amber-300/80 p-4 space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span>Select Hostel Drop Location</span>
          </label>
          <select
            data-testid="select-hostel-block"
            value={hostelBlock}
            onChange={(e) => setHostelBlock(e.target.value)}
            className="w-full h-11 rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {CAMPUS_HOSTEL_BLOCKS.map((block) => (
              <option key={block} value={block}>
                {block}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-amber-800 font-medium">
            📦 Your meals will arrive with the scheduled campus hostel wave dispatch (Lunch 1:00 PM / Dinner 8:30 PM).
          </p>
        </div>
      )}

      {/* 3. Meal Slot & Start Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-stone-600 block">
            3. Meal Window
          </label>
          <div className="flex gap-2">
            {[
              { id: "lunch", label: "Lunch (12-3 PM)" },
              { id: "dinner", label: "Dinner (7:30-10 PM)" },
              { id: "combo", label: "Both (Combo)" },
            ].map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setMealType(slot.id as MealType)}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  mealType === slot.id
                    ? "bg-stone-900 text-white border-stone-900"
                    : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-stone-600 block">
            4. Start Date
          </label>
          <input
            type="date"
            data-testid="input-start-date"
            value={startDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full h-10 rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* 4. Loss-Proof Transparent Pricing Breakdown */}
      <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 via-stone-50 to-orange-50/30 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
          <span className="text-xs font-black uppercase tracking-wider text-stone-700">
            📊 Transparent Cost Breakdown
          </span>
          <span className="text-xs font-bold text-stone-500">
            {pricing.mealsCount} Total Meals ({planType === "WEEKLY" ? "7 Days" : "30 Days"})
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>Base Food Cost (₹{pricing.baseMealPrice} × {pricing.mealsCount} meals)</span>
            <span className="font-semibold text-stone-900">₹{pricing.baseFoodTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-stone-600">
            <span>
              Batched Hostel Delivery Add-on ({fulfillment === "HOSTEL_LOBBY_DELIVERY" ? `₹15 × ${pricing.mealsCount}` : "Walk-in"})
            </span>
            <span className="font-semibold text-stone-900">
              {pricing.deliveryAddon > 0 ? `+₹${pricing.deliveryAddon.toFixed(2)}` : "₹0.00"}
            </span>
          </div>

          <div className="flex justify-between text-stone-600">
            <span>Platform Convenience & Safety Fee</span>
            <span className="font-semibold text-stone-900">+₹{pricing.platformFee.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-stone-200/80 pt-3">
          <div>
            <span className="text-xs font-bold text-stone-500 block">Total Payable</span>
            <span data-testid="pricing-total-display" className="text-2xl font-black text-stone-950 font-mono">
              ₹{pricing.totalPrice.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-xl">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Loss-Proof Fixed Price</span>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <Button
        type="button"
        data-testid="btn-activate-pass"
        onClick={handlePurchase}
        disabled={busy}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-base shadow-lg shadow-orange-950/20 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <span>{busy ? "Activating Pass..." : `⚡ Get ${planType === "WEEKLY" ? "Weekly" : "Monthly"} Mess Pass (₹${pricing.totalPrice})`}</span>
        <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

export default WeeklyMessSelector;
