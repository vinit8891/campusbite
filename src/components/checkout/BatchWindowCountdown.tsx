"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Clock, Truck, Users, Sparkles, Building2, ShieldCheck } from "lucide-react";
import { getNextBatchWindow, type BatchWindow } from "@/lib/batchWindows";

interface BatchWindowCountdownProps {
  hostelBlock?: string | null;
  deliveryMode?: string;
  className?: string;
  onWindowChange?: (window: BatchWindow) => void;
}

export function BatchWindowCountdown({
  hostelBlock,
  deliveryMode = "HOSTEL_BATCH",
  className = "",
  onWindowChange,
}: BatchWindowCountdownProps) {
  const isBatchMode =
    deliveryMode === "HOSTEL_BATCH" ||
    deliveryMode === "BATCH" ||
    deliveryMode === "hostel_batch";

  const [currentWindow, setCurrentWindow] = useState<BatchWindow>(() =>
    getNextBatchWindow(new Date(), deliveryMode)
  );

  useEffect(() => {
    // Initial evaluation
    const win = getNextBatchWindow(new Date(), deliveryMode);
    setCurrentWindow(win);
    onWindowChange?.(win);

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      const updated = getNextBatchWindow(new Date(), deliveryMode);
      setCurrentWindow(updated);
      onWindowChange?.(updated);
    }, 30000);

    return () => clearInterval(interval);
  }, [deliveryMode, onWindowChange]);

  if (!isBatchMode) {
    return null;
  }

  const destinationLabel = hostelBlock ? hostelBlock.trim() : "Hostel Lobby";
  const mins = currentWindow.minutesRemaining;

  return (
    <div
      data-testid="batch-window-countdown"
      className={`rounded-2xl border border-amber-300/90 bg-gradient-to-br from-amber-50 via-orange-50/40 to-white p-3.5 sm:p-4 shadow-xs transition-all ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-xs">
          <Truck className="h-5 w-5 animate-pulse" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-900 border border-orange-200">
              <Clock className="h-3 w-3 text-orange-700" />
              <span>Wave Dispatch Window</span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
              <span>₹15 Flat Fee</span>
            </span>
          </div>

          <h4 className="text-xs sm:text-sm font-black text-stone-900 tracking-tight leading-snug">
            🚚 Next Batch to {destinationLabel}: {currentWindow.deliveryWindow} • Ordering closes in {mins} mins
          </h4>

          <p className="text-[11px] sm:text-xs font-medium text-stone-600 leading-relaxed">
            Grouped lobby drop — keeps your delivery fee at ₹15 flat.
          </p>
        </div>
      </div>
    </div>
  );
}

export default BatchWindowCountdown;
