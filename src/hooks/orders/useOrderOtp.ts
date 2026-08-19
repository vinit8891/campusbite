import { useCallback, useRef, useState } from "react";
import { getOrderOTP } from "@/services/deliveryService";
import type { Order, OrderOtp } from "@/types/orders";

export function useOrderOtp() {
  const [orderOtps, setOrderOtps] = useState<Record<string, OrderOtp>>({});

  /**
   * Prevents the same OTP endpoint from being called
   * repeatedly every 5 seconds.
   */
  const otpRequestedRef = useRef<Set<string>>(new Set());

  const loadOrderOTP = useCallback(async (orderId: string) => {
    if (otpRequestedRef.current.has(orderId)) {
      return;
    }

    otpRequestedRef.current.add(orderId);

    try {
      const otp = await getOrderOTP(orderId);

      setOrderOtps((previous) => ({
        ...previous,
        [orderId]: otp,
      }));
    } catch (err) {
      /**
       * Allow a retry if the OTP request failed.
       */
      otpRequestedRef.current.delete(orderId);

      console.error(`Unable to load OTP for order ${orderId}:`, err);
    }
  }, []);

  const syncOrderOtps = useCallback(
    (orders: Order[]) => {
      for (const order of orders) {
        const requiresOtp =
          order.status === "Picked Up" ||
          order.status === "Out for Delivery";

        if (
          requiresOtp &&
          !orderOtps[order._id] &&
          !otpRequestedRef.current.has(order._id)
        ) {
          void loadOrderOTP(order._id);
        }
      }
    },
    [loadOrderOTP, orderOtps]
  );

  return {
    orderOtps,
    loadOrderOTP,
    syncOrderOtps,
  };
}
