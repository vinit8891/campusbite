"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common";
import { useDeliveryOrders } from "@/hooks/delivery/useDeliveryOrders";
import { DeliveryOrdersFilterBar } from "@/components/delivery/DeliveryOrdersFilterBar";
import { DeliveryOrderTableView } from "@/components/delivery/DeliveryOrderTableView";
import { DeliveryOrderCardList } from "@/components/delivery/DeliveryOrderCardList";
import { DeliveryOtpModal } from "@/components/delivery/DeliveryOtpModal";

function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-14 w-full rounded-2xl" />
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-40 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function DeliveryOrdersPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'active' | 'history'>('active');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    orders,
    loading,
    error,
    q,
    setQ,
    status,
    setStatus,
    otpOrderId,
    setOtpOrderId,
    otp,
    setOtp,
    verifying,
    otpError,
    setOtpError,
    loadOrders,
    currentFilters,
    updateStatus,
    verifyOTP,
    handleSearchSubmit,
  } = useDeliveryOrders();

  const activeRuns = orders.filter(
    (order) =>
      !["delivered", "completed", "cancelled"].includes(
        order.status?.toLowerCase() || ""
      )
  );
  const pastRuns = orders.filter(
    (order) =>
      ["delivered", "completed", "cancelled"].includes(
        order.status?.toLowerCase() || ""
      )
  );

  if (!isMounted) {
    return (
      <div className="p-6 text-center text-gray-400">
        <OrdersSkeleton />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold">My Orders</h1>
          <p className="mt-2 text-gray-500">
            Track and complete your assigned deliveries.
          </p>
        </div>

        <DeliveryOrdersFilterBar
          q={q}
          setQ={setQ}
          status={status}
          onStatusChange={(val) => {
            setStatus(val);
            void loadOrders(currentFilters({ status: val }), {
              showLoading: true,
            });
          }}
          onRefresh={() =>
            void loadOrders(currentFilters(), { showLoading: true })
          }
          onSubmit={handleSearchSubmit}
        />

        {/* Dual-Tab Switcher (Matching Canteen KDS Design) */}
        <div className="flex items-center gap-2 p-1.5 bg-zinc-100/80 rounded-2xl border border-zinc-200/60 my-3">
          <button
            type="button"
            onClick={() => setSelectedTab('active')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              selectedTab === 'active'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>🛵 Active Runs</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              selectedTab === 'active' ? 'bg-white text-orange-600' : 'bg-zinc-200 text-zinc-700'
            }`}>
              {activeRuns.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              selectedTab === 'history'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>📋 Run History</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              selectedTab === 'history' ? 'bg-zinc-700 text-white' : 'bg-zinc-200 text-zinc-700'
            }`}>
              {pastRuns.length}
            </span>
          </button>
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <OrdersSkeleton />
        ) : selectedTab === 'active' ? (
          activeRuns.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-8 text-center bg-white/50 my-4 flex flex-col items-center">
              <div className="h-16 w-16 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl mb-3">
                🛵
              </div>
              <h3 className="text-base font-bold text-zinc-900">No active runs right now!</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                You don't have any ongoing deliveries in progress. Check available orders to claim fresh runs.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Link className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-orange-600 transition-colors" href="/delivery/available">
                  Browse Available Orders
                </Link>
                {pastRuns.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTab('history')}
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
                onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
                onOpenOtp={(id) => {
                  setOtpOrderId(id);
                  setOtp("");
                  setOtpError("");
                }}
              />

              <DeliveryOrderCardList
                orders={activeRuns}
                onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
                onOpenOtp={(id) => {
                  setOtpOrderId(id);
                  setOtp("");
                  setOtpError("");
                }}
              />
            </>
          )
        ) : pastRuns.length === 0 ? (
          <EmptyState
            icon={<Package className="mx-auto h-12 w-12 text-zinc-400" />}
            title="No run history found"
            description="Completed and delivered orders will appear here."
          />
        ) : (
          <>
            <DeliveryOrderTableView
              orders={pastRuns}
              onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
              onOpenOtp={(id) => {
                setOtpOrderId(id);
                setOtp("");
                setOtpError("");
              }}
            />

            <DeliveryOrderCardList
              orders={pastRuns}
              onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
              onOpenOtp={(id) => {
                setOtpOrderId(id);
                setOtp("");
                setOtpError("");
              }}
            />
          </>
        )}
      </div>

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
    </>
  );
}
