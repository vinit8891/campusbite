/**
 * Canonical Payment domain models.
 */

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

export type PaymentVerificationPayload = {
  order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
