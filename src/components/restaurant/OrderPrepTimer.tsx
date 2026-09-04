"use client";

import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

type OrderPrepTimerProps = {
  createdAt?: string;
  status: string;
  className?: string;
};

export function OrderPrepTimer({
  createdAt,
  status,
  className = "",
}: OrderPrepTimerProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const createdTime = createdAt ? new Date(createdAt).getTime() : now;
  const elapsedSec = Math.max(0, Math.floor((now - createdTime) / 1000));
  const elapsedMin = Math.floor(elapsedSec / 60);
  const elapsedRemainSec = elapsedSec % 60;

  // 1. Pending Orders: 3-minute acceptance window
  if (status === "Pending") {
    const acceptWindowSec = 3 * 60;
    const remainSec = acceptWindowSec - elapsedSec;

    if (remainSec > 0) {
      const min = Math.floor(remainSec / 60);
      const sec = remainSec % 60;
      const formatted = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
        >
          <Clock className="h-3.5 w-3.5 text-amber-600 animate-spin-slow" />
          <span>Accept in {formatted}</span>
        </span>
      );
    } else {
      const overdueMin = Math.floor(Math.abs(remainSec) / 60);
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse ${className}`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
          <span>Pending Overdue ({overdueMin}m late)</span>
        </span>
      );
    }
  }

  // 2. Accepted / Preparing: 15-minute standard prep SLA
  if (status === "Accepted" || status === "Preparing") {
    const slaSec = 15 * 60;
    const remainSec = slaSec - elapsedSec;

    if (remainSec > 5 * 60) {
      // 0–10 mins elapsed (Green)
      const min = Math.floor(remainSec / 60);
      const sec = remainSec % 60;
      const formatted = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
        >
          <Clock className="h-3.5 w-3.5 text-emerald-600" />
          <span>{formatted} min left</span>
        </span>
      );
    } else if (remainSec > 0) {
      // 10–15 mins elapsed (Amber)
      const min = Math.floor(remainSec / 60);
      const sec = remainSec % 60;
      const formatted = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 shadow-2xs ${className}`}
        >
          <Clock className="h-3.5 w-3.5 text-amber-600" />
          <span>{formatted} min left (Urgent)</span>
        </span>
      );
    } else {
      // > 15 mins elapsed (Red pulse)
      const delayMin = Math.floor(Math.abs(remainSec) / 60);
      const delaySec = Math.abs(remainSec) % 60;
      const formatted = `${String(delayMin).padStart(2, "0")}:${String(delaySec).padStart(2, "0")}`;
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-300 animate-pulse shadow-sm ${className}`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
          <span>Delayed by +{formatted}</span>
        </span>
      );
    }
  }

  // 3. Ready for Pickup
  if (status === "Ready for Pickup") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 ${className}`}
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
        <span>Ready ({elapsedMin}m ago)</span>
      </span>
    );
  }

  // 4. Default / Delivered / Cancelled
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-stone-500 ${className}`}
    >
      <Clock className="h-3 w-3 text-stone-400" />
      <span>
        {elapsedMin}m {elapsedRemainSec}s ago
      </span>
    </span>
  );
}

export default OrderPrepTimer;
