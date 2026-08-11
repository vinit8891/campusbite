import type { CreatePaymentResponse } from "@/services/paymentService";

export type RazorpayCheckoutSuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type OpenCheckoutArgs = {
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
 * Opens Razorpay Checkout (test mode). Does not mark payment paid —
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

  if (args.keyId.startsWith("rzp_live_")) {
    throw new Error("Live Razorpay keys are not allowed.");
  }

  if (!args.keyId.startsWith("rzp_test_")) {
    throw new Error("Only Razorpay test keys (rzp_test_*) are allowed.");
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
