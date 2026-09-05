"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Utensils,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  CalendarX2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/formatters";
import {
  skipSubscriptionDate,
  type Subscription,
} from "@/services/subscriptionService";

export interface StudentMealPassCardProps {
  subscription: Subscription;
  studentName?: string;
  studentRoll?: string;
  studentPhone?: string;
  canteenName?: string;
  onSubscriptionUpdate?: (updated: Subscription) => void;
  onSubscriptionUpdated?: () => void;
}

// Deterministic 4-digit token generation based on subscription_id and today's date
export function getDailyMealToken(subscriptionId: string, dateStr: string): string {
  let hash = 0;
  const combined = `${subscriptionId}-${dateStr}`;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  const tokenNum = Math.abs(hash % 9000) + 1000;
  return `#${tokenNum}`;
}

export function getTomorrowDateStr(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

export function getServiceWindowStatus(mealType: string, startTime?: string | null, endTime?: string | null) {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  const normalized = mealType.toLowerCase();
  let defaultStart = 12.0; // 12:00 PM
  let defaultEnd = 15.0;   // 3:00 PM
  let mealLabel = "Lunch";

  if (normalized === "breakfast") {
    defaultStart = 7.5;
    defaultEnd = 10.0;
    mealLabel = "Breakfast";
  } else if (normalized === "dinner") {
    defaultStart = 19.5; // 7:30 PM
    defaultEnd = 22.0;   // 10:00 PM
    mealLabel = "Dinner";
  }

  const isServingNow = currentHour >= defaultStart && currentHour <= defaultEnd;
  const isUpcoming = currentHour < defaultStart;

  const windowText = startTime && endTime
    ? `${startTime} – ${endTime}`
    : mealLabel === "Breakfast"
    ? "7:30 AM – 10:00 AM"
    : mealLabel === "Lunch"
    ? "12:00 PM – 3:00 PM"
    : "7:30 PM – 10:00 PM";

  if (isServingNow) {
    return {
      active: true,
      badgeText: `🟢 Active: ${mealLabel} Serving Now (${windowText})`,
      bannerClass: "bg-emerald-500/15 text-emerald-800 border-emerald-300",
    };
  }

  if (isUpcoming) {
    return {
      active: false,
      badgeText: `⏳ Next: ${mealLabel} Starts at ${windowText.split("–")[0].trim()}`,
      bannerClass: "bg-amber-500/15 text-amber-800 border-amber-300",
    };
  }

  return {
    active: false,
    badgeText: `🌙 Service Closed (${mealLabel} was ${windowText})`,
    bannerClass: "bg-stone-100 text-stone-700 border-stone-300",
  };
}

export function StudentMealPassCard({
  subscription,
  studentName = "Student Passholder",
  studentRoll,
  studentPhone = "+91 98765 43210",
  canteenName,
  onSubscriptionUpdate,
  onSubscriptionUpdated,
}: StudentMealPassCardProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = getTomorrowDateStr();
  const token = getDailyMealToken(subscription.subscription_id, todayStr);
  const serviceWindow = getServiceWindowStatus(
    subscription.meal_type,
    subscription.start_time,
    subscription.end_time
  );

  const isTomorrowSkipped = (subscription.skipped_dates || []).includes(tomorrowStr);
  const [skipBusy, setSkipBusy] = useState(false);
  const [confirmSkipOpen, setConfirmSkipOpen] = useState(false);

  const mealName = subscription.meal_type || "Meal";

  const handleSkipTomorrow = async () => {
    setSkipBusy(true);
    try {
      const res = await skipSubscriptionDate(subscription.subscription_id, tomorrowStr);
      toast.success(res.message || `Tomorrow's ${mealName} skipped! Validity extended +1 day 🎉`);
      const updatedSub: Subscription = res.subscription || {
        ...subscription,
        skipped_dates: [...(subscription.skipped_dates || []), tomorrowStr],
      };
      if (onSubscriptionUpdate) {
        onSubscriptionUpdate(updatedSub);
      }
      if (onSubscriptionUpdated) {
        onSubscriptionUpdated();
      }
      setConfirmSkipOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to skip meal");
    } finally {
      setSkipBusy(false);
    }
  };

  const displayCanteen = canteenName || subscription.restaurant_email?.split("@")[0] || "Campus Mess";

  const isVeg =
    !subscription.plan_name?.toLowerCase().includes("non-veg") &&
    !subscription.meal_type?.toLowerCase().includes("non-veg");

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-3xl border-2 border-stone-800/20 bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 text-white shadow-2xl relative">
      {/* Top Banner Accent */}
      <div className="h-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

      <div className="p-6 space-y-6">
        {/* Pass Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-orange-950/60">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-wider uppercase text-amber-400">
                  CampusBite Daily Meal Pass
                </span>
                <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight capitalize truncate max-w-[200px]">
                {subscription.plan_name || `${displayCanteen} • ${subscription.meal_type} Plan`}
              </h2>
            </div>
          </div>

          <div className="text-right flex flex-col items-end gap-1.5">
            <span className="inline-flex items-center rounded-full bg-stone-800/80 px-2.5 py-1 text-[11px] font-extrabold text-stone-300 border border-stone-700">
              {subscription.subscription_type.toUpperCase()}
            </span>
            <span
              data-testid="dietary-badge"
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black border ${
                isVeg
                  ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/40"
                  : "bg-rose-950/60 text-rose-400 border-rose-500/40"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isVeg ? "bg-emerald-400" : "bg-rose-400"}`} />
              <span>{isVeg ? "VEG 🟢" : "NON-VEG 🔴"}</span>
            </span>
          </div>
        </div>

        {/* Live Service Window Status */}
        <div
          data-testid="service-window-badge"
          className={`flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold text-center ${serviceWindow.bannerClass}`}
        >
          <Clock className="h-4 w-4 shrink-0" />
          <span>{serviceWindow.badgeText}</span>
        </div>

        {/* High-Contrast QR Code & Token Box */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-5 text-stone-900 shadow-inner">
          <p className="text-[11px] font-black uppercase tracking-wider text-stone-500 mb-2">
            Present at Kitchen Counter
          </p>

          {/* QR Code Frame */}
          <div
            data-testid="meal-pass-qr-code"
            className="flex flex-col items-center justify-center h-44 w-44 rounded-2xl border-4 border-stone-900 p-2 bg-stone-50 relative group"
          >
            {/* SVG Decorative QR Grid Pattern */}
            <svg
              className="h-full w-full text-stone-900"
              viewBox="0 0 100 100"
              fill="currentColor"
              role="img"
              aria-label={`QR Code for Token ${token}`}
            >
              {/* Corner position squares */}
              <rect x="5" y="5" width="28" height="28" fill="currentColor" rx="4" />
              <rect x="9" y="9" width="20" height="20" fill="white" rx="2" />
              <rect x="13" y="13" width="12" height="12" fill="currentColor" rx="1" />

              <rect x="67" y="5" width="28" height="28" fill="currentColor" rx="4" />
              <rect x="71" y="9" width="20" height="20" fill="white" rx="2" />
              <rect x="75" y="13" width="12" height="12" fill="currentColor" rx="1" />

              <rect x="5" y="67" width="28" height="28" fill="currentColor" rx="4" />
              <rect x="9" y="71" width="20" height="20" fill="white" rx="2" />
              <rect x="13" y="75" width="12" height="12" fill="currentColor" rx="1" />

              {/* Data blocks */}
              <rect x="40" y="10" width="8" height="8" />
              <rect x="52" y="10" width="8" height="8" />
              <rect x="40" y="24" width="20" height="8" />
              <rect x="10" y="40" width="8" height="20" />
              <rect x="24" y="40" width="8" height="8" />
              <rect x="40" y="40" width="20" height="20" rx="3" fill="#ea580c" />
              <rect x="68" y="40" width="22" height="8" />
              <rect x="82" y="52" width="8" height="8" />
              <rect x="40" y="68" width="8" height="22" />
              <rect x="54" y="68" width="12" height="8" />
              <rect x="74" y="68" width="16" height="8" />
              <rect x="54" y="82" width="26" height="8" />
            </svg>

            {/* Center Brand Badge */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center font-black text-xs shadow-md">
                CB
              </div>
            </div>
          </div>

          {/* 4-Digit Daily Meal Token */}
          <div className="mt-3 text-center">
            <span className="text-xs font-semibold text-stone-500 block">
              Daily Redemption Code
            </span>
            <span className="text-3xl font-black tracking-widest text-stone-950 font-mono">
              TOKEN {token}
            </span>
          </div>
        </div>

        {/* Student & Mess Info Details */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-stone-800/50 rounded-2xl p-4 border border-stone-700/50">
          <div>
            <span className="text-stone-400 block font-medium">Student</span>
            <span className="text-white font-bold block truncate">
              {studentName}
            </span>
            {studentRoll && (
              <span className="text-[11px] text-amber-300 font-mono block">
                Roll: {studentRoll}
              </span>
            )}
            <span className="text-[11px] text-stone-400 font-mono block">
              {studentPhone}
            </span>
          </div>

          <div>
            <span className="text-stone-400 block font-medium">Mess Provider</span>
            <span className="text-white font-bold block truncate">
              {displayCanteen}
            </span>
            <span className="text-[11px] text-stone-400 block">
              Valid: {formatDate(subscription.end_date)}
            </span>
          </div>
        </div>

        {/* 1-Tap Skip Tomorrow's Meal Feature */}
        <div className="pt-1">
          {isTomorrowSkipped ? (
            <div
              data-testid="skip-confirmation-chip"
              className="flex items-center gap-2 rounded-2xl bg-amber-500/15 border border-amber-500/40 p-3.5 text-xs text-amber-300"
            >
              <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold">
                  ⏭️ Tomorrow&apos;s {mealName} Skipped (+1 Day Extended)
                </p>
                <p className="text-[11px] text-amber-200/80">
                  Validity extended +1 day ({formatDate(subscription.end_date)})
                </p>
              </div>
            </div>
          ) : (
            <>
              {!confirmSkipOpen ? (
                <button
                  type="button"
                  onClick={() => setConfirmSkipOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-700 bg-stone-800/80 py-3 px-4 text-xs font-bold text-stone-300 hover:bg-stone-800 hover:text-white transition-all cursor-pointer active:scale-98"
                >
                  <CalendarX2 className="h-4 w-4 text-amber-400" />
                  <span>Skip Tomorrow&apos;s {mealName} (+1 Day Extension)</span>
                </button>
              ) : (
                <div className="rounded-2xl border border-amber-500/40 bg-stone-800/90 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Confirm Skipping Tomorrow&apos;s {mealName}?</span>
                  </div>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    You will not be billed for tomorrow ({formatDate(tomorrowStr)}). Validity will automatically be extended by +1 day.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmSkipOpen(false)}
                      className="flex-1 h-9 text-xs border-stone-600 text-stone-300 hover:bg-stone-700 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={skipBusy}
                      onClick={handleSkipTomorrow}
                      className="flex-1 h-9 text-xs bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold"
                    >
                      {skipBusy ? "Skipping..." : `Yes, Skip ${mealName}`}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
