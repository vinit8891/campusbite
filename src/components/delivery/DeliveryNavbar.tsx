"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ROUTES } from "@/lib/routes";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import { updateDeliveryStatus } from "@/services/deliveryPartnerService";

type DeliveryNavbarProps = {
  activeRunsCount?: number;
  isUnverified?: boolean;
};

export function DeliveryNavbar({ activeRunsCount, isUnverified: propIsUnverified }: DeliveryNavbarProps) {
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [sessionUnverified, setSessionUnverified] = useState(false);

  useEffect(() => {
    const session = getDeliveryPartnerSession();
    const unverified =
      propIsUnverified ??
      (session?.verification_status === "pending" ||
        session?.verification_status === "PENDING_VERIFICATION" ||
        session?.is_verified === false);

    setSessionUnverified(Boolean(unverified));

    if (unverified) {
      setIsOnDuty(false);
      return;
    }

    const savedStatus = localStorage.getItem("cb_delivery_duty_status");
    if (savedStatus) {
      setIsOnDuty(savedStatus === "on");
    }
  }, [propIsUnverified]);

  const effectiveUnverified = propIsUnverified ?? sessionUnverified;

  const toggleDutyStatus = async () => {
    if (effectiveUnverified) return;

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
          <Image
            src="/images/brand-logo.png"
            alt="CampusBite Logo"
            width={36}
            height={36}
            className="h-9 w-auto object-contain rounded-xl"
          />
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
          disabled={effectiveUnverified}
          title={
            effectiveUnverified
              ? "Application under review. You cannot toggle On-Duty until admin KYC approval."
              : "Toggle courier duty status"
          }
          aria-label="Toggle courier duty status"
          className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs border ${
            effectiveUnverified
              ? "bg-amber-50 text-amber-800 border-amber-300 opacity-80 cursor-not-allowed"
              : isOnDuty
              ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 cursor-pointer active:scale-95"
              : "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 cursor-pointer active:scale-95"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              effectiveUnverified
                ? "bg-amber-500"
                : isOnDuty
                ? "bg-emerald-500 animate-pulse"
                : "bg-rose-500"
            }`}
          />
          <span>
            {effectiveUnverified
              ? "🔒 Verification Pending"
              : isOnDuty
              ? "🟢 On Duty"
              : "🔴 Off Duty"}
          </span>
        </button>
      </div>
    </header>
  );
}

export default DeliveryNavbar;
