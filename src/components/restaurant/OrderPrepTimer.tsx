"use client";

import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  isNewOrder,
  isCookingOrder,
  isReadyOrder,
  parseDateSafe,
} from "@/lib/orderDomain";

type OrderPrepTimerProps = {
  createdAt?: string;
  acceptedAt?: string | null;
  updatedAt?: string | null;
  status: string;
  className?: string;
};

export function OrderPrepTimer({
  createdAt,
  acceptedAt,
  updatedAt,
  status,
  className = "",
}: OrderPrepTimerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isMounted) {
    return (
      <span
        suppressHydrationWarning
        className={`inline-flex items-center gap-1 text-xs text-stone-400 font-mono ${className}`}
      >
        <Clock className="h-3 w-3 text-stone-300" />
        <span>Loading timer...</span>
      </span>
    );
  }

  const createdTime = createdAt ? parseDateSafe(createdAt).getTime() : now;
  const elapsedSec = Math.max(0, Math.floor((now - createdTime) / 1000));
  const elapsedMin = Math.floor(elapsedSec / 60);
  const elapsedRemainSec = elapsedSec % 60;

  // 1. Pending / New Orders: Show elapsed wait time, amber warning only if > 10m
  if (isNewOrder(status)) {
    if (elapsedMin < 10) {
      return (
        <span
          suppressHydrationWarning
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
        >
          <Clock className="h-3.5 w-3.5 text-amber-600 animate-spin-slow" />
          <span>⏱️ Placed {elapsedMin}m ago</span>
        </span>
      );
    } else {
      return (
        <span
          suppressHydrationWarning
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse ${className}`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span>⚠️ Waiting &gt;10m</span>
        </span>
      );
    }
  }

  // 2. Cooking / In Kitchen: 30-minute prep window SLA
  if (isCookingOrder(status)) {
    const cookingBaseDate = acceptedAt || updatedAt || createdAt;
    let cookingElapsedSec = 0;
    if (cookingBaseDate) {
      const startTime = parseDateSafe(cookingBaseDate).getTime();
      cookingElapsedSec = Math.max(0, Math.floor((now - startTime) / 1000));
      // If acceptedAt/updatedAt is missing and createdAt is older than 30m,
      // provide standard 25-minute SLA timer rather than immediately flagging >60m delayed
      if (!acceptedAt && !updatedAt && cookingElapsedSec > 30 * 60) {
        cookingElapsedSec = 5 * 60;
      }
    }

    const slaSec = 30 * 60;
    const remainSec = slaSec - cookingElapsedSec;

    if (remainSec > 5 * 60) {
      // 0–25 mins elapsed (Green)
      const min = Math.floor(remainSec / 60);
      const sec = remainSec % 60;
      const formatted = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
      return (
        <span
          suppressHydrationWarning
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
        >
          <Clock className="h-3.5 w-3.5 text-emerald-600" />
          <span>{formatted} min left</span>
        </span>
      );
    } else if (remainSec > 0) {
      // 25–30 mins elapsed (Amber / Urgent)
      const min = Math.floor(remainSec / 60);
      const sec = remainSec % 60;
      const formatted = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
      return (
        <span
          suppressHydrationWarning
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 shadow-2xs ${className}`}
        >
          <Clock className="h-3.5 w-3.5 text-amber-600" />
          <span>{formatted} min left (Urgent)</span>
        </span>
      );
    } else {
      // > 30 mins elapsed (Red delayed pulse)
      const delayMin = Math.floor(Math.abs(remainSec) / 60);
      const delaySec = Math.abs(remainSec) % 60;
      const formatted = `${String(delayMin).padStart(2, "0")}:${String(delaySec).padStart(2, "0")}`;
      const delayText =
        delayMin > 60 ? "⚠️ Delayed (>60m)" : `Delayed by +${formatted}`;

      return (
        <span
          suppressHydrationWarning
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-300 animate-pulse shadow-sm ${className}`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
          <span>⚠️ {delayText}</span>
        </span>
      );
    }
  }

  // 3. Ready for Pickup
  if (isReadyOrder(status)) {
    const readyText =
      elapsedMin > 60 ? "Ready (>60m ago)" : `Ready (${elapsedMin}m ago)`;
    return (
      <span
        suppressHydrationWarning
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 ${className}`}
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
        <span>{readyText}</span>
      </span>
    );
  }

  // 4. Default / Delivered / Cancelled
  return (
    <span
      suppressHydrationWarning
      className={`inline-flex items-center gap-1 text-xs text-stone-500 ${className}`}
    >
      <Clock className="h-3 w-3 text-stone-400" />
      <span>
        {elapsedMin > 60 ? ">60m ago" : `${elapsedMin}m ${elapsedRemainSec}s ago`}
      </span>
    </span>
  );
}

export default OrderPrepTimer;
