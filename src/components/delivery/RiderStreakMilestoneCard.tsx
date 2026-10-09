"use client";

import React from "react";
import { Award, Sparkles, CheckCircle2, TrendingUp, Flame, Gift } from "lucide-react";
import {
  RIDER_MILESTONES,
  MILESTONE_TIER_1,
  MILESTONE_TIER_2,
  MILESTONE_TIER_3,
} from "@/lib/orderPricing";

export interface RiderStreakMilestoneCardProps {
  completedCount?: number;
}

export function RiderStreakMilestoneCard({
  completedCount = 0,
}: RiderStreakMilestoneCardProps) {
  // Calculate current bonus unlocked
  let currentBonusEarned = 0;
  if (completedCount >= MILESTONE_TIER_3.count) {
    currentBonusEarned = MILESTONE_TIER_3.bonus;
  } else if (completedCount >= MILESTONE_TIER_2.count) {
    currentBonusEarned = MILESTONE_TIER_2.bonus;
  } else if (completedCount >= MILESTONE_TIER_1.count) {
    currentBonusEarned = MILESTONE_TIER_1.bonus;
  }

  // Next milestone calculation
  const nextMilestone =
    RIDER_MILESTONES.find((m) => completedCount < m.count) || null;
  const dropsNeeded = nextMilestone ? nextMilestone.count - completedCount : 0;

  return (
    <div
      data-testid="rider-streak-milestone-card"
      className="w-full rounded-2xl sm:rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white p-5 sm:p-6 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-white shadow-xs">
              <Flame className="h-3 w-3 fill-white" />
              Daily Courier Milestones
            </span>
            {currentBonusEarned > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                <Sparkles className="h-3 w-3 text-emerald-600" />
                Unlocked +₹{currentBonusEarned} Bonus
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
            Complete Daily Drops, Unlock Guaranteed Cash
          </h2>
          <p className="text-xs text-stone-600">
            Earn extra cash rewards on top of base wages (₹20/drop) and customer tips.
          </p>
        </div>

        {nextMilestone ? (
          <div className="rounded-2xl bg-white border border-orange-200 px-4 py-2 text-right shadow-xs">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
              Next Reward Tier
            </span>
            <span className="text-sm sm:text-base font-black text-orange-600">
              {dropsNeeded} more drop{dropsNeeded > 1 ? "s" : ""} for +₹{nextMilestone.bonus}
            </span>
          </div>
        ) : (
          <div className="rounded-2xl bg-emerald-100 border border-emerald-300 px-4 py-2 text-right shadow-xs">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
              Maximum Milestone Reached
            </span>
            <span className="text-sm sm:text-base font-black text-emerald-900">
              🎉 +₹100 Max Tier Unlocked!
            </span>
          </div>
        )}
      </div>

      {/* 3 Milestone Tier Progress Tiles */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {RIDER_MILESTONES.map((tier, index) => {
          const isUnlocked = completedCount >= tier.count;
          const progressPercent = Math.min(
            100,
            Math.round((completedCount / tier.count) * 100)
          );

          return (
            <div
              key={tier.count}
              className={`rounded-2xl border p-4 transition-all ${
                isUnlocked
                  ? "border-emerald-300 bg-emerald-50/70 shadow-xs"
                  : "border-stone-200/80 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wide text-stone-700 flex items-center gap-1.5">
                  <Award
                    className={`h-4 w-4 ${
                      isUnlocked ? "text-emerald-600" : "text-amber-500"
                    }`}
                  />
                  <span>Tier {index + 1}</span>
                </span>
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    isUnlocked
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-100 text-amber-900 border border-amber-300"
                  }`}
                >
                  +₹{tier.bonus} Bonus
                </span>
              </div>

              <div className="mt-2.5 space-y-1">
                <div className="flex justify-between text-xs font-bold text-stone-900">
                  <span>{tier.count} Completed Drops</span>
                  <span className={isUnlocked ? "text-emerald-700" : "text-stone-500"}>
                    {isUnlocked ? "Unlocked ✅" : `${completedCount}/${tier.count}`}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className={`h-full transition-all rounded-full ${
                      isUnlocked ? "bg-emerald-500" : "bg-orange-500"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RiderStreakMilestoneCard;
