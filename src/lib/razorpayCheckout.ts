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
  payment: CreatePaymentResponse;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  onSuccess: (result: RazorpayCheckoutSuccess) => void;
  onDismiss: () => void;
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
    const existing = document.querySelector(
      'script[data-campusbite-razorpay="1"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.campusbiteRazorpay = "1";
    script.onload = () => resolve(true);
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

  if (!args.keyId.startsWith("rzp_test_") && !args.keyId.startsWith("rzp_live_")) {
    throw new Error("Invalid Razorpay key format. Key must start with rzp_live_ or rzp_test_.");
  }

  const rzp = new window.Razorpay({
    key: args.keyId,
    amount: args.payment.amount_paise,
    currency: args.payment.currency || "INR",
    name: "CampusBite",
    description: args.description || "CampusBite order payment",
    order_id: args.payment.razorpay_order_id,
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
  });

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
}

export type UpiIntentOptions = {
  amount: number;
  orderId: string;
  vpa?: string;
  payeeName?: string;
  app?: "generic" | "phonepe" | "gpay" | "paytm";
};

/**
 * Builds a valid UPI intent URI (e.g. phonepe://pay?... or upi://pay?...).
 */
export function buildUpiIntentUrl({
  amount,
  orderId,
  vpa = CAMPUSBITE_DEFAULT_UPI_ID,
  payeeName = "CampusBite Operations",
  app = "generic",
}: UpiIntentOptions): string {
  const encPayee = encodeURIComponent(payeeName);
  const encNote = encodeURIComponent(`CB-Order-${orderId.slice(-6).toUpperCase()}`);
  const amt = amount.toFixed(2);
  const upiParams = `pa=${vpa}&pn=${encPayee}&am=${amt}&cu=INR&tn=${encNote}`;

  if (app === "phonepe") {
    return `phonepe://pay?${upiParams}`;
  }
  return `upi://pay?${upiParams}`;
}

export type TriggerCheckoutArgs = OpenCheckoutArgs & {
  upiIntentUrl?: string;
  onFallbackToDesktopModal?: () => void;
  onFailure?: (reason?: string) => void;
  customUserAgent?: string;
};

export type TriggerCheckoutResult = {
  mode: "mobile_intent" | "razorpay_modal" | "desktop_qr_modal";
  intentUrl?: string;
};

/**
 * Handles mobile UPI intent links vs desktop PC browser fallback:
 * - On mobile devices (Android/iOS): continues opening the UPI app intent link.
 * - On desktop/PC browsers: launches standard Razorpay checkout modal (`new Razorpay(options).open()`)
 *   or renders a scannable UPI QR code modal so desktop users can scan it with their phone
 *   instead of failing with "scheme does not have a registered handler".
 */
export async function triggerUpiOrRazorpayCheckout(
  args: TriggerCheckoutArgs
): Promise<TriggerCheckoutResult> {
  const isMobile = isMobileDevice(args.customUserAgent);

  if (isMobile && args.upiIntentUrl) {
    if (typeof window !== "undefined") {
      window.location.href = args.upiIntentUrl;
    }
    return { mode: "mobile_intent", intentUrl: args.upiIntentUrl };
  }

  // Desktop or fallback request
  if (!isMobile && args.onFallbackToDesktopModal) {
    args.onFallbackToDesktopModal();
    return { mode: "desktop_qr_modal" };
  }

  await openRazorpayCheckout(args);
  return { mode: "razorpay_modal" };
}
