"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileCheck2,
  ShieldCheck,
  Percent,
  Calendar,
  Wallet,
  ArrowRight,
} from "lucide-react";

import { usePartnerAgreementGuard } from "@/hooks/partner/usePartnerAgreementGuard";
import { PartnerAgreementModal } from "@/components/partner/PartnerAgreementModal";
import { useRestaurantDashboard } from "@/hooks/restaurant/useRestaurantDashboard";
import { getRestaurantByEmail } from "@/services/restaurantService";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import { ROUTES } from "@/lib/routes";

export default function PartnerDashboardPage() {
  const [canteenProfile, setCanteenProfile] = useState<{
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
    fssai_number?: string;
    agreement_signed?: boolean;
  } | null>(null);

  const { dashboard } = useRestaurantDashboard();

  const {
    isAgreementSigned,
    showModal,
    canteenId,
    canteenName,
    initialFssai,
    initialPhone,
    initialSignatory,
    handleAgreementSuccess,
  } = usePartnerAgreementGuard();

  // Load canteen profile on mount
  useEffect(() => {
    let active = true;
    async function loadCanteen() {
      const email = getRestaurantOwnerEmail();
      if (!email) return;

      try {
        const rest = await getRestaurantByEmail(email);
        if (active && rest) {
          setCanteenProfile(rest);
        }
      } catch {
        // Handled silently
      }
    }
    loadCanteen();
    return () => {
      active = false;
    };
  }, []);

  const onAgreementExecuted = () => {
    handleAgreementSuccess();
    if (canteenProfile) {
      setCanteenProfile((prev) =>
        prev ? { ...prev, agreement_signed: true } : prev
      );
    }
  };

  const displayName =
    canteenProfile?.name || canteenName || "Campus Canteen Partner";
  const displayFssai =
    canteenProfile?.fssai_number || initialFssai || "Pending Verification";
  const effectiveCanteenId =
    canteenProfile?._id || canteenProfile?.email || canteenId || "canteen-partner";

  return (
    <div className="relative min-h-screen bg-stone-50/70 p-4 sm:p-6 lg:p-8">
      {/* Background blur when agreement pending */}
      <div
        className={`max-w-7xl mx-auto space-y-6 sm:space-y-8 transition-all duration-300 ${
          showModal ? "filter blur-md pointer-events-none select-none" : ""
        }`}
      >
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 p-6 sm:p-8 text-white shadow-lg">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-amber-100">
                  <Building2 className="w-3.5 h-3.5 text-amber-200" />
                  <span>Canteen Partner Portal</span>
                </span>

                {isAgreementSigned ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/30 backdrop-blur-md text-xs font-bold text-emerald-100 border border-emerald-400/30">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Click-Wrap Agreement Executed</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/30 backdrop-blur-md text-xs font-bold text-rose-100 border border-rose-400/30 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
                    <span>Agreement Signature Required</span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
                {displayName} 🍲
              </h1>
              <p className="text-xs sm:text-sm text-amber-100/90 font-medium">
                CampusBite Partner Operations Hub • Orders, KDS Kitchen Management, Menu Updates & Financial Disbursals.
              </p>
            </div>

            {/* Quick Badges */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-3">
                <Percent className="w-5 h-5 text-amber-200" />
                <div className="text-left text-xs">
                  <div className="text-amber-100 font-medium">Platform Take-Rate</div>
                  <div className="font-extrabold text-white">18% on Gross Orders</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-amber-200" />
                <div className="text-left text-xs">
                  <div className="text-amber-100 font-medium">Settlement Schedule</div>
                  <div className="font-extrabold text-white">Tue & Fri (T+2 Payouts)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Canteen Status & Legal Overview Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                FSSAI License
              </div>
              <div className="font-extrabold text-stone-900 text-sm font-mono mt-0.5">
                {displayFssai}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Legal Status
              </div>
              <div className="font-extrabold text-stone-900 text-sm mt-0.5">
                {isAgreementSigned ? "IT Act Sec 10A Compliant" : "Pending Signature"}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Daily Ledger Cutoff
              </div>
              <div className="font-extrabold text-stone-900 text-sm mt-0.5">
                9:00 PM IST (EOD Run)
              </div>
            </div>
          </div>
        </div>

        {/* Operational Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
            <div className="text-xs font-bold text-stone-500">Today&apos;s Orders</div>
            <div className="text-2xl font-black text-stone-900 mt-1">
              {dashboard.today_orders ?? 0}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
            <div className="text-xs font-bold text-amber-600">Pending Cooking</div>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {dashboard.pending_orders ?? 0}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
            <div className="text-xs font-bold text-blue-600">Active / Out for Delivery</div>
            <div className="text-2xl font-black text-blue-600 mt-1">
              {dashboard.active_orders ?? 0}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
            <div className="text-xs font-bold text-emerald-600">Gross Sales Today</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              ₹{Number(dashboard.today_revenue || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Quick Operations Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            href={ROUTES.RESTAURANT_ORDERS}
            className="group p-6 rounded-3xl bg-white border border-stone-200/80 hover:border-orange-500/50 hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="p-3 w-fit rounded-2xl bg-orange-100/70 text-orange-700 group-hover:scale-105 transition-transform">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-stone-900 group-hover:text-orange-600 transition-colors">
                Kitchen Display (KDS) & Orders
              </h3>
              <p className="text-xs text-stone-600">
                View live student orders, accept tickets, and coordinate handover with campus couriers.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-orange-600 gap-1">
              <span>Open Kitchen Queue</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href={ROUTES.RESTAURANT_MENU}
            className="group p-6 rounded-3xl bg-white border border-stone-200/80 hover:border-orange-500/50 hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="p-3 w-fit rounded-2xl bg-amber-100/70 text-amber-700 group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-stone-900 group-hover:text-orange-600 transition-colors">
                Menu Management
              </h3>
              <p className="text-xs text-stone-600">
                Toggle dish availability in real-time, adjust counter pricing, and manage food categories.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-orange-600 gap-1">
              <span>Manage Menu Items</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/partner/payouts"
            className="group p-6 rounded-3xl bg-white border border-stone-200/80 hover:border-orange-500/50 hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="p-3 w-fit rounded-2xl bg-emerald-100/70 text-emerald-700 group-hover:scale-105 transition-transform">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-stone-900 group-hover:text-orange-600 transition-colors">
                Settlements & Disbursals
              </h3>
              <p className="text-xs text-stone-600">
                Review daily 9:00 PM EOD settlement ledgers, 18% commission deductions, and upcoming Tuesday/Friday bank transfers.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-orange-600 gap-1">
              <span>View Payout Ledgers</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* Non-dismissible Click-Wrap Agreement Modal */}
      <PartnerAgreementModal
        isOpen={showModal}
        canteenId={effectiveCanteenId}
        canteenName={displayName}
        initialFssai={initialFssai}
        initialPhone={initialPhone}
        initialSignatory={initialSignatory}
        onSuccess={onAgreementExecuted}
      />
    </div>
  );
}
