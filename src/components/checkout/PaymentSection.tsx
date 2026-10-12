"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loadRazorpayScript, type RazorpayOptions } from "@/lib/loadRazorpay";
import { api } from "@/lib/api";

export interface HandleOnlinePaymentParams {
  createdOrderId: string;
  totalAmount: number;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  router: {
    push: (url: string) => void;
  };
}

/**
 * Initiates Razorpay checkout: loads SDK, creates order on backend,
 * opens the Razorpay modal, and verifies the signature on success.
 */
export async function handleOnlinePayment({
  createdOrderId,
  totalAmount,
  user,
  router,
}: HandleOnlinePaymentParams) {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    toast.error("Failed to load Razorpay SDK. Please check your internet connection.");
    return;
  }

  // 1. Create Order on Backend
  const { data: rzpData } = await api.post("/payments/create-order", {
    order_id: createdOrderId,
    amount: totalAmount,
  });

  // 2. Open Razorpay Modal
  const options: RazorpayOptions = {
    key: rzpData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    amount: rzpData.amount,
    currency: "INR",
    name: "CampusBite",
    description: `Order #${createdOrderId.slice(-6).toUpperCase()}`,
    order_id: rzpData.razorpay_order_id,
    handler: async (response) => {
      try {
        const verifyRes = await api.post("/payments/verify", {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          order_id: createdOrderId,
        });
        if (verifyRes.data.success) {
          toast.success("Payment successful!");
          router.push(`/orders/${createdOrderId}/track`);
        }
      } catch (err) {
        toast.error("Payment verification failed. Please contact campus support.");
      }
    },
    prefill: {
      name: user?.name,
      email: user?.email,
      contact: user?.phone,
    },
    theme: {
      color: "#f97316", // CampusBite orange
    },
  };

  if (!window.Razorpay) {
    toast.error("Razorpay SDK is not available.");
    return;
  }

  const rzpInstance = new window.Razorpay(options as Record<string, unknown>);
  rzpInstance.open();
}

interface PaymentSectionProps {
  orderId?: string;
  totalAmount?: number;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export default function PaymentSection({
  orderId,
  totalAmount = 0,
  user,
}: PaymentSectionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onPayClick = async () => {
    if (!orderId) {
      toast.error("Order ID is required to initiate online payment.");
      return;
    }
    try {
      setLoading(true);
      await handleOnlinePayment({
        createdOrderId: orderId,
        totalAmount,
        user,
        router,
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to initiate payment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">💳</span>
          <div>
            <h3 className="text-sm font-bold text-stone-900">Online Payment</h3>
            <p className="text-xs text-stone-500">
              UPI, Credit/Debit Cards, NetBanking via Razorpay
            </p>
          </div>
        </div>
        <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          Instant
        </span>
      </div>

      {orderId && (
        <button
          type="button"
          onClick={onPayClick}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>{loading ? "Opening Gateway..." : `Pay ₹${totalAmount.toFixed(2)} via Razorpay`}</span>
        </button>
      )}
    </div>
  );
}
