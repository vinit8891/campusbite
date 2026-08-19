import { authJson } from "@/services/authFetch";
import type {
  RazorpayPublicConfig,
  CreatePaymentResponse,
  VerifyPaymentResponse,
} from "@/types";

export type {
  RazorpayPublicConfig,
  CreatePaymentResponse,
  VerifyPaymentResponse,
};


export async function getRazorpayConfig() {
  return authJson<RazorpayPublicConfig>("/payments/razorpay/config", {
    role: "customer",
    cache: "no-store",
  });
}

export async function createRazorpayPayment(orderId: string, amount?: number) {
  return authJson<CreatePaymentResponse>("/payments/razorpay/create", {
    role: "customer",
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      amount: amount ?? null,
    }),
  });
}

export async function verifyRazorpayPayment(payload: {
  order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  return authJson<VerifyPaymentResponse>("/payments/razorpay/verify", {
    role: "customer",
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type MockCompletePaymentResponse = {
  payment_status: string;
  order_status?: string;
  message?: string;
  success?: boolean;
};

export type CancelPaymentResponse = {
  message?: string;
  order_id?: string;
  payment_status?: string;
};

export async function cancelRazorpayPayment(orderId: string, reason?: string) {
  return authJson<CancelPaymentResponse>("/payments/razorpay/cancel", {
    role: "customer",
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      reason: reason || "user_cancelled",
    }),
  });
}

/** Mock-mode only — server simulates Checkout and verifies signature itself. */
export async function mockCompleteRazorpayCheckout(
  orderId: string,
  outcome: "success" | "failure" | "dismiss"
) {
  return authJson<MockCompletePaymentResponse>("/payments/razorpay/mock-complete", {
    role: "customer",
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      outcome,
    }),
  });
}

