"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import { updateDeliveryStatus } from "@/services/deliveryPartnerService";

type DeliveryNavbarProps = {
  activeRunsCount?: number;
};

export function DeliveryNavbar({ activeRunsCount }: DeliveryNavbarProps) {
  const [isOnDuty, setIsOnDuty] = useState(true);

  useEffect(() => {
    const savedStatus = localStorage.getItem("cb_delivery_duty_status");
    if (savedStatus) {
      setIsOnDuty(savedStatus === "on");
    }
  }, []);

  const toggleDutyStatus = async () => {
    const nextStatus = !isOnDuty;
    if (!nextStatus) {
      const confirmPause = window.confirm(
        "Go Off Duty? You won't receive new dispatch notifications until you switch back On Duty."
      );
      if (!confirmPause) return;
    }

    setIsOnDuty(nextStatus);
    localStorage.setItem(
      "cb_delivery_duty_status",
      nextStatus ? "on" : "off"
    );

    try {
      const partner = getDeliveryPartnerSession();
      if (partner?.phone) {
        await updateDeliveryStatus(partner.phone, nextStatus);
      }
    } catch {
      // Non-blocking network update
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-orange-200/50 bg-white/90 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
      {/* Mobile Branding */}
      <div className="flex items-center gap-2 md:hidden">
        <Link
          href={ROUTES.DELIVERY_DASHBOARD}
          className="flex items-center gap-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white text-lg shadow-xs shadow-orange-600/30">
            🛵
          </span>
          <div>
            <span className="text-sm font-black tracking-tight text-stone-900 block leading-tight">
              CampusBite
            </span>
            <span className="text-[10px] font-bold text-orange-600 block leading-none">
              Courier Partner
            </span>
          </div>
        </Link>
      </div>

      {/* Desktop Info */}
      <div className="hidden md:flex items-center gap-2 text-xs font-medium text-stone-500">
        <span className="font-semibold text-stone-700">
          🚴 Campus Courier Console
        </span>
        <span>•</span>
        <span className="text-emerald-700 font-semibold flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Dispatch Connected
        </span>
        {typeof activeRunsCount === "number" && activeRunsCount > 0 ? (
          <>
            <span>•</span>
            <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              ⚡ {activeRunsCount} Active Run{activeRunsCount > 1 ? "s" : ""}
            </span>
          </>
        ) : null}
      </div>

      {/* Right: 1-Tap Duty Status Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleDutyStatus}
          aria-label="Toggle courier duty status"
          className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs border cursor-pointer active:scale-95 ${
            isOnDuty
              ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
              : "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isOnDuty
                ? "bg-emerald-500 animate-pulse"
                : "bg-rose-500"
            }`}
          />
          <span>{isOnDuty ? "🟢 On Duty" : "🔴 Off Duty"}</span>
        </button>
      </div>
    </header>
  );
}

export default DeliveryNavbar;
