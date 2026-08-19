import { useState } from "react";
import type {
  Subscription,
  SubscriptionRenewalResponse,
} from "@/services/subscriptionService";

export function useRenewalState() {
  const [billingBusy, setBillingBusy] = useState<string | null>(null);
  const [mockOpen, setMockOpen] = useState(false);
  const [mockBusy, setMockBusy] = useState(false);
  const [pendingRenewal, setPendingRenewal] = useState<{
    subscription: Subscription;
    payment: SubscriptionRenewalResponse;
  } | null>(null);

  return {
    billingBusy,
    setBillingBusy,
    mockOpen,
    setMockOpen,
    mockBusy,
    setMockBusy,
    pendingRenewal,
    setPendingRenewal,
  };
}
