import { AuthHttpError, authFetch, authJson } from "@/services/authFetch";

export type RazorpayPublicConfig = {
  provider: string;
  enabled: boolean;
  key_id: string | null;
  mode: "mock" | "test" | "disabled" | string;
  mock_checkout_available?: boolean;
  webhook_configured?: boolean;
};

export type CreatePaymentResponse = {
  order_id: string;
  payment_id: string;
  razorpay_order_id: string;
  amount: number;
  amount_paise: number;
  currency: string;
  key_id: string | null;
  payment_status: string;
  idempotent?: boolean;
};

export type VerifyPaymentResponse = {
  success: boolean;
  order_id: string;
  payment_status: string;
  razorpay_payment_id?: string;
  idempotent?: boolean;
  order_status?: string;
};

async function readError(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  throw new AuthHttpError(
    res.status,
    typeof body?.detail === "string" ? body.detail : fallback
  );
}

export async function getRazorpayConfig() {
  return authJson<RazorpayPublicConfig>("/payments/razorpay/config", {
    role: "customer",
    cache: "no-store",
  });
}

export async function createRazorpayPayment(orderId: string, amount?: number) {
  const res = await authFetch("/payments/razorpay/create", {
    role: "customer",
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      amount: amount ?? null,
    }),
  });

  if (!res.ok) {
    await readError(res, "Failed to create payment");
  }

  return (await res.json()) as CreatePaymentResponse;
}

export async function verifyRazorpayPayment(payload: {
  order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const res = await authFetch("/payments/razorpay/verify", {
    role: "customer",
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await readError(res, "Payment verification failed");
  }

  return (await res.json()) as VerifyPaymentResponse;
}

export async function cancelRazorpayPayment(orderId: string, reason?: string) {
  const res = await authFetch("/payments/razorpay/cancel", {
    role: "customer",
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      reason: reason || "user_cancelled",
    }),
  });

  if (!res.ok) {
    await readError(res, "Failed to cancel payment");
  }

  return res.json();
}

/** Mock-mode only — server simulates Checkout and verifies signature itself. */
export async function mockCompleteRazorpayCheckout(
  orderId: string,
  outcome: "success" | "failure" | "dismiss"
) {
  const res = await authFetch("/payments/razorpay/mock-complete", {
    role: "customer",
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      outcome,
    }),
  });

  if (!res.ok) {
    await readError(res, "Mock checkout failed");
  }

  return res.json();
}
