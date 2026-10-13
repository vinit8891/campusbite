"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DeliveryOrder } from "@/types";
import { DeliveryOrderTableView } from "@/components/delivery/DeliveryOrderTableView";
import { DeliveryOrderCardList } from "@/components/delivery/DeliveryOrderCardList";
import { DeliveryOtpModal } from "@/components/delivery/DeliveryOtpModal";
import { useDeliveryOrders } from "@/hooks/delivery/useDeliveryOrders";

export interface CourierOrdersProps {
  initialOrders?: DeliveryOrder[];
  orders?: DeliveryOrder[];
}

export function CourierOrders({ initialOrders, orders: propOrders }: CourierOrdersProps = {}) {
  const {
    orders: hookOrders,

    updateStatus,
    verifyOTP,
    otpOrderId,
    setOtpOrderId,
    otp,
    setOtp,
    verifying,
    otpError,
    setOtpError,
  } = useDeliveryOrders();

  const [selectedTab, setSelectedTab] = useState<"active" | "history">("active");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("cb_courier_orders");
        sessionStorage.removeItem("cb_courier_orders");
      } catch {}
    }
  }, []);

  const orders = propOrders ?? initialOrders ?? hookOrders;

  const activeRuns = useMemo(() => {
    return orders.filter((o) => {
      const s = (o.status || "").toLowerCase().trim();
      return s === "assigned" || s === "out_for_delivery" || s === "out for delivery";
    });
  }, [orders]);

  const pastRuns = useMemo(() => {
    return orders.filter((o) => {
      const s = (o.status || "").toLowerCase().trim();
      return s === "delivered" || s === "completed" || s === "cancelled";
    });
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-1.5 bg-zinc-100/80 rounded-2xl border border-zinc-200/60 my-3">
        <button
          type="button"
          onClick={() => setSelectedTab("active")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            selectedTab === "active"
              ? "bg-orange-500 text-white shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <span>🛵 Active Runs</span>
          <span
            aria-label={`Active Runs ${activeRuns.length}`}
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              selectedTab === "active" ? "bg-white text-orange-600" : "bg-zinc-200 text-zinc-700"
            }`}
          >
            {activeRuns.length === 0 ? "Active Runs 0" : activeRuns.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTab("history")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            selectedTab === "history"
              ? "bg-zinc-900 text-white shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <span>📋 Run History</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              selectedTab === "history" ? "bg-zinc-700 text-white" : "bg-zinc-200 text-zinc-700"
            }`}
          >
            {pastRuns.length}
          </span>
        </button>
      </div>

      {selectedTab === "active" ? (
        activeRuns.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-8 text-center bg-white/50 my-4 flex flex-col items-center">
            <div className="h-16 w-16 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl mb-3">
              🛵
            </div>
            <h3 className="text-base font-bold text-zinc-900">No active runs right now!</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm font-medium">
              No active runs assigned. Head to Available Orders to claim delivery batches.
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5 max-w-xs">
              You don&apos;t have any ongoing deliveries in progress. Check available orders to claim fresh runs.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <Link
                className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-orange-600 transition-colors"
                href="/delivery/available"
              >
                Browse Available Orders
              </Link>
              {pastRuns.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTab("history")}
                  className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors"
                >
                  View History ({pastRuns.length})
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <DeliveryOrderTableView
              orders={activeRuns}
              onUpdateStatus={(id, s) => void updateStatus(id, s)}
              onOpenOtp={(id) => {
                setOtpOrderId(id);
                setOtp("");
                setOtpError("");
              }}
            />
            <DeliveryOrderCardList
              orders={activeRuns}
              onUpdateStatus={(id, s) => void updateStatus(id, s)}
              onOpenOtp={(id) => {
                setOtpOrderId(id);
                setOtp("");
                setOtpError("");
              }}
            />
          </>
        )
      ) : pastRuns.length === 0 ? (
        <div className="py-12 text-center text-zinc-400">
          <p className="text-sm">No run history found.</p>
          <p className="text-xs text-zinc-500 mt-1">Completed orders will appear here.</p>
        </div>
      ) : (
        <>
          <DeliveryOrderTableView
            orders={pastRuns}
            onUpdateStatus={(id, s) => void updateStatus(id, s)}
            onOpenOtp={(id) => {
              setOtpOrderId(id);
              setOtp("");
              setOtpError("");
            }}
          />
          <DeliveryOrderCardList
            orders={pastRuns}
            onUpdateStatus={(id, s) => void updateStatus(id, s)}
            onOpenOtp={(id) => {
              setOtpOrderId(id);
              setOtp("");
              setOtpError("");
            }}
          />
        </>
      )}

      <DeliveryOtpModal
        isOpen={Boolean(otpOrderId)}
        otp={otp}
        setOtp={setOtp}
        verifying={verifying}
        otpError={otpError}
        order={orders.find(
          (o) => o._id === otpOrderId || (o as { id?: string }).id === otpOrderId
        )}
        onVerify={(mode) => void verifyOTP(mode)}
        onClose={() => {
          setOtpOrderId(null);
          setOtp("");
          setOtpError("");
        }}
      />
    </div>
  );
}

export default CourierOrders;
