"use client";

import { useDeliveryOrders } from "@/hooks/delivery/useDeliveryOrders";
import { MyDeliveryCard } from "@/components/delivery/MyDeliveryCard";
import { DeliveryOtpModal } from "@/components/delivery/DeliveryOtpModal";

export default function MyDeliveriesPage() {
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

  if (loading) {
    return (
      <div className="p-8 text-center text-xl">
        Loading...
      </div>
    );
  }

  return (
    <>
      <main className="p-8">
        <h1 className="mb-8 text-4xl font-bold">
          My Deliveries
        </h1>

        {orders.length === 0 ? (
          <div className="rounded-xl border bg-white p-10 text-center shadow">
            <h2 className="text-2xl font-semibold">
              No Active Deliveries
            </h2>
            <p className="mt-2 text-gray-500">
              Accepted deliveries will appear here.
            </p>
          </div>
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