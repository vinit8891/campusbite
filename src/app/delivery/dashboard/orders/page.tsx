"use client";

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
      <Skeleton className="h-24 w-full rounded-2xl" />
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-40 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function DeliveryOrdersPage() {
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

        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <OrdersSkeleton />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<Package className="mx-auto h-12 w-12 text-orange-500" />}
            title="No orders found"
            description="Try clearing filters, or accept a new delivery from Available Orders."
          />
        ) : (
          <>
            <DeliveryOrderTableView
              orders={orders}
              onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
              onOpenOtp={(id) => {
                setOtpOrderId(id);
                setOtp("");
                setOtpError("");
              }}
            />

            <DeliveryOrderCardList
              orders={orders}
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
        onVerify={() => void verifyOTP()}
        onClose={() => {
          setOtpOrderId(null);
          setOtp("");
          setOtpError("");
        }}
      />
    </>
  );
}
