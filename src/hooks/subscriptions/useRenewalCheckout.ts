import { useState } from "react";
import { toast } from "sonner";
import { openRazorpayCheckout } from "@/lib/razorpayCheckout";
import { getRazorpayConfig } from "@/services/paymentService";
import { isSubscriptionExpired } from "@/lib/subscriptionDomain";
import {
  type Subscription,
  type SubscriptionRenewalResponse,
  mockCompleteSubscriptionRenewal,
  renewSubscription,
  retrySubscriptionPayment,
  todayIsoDate,
  verifySubscriptionRenewal,
} from "@/services/subscriptionService";


export function useRenewalCheckout(onReload: () => Promise<void>) {
  const [billingBusy, setBillingBusy] = useState<string | null>(null);
  const [mockOpen, setMockOpen] = useState(false);
  const [mockBusy, setMockBusy] = useState(false);
  const [pendingRenewal, setPendingRenewal] = useState<{
    subscription: Subscription;
    payment: SubscriptionRenewalResponse;
  } | null>(null);

  async function runRenewalCheckout(
    subscription: Subscription,
    payment: SubscriptionRenewalResponse
  ) {
    const config = await getRazorpayConfig();
    if (!config.enabled || !payment.key_id) {
      throw new Error("Online payments are not available right now.");
    }

    if (config.mode === "mock" || config.mock_checkout_available) {
      setPendingRenewal({ subscription, payment });
      setMockOpen(true);
      return;
    }

    await openRazorpayCheckout({
      keyId: payment.key_id,
      payment: {
        order_id: subscription.subscription_id,
        payment_id: payment.payment_id,
        razorpay_order_id: payment.razorpay_order_id,
        amount: payment.amount,
        amount_paise: payment.amount_paise,
        currency: payment.currency,
        key_id: payment.key_id,
        payment_status: payment.payment_status,
      },
      customerName: subscription.customer_email,
      customerEmail: subscription.customer_email,
      description: `Subscription renewal · ${subscription.plan_name || subscription.meal_type}`,
      onSuccess: async (result) => {
        try {
          const verified = await verifySubscriptionRenewal(
            subscription.subscription_id,
            {
              ...result,
              payment_id: payment.payment_id,
            }
          );
          if (verified.success) {
            toast.success("Subscription renewed successfully");
          } else {
            toast.error("Payment verification failed");
          }
          await onReload();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Payment verification failed"
          );
          await onReload();
        } finally {
          setBillingBusy(null);
        }
      },
      onDismiss: () => {
        setBillingBusy(null);
        toast.message("Payment cancelled");
      },
      onFailure: async () => {
        toast.error("Payment failed");
        await onReload();
        setBillingBusy(null);
      },
    });
  }

  async function handleRenew(subscription: Subscription) {
    const today = todayIsoDate();
    const isExpired = isSubscriptionExpired(
      subscription.status,
      subscription.end_date,
      today
    );
    if (

      isExpired &&
      !window.confirm(
        "This subscription has expired. Continue with manual renewal?"
      )
    ) {
      return;
    }

    setBillingBusy(subscription.subscription_id);
    try {
      const payment = await renewSubscription(
        subscription.subscription_id,
        isExpired
      );
      await runRenewalCheckout(subscription, payment);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start renewal");
      setBillingBusy(null);
    }
  }

  async function handleRetry(subscription: Subscription) {
    setBillingBusy(subscription.subscription_id);
    try {
      const payment = await retrySubscriptionPayment(
        subscription.subscription_id
      );
      await runRenewalCheckout(subscription, payment);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to retry payment");
      setBillingBusy(null);
    }
  }

  async function runMockRenewalOutcome(
    outcome: "success" | "failure" | "dismiss"
  ) {
    if (!pendingRenewal || mockBusy) return;
    setMockBusy(true);
    try {
      const result = await mockCompleteSubscriptionRenewal(
        pendingRenewal.subscription.subscription_id,
        outcome
      );

      if (outcome === "success" && result.payment_status === "paid") {
        toast.success("Subscription renewed successfully");
      } else if (outcome === "failure") {
        toast.error("Payment failed");
      } else {
        toast.message("Payment cancelled");
      }
      setMockOpen(false);
      setPendingRenewal(null);
      await onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mock payment failed");
    } finally {
      setMockBusy(false);
      setBillingBusy(null);
    }
  }

  return {
    billingBusy,
    mockOpen,
    mockBusy,
    pendingRenewal,
    handleRenew,
    handleRetry,
    runMockRenewalOutcome,
  };
}
