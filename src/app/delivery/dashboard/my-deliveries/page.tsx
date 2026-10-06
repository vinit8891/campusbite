"use client";

import { useState, useEffect } from "react";
import { useDeliveryOrders } from "@/hooks/delivery/useDeliveryOrders";
import { MyDeliveryCard } from "@/components/delivery/MyDeliveryCard";
import { DeliveryOtpModal } from "@/components/delivery/DeliveryOtpModal";
import { EmptyState } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyDeliveriesPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    orders,
    loading,
    otpOrderId,
    setOtpOrderId,
    otp,
    setOtp,
    verifying,
    otpError,
    setOtpError,
    updateStatus,
    verifyOTP,
  } = useDeliveryOrders();

  if (!isMounted) {
    return (
      <main className="p-8 text-center text-gray-400">
        <div className="py-12">Loading deliveries...</div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="p-8 space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="p-8">
        <h1 className="mb-8 text-4xl font-bold">
          My Deliveries
        </h1>

        {orders.length === 0 ? (
          <EmptyState
            icon="🛵"
            title="No Active Deliveries"
            description="Accepted deliveries will appear here."
          />
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <MyDeliveryCard
                key={order._id}
                order={order}
                onUpdateStatus={(id, nextStatus) => void updateStatus(id, nextStatus)}
                onOpenOtp={(id) => {
                  setOtpOrderId(id);
                  setOtp("");
                  setOtpError("");
                }}
              />
            ))}
          </div>
        )}
      </main>

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