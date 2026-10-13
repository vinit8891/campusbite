"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import type { DeliveryOrder } from "@/types";
import { DeliveryOrderTableView } from "@/components/delivery/DeliveryOrderTableView";
import { DeliveryOrderCardList } from "@/components/delivery/DeliveryOrderCardList";
import { ActiveRunCard } from "@/components/delivery/ActiveRunCard";
import { DeliveryOtpModal } from "@/components/delivery/DeliveryOtpModal";
import { useDeliveryOrders } from "@/hooks/delivery/useDeliveryOrders";
import { authJson } from "@/services/authFetch";

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
  const [fetchedActiveRuns, setFetchedActiveRuns] = useState<DeliveryOrder[] | null>(null);

  const fetchActiveRuns = useCallback(async () => {
    try {
      const res = await authJson<{ success?: boolean; orders?: DeliveryOrder[] }>(
        "/courier/orders/active",
        { role: "delivery_partner", redirectOnAuthError: false }
      );
      const liveOrders = Array.isArray(res?.orders) ? res.orders : [];
      setFetchedActiveRuns(liveOrders);

      // Clear any stale local cache if server is empty
      if (liveOrders.length === 0) {
        localStorage.removeItem("cb_courier_active_runs");
        localStorage.removeItem("cb_active_orders");
        localStorage.removeItem("cb_courier_orders");
        sessionStorage.removeItem("cb_courier_orders");
      }
    } catch {
      // On error, show empty array, DO NOT render 8 mock runs
      setFetchedActiveRuns([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("cb_courier_orders");
        sessionStorage.removeItem("cb_courier_orders");
      } catch {}
    }
    if (propOrders === undefined && initialOrders === undefined) {
      void fetchActiveRuns();
    }
  }, [fetchActiveRuns, propOrders, initialOrders]);

  const rawOrders = propOrders ?? initialOrders ?? (fetchedActiveRuns !== null ? fetchedActiveRuns : hookOrders);

  const activeRuns = useMemo(() => {
    return rawOrders.filter((o) => {
      const s = (o.status || "").toLowerCase().trim();
      return s === "assigned" || s === "out_for_delivery" || s === "out for delivery";
    });
  }, [rawOrders]);

  const pastRuns = useMemo(() => {
    return rawOrders.filter((o) => {
      const s = (o.status || "").toLowerCase().trim();
      return s === "delivered" || s === "completed" || s === "cancelled";
    });
  }, [rawOrders]);

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
          <span>Active Runs</span>
          <span
            aria-label={`Active Runs ${activeRuns.length}`}
            className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700"
          >
            {activeRuns.length}
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
          <span>Run History</span>
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
          <div className="py-16 text-center bg-white rounded-2xl border border-zinc-200/70 p-6 my-4">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🛵</span>
            </div>
            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 mb-2">
              Active Runs 0
            </div>
            <h3 className="font-bold text-zinc-900 text-sm">No Active Runs</h3>
            <h4 className="text-base font-bold text-zinc-900 sr-only">No active runs right now!</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
              You have no pending deliveries assigned. Switch to Available Orders to accept campus drops.
            </p>
            <p className="text-[11px] text-zinc-400 mt-1 max-w-xs mx-auto">
              No active runs assigned. Head to Available Orders to claim delivery batches.
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5 max-w-xs mx-auto">
              You don&apos;t have any ongoing deliveries in progress. Check available orders to claim fresh runs.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
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
          <div className="space-y-4">
            <div className="space-y-4">
              {activeRuns.map((order, idx) => (
                <ActiveRunCard
                  index={idx}
                  key={order._id || (order as { id?: string }).id || idx}
                  order={order}
                  onUpdateStatus={(id, s) => void updateStatus(id, s)}
                  onOpenOtp={(id) => {
                    setOtpOrderId(id);
                    setOtp("");
                    setOtpError("");
                  }}
                />
              ))}
            </div>
            <DeliveryOrderTableView
              orders={activeRuns}
              onUpdateStatus={(id, s) => void updateStatus(id, s)}
              onOpenOtp={(id) => {
                setOtpOrderId(id);
                setOtp("");
                setOtpError("");
              }}
            />
          </div>
        )
      ) : pastRuns.length === 0 ? (
        <div className="py-12 text-center text-zinc-400">
          <p className="text-sm">No run history found.</p>
          <p className="text-xs text-zinc-500 mt-1">Completed orders will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
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
        </div>
      )}

      <DeliveryOtpModal
        isOpen={Boolean(otpOrderId)}
        otp={otp}
        setOtp={setOtp}
        verifying={verifying}
        otpError={otpError}
        order={rawOrders.find(
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
