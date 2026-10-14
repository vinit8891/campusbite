import type { CreatePaymentResponse } from "@/services/paymentService";
import { isMobileDevice } from "@/lib/browserCapabilities";

export { isMobileDevice };

export const CAMPUSBITE_DEFAULT_UPI_ID = "campusbite.ops@okaxis";

export type RazorpayCheckoutSuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type OpenCheckoutArgs = {
  keyId: string;
  payment: CreatePaymentResponse | {
    id?: string;
    razorpay_order_id?: string;
    razorpayOrder?: { id: string };
    amount_paise?: number;
    amount?: number;
    currency?: string;
    key_id?: string | null;
    [key: string]: unknown;
  };
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  onSuccess: (result: RazorpayCheckoutSuccess) => void;
  onDismiss: () => void;
  onFailure?: (reason?: string) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-campusbite-razorpay="1"], script[src*="checkout.razorpay.com"]'
    );
    if (existing) {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener("error", () => resolve(false));
      setTimeout(() => resolve(Boolean(window.Razorpay)), 1500);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.campusbiteRazorpay = "1";
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Opens Razorpay Checkout (live or test mode). Does not mark payment paid —
 * caller must send response to backend /payments/razorpay/verify.
 */
export async function openRazorpayCheckout(args: OpenCheckoutArgs & {
  onFailure?: (reason?: string) => void;
}): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error(
      "Unable to load Razorpay Checkout. Check your network and try again."
    );
  }

  const keyId =
    args.keyId ||
    (args.payment as any)?.key_id ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    "";

  if (!keyId.startsWith("rzp_test_") && !keyId.startsWith("rzp_live_")) {
    throw new Error("Invalid Razorpay key format. Key must start with rzp_live_ or rzp_test_.");
  }

  const razorpayOrderId =
    (args.payment as any)?.razorpayOrder?.id ||
    args.payment?.razorpay_order_id ||
    (args.payment as any)?.id ||
    "";

  const amountPaise =
    args.payment?.amount_paise ??
    Math.round(((args.payment as any)?.amount || 0) * 100);

  const options: Record<string, unknown> = {
    key: keyId,
    key_id: keyId,
    amount: amountPaise,
    currency: args.payment?.currency || "INR",
    name: "CampusBite",
    description: args.description || "CampusBite order payment",
    order_id: razorpayOrderId,
    prefill: {
      name: args.customerName,
      email: args.customerEmail || "",
      contact: args.customerPhone || "",
    },
    theme: {
      color: "#f97316",
    },
    handler: (response: RazorpayCheckoutSuccess) => {
      args.onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        args.onDismiss();
      },
    },
  };

  try {
    const rzp = new window.Razorpay(options);

    rzp.on("payment.failed", (response: unknown) => {
      const reason =
        typeof response === "object" &&
        response &&
        "error" in response &&
        typeof (response as { error?: { description?: string } }).error
          ?.description === "string"
          ? (response as { error: { description: string } }).error.description
          : "payment_failed";
      args.onFailure?.(reason);
    });

    rzp.open();
  } catch (err) {
    args.onDismiss?.();
    throw err;
  }
}

export type UpiIntentOptions = {
  amount: number;
  orderId: string;
  vpa?: string;
  payeeName?: string;
  app?: "generic" | "upi";
};

/**
 * Builds a standard UPI URI (upi://pay?...).
 * Manual paytmmp:// and phonepe:// schemes are removed in favor of
 * Razorpay's native checkout modal.
 */
export function buildUpiIntentUrl({
  amount,
  orderId,
  vpa = CAMPUSBITE_DEFAULT_UPI_ID,
  payeeName = "CampusBite Operations",
}: UpiIntentOptions): string {
  const encPayee = encodeURIComponent(payeeName);
  const encNote = encodeURIComponent(`CB-Order-${orderId.slice(-6).toUpperCase()}`);
  const amt = amount.toFixed(2);
  const upiParams = `pa=${vpa}&pn=${encPayee}&am=${amt}&cu=INR&tn=${encNote}`;

  return `upi://pay?${upiParams}`;
}

export type TriggerCheckoutArgs = OpenCheckoutArgs & {
  upiIntentUrl?: string;
  onFallbackToDesktopModal?: () => void;
  onFailure?: (reason?: string) => void;
  customUserAgent?: string;
};

export type TriggerCheckoutResult = {
  mode: "razorpay_modal";
  intentUrl?: string;
};

/**
 * Uses Razorpay's native checkout.js popup:
 * - Call `new window.Razorpay(options).open()`.
 * - On Desktop: Razorpay will natively display the UPI QR code for scanning.
 * - On Mobile: Razorpay will natively present the installed UPI app options.
 * No custom intent redirections or paytmmp:// / phonepe:// schemes.
 */
export async function triggerUpiOrRazorpayCheckout(
  args: TriggerCheckoutArgs
): Promise<TriggerCheckoutResult> {
  await openRazorpayCheckout(args);
  return { mode: "razorpay_modal" };
}
