export const COD_PAYMENT_METHOD = "cod";
export const ONLINE_PAYMENT_METHOD = "online";

function normalizePaymentKey(method?: string | null): string {
  if (!method) return "";
  return method.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function isCodPayment(method?: string | null): boolean {
  const key = normalizePaymentKey(method);
  if (!key) return true;
  if (key === "cod" || key === "cash_on_delivery" || key === "cashondelivery") {
    return true;
  }
  return key.includes("cash") && !key.includes("online");
}

export function isOnlinePayment(method?: string | null): boolean {
  const key = normalizePaymentKey(method);
  return (
    key === "online" ||
    key === "online_payment" ||
    key === "razorpay" ||
    key.includes("upi") ||
    key.includes("card")
  );
}

/** Human-readable payment method for dashboards and checkout. */
export function formatPaymentMethod(method?: string | null): string {
  if (isOnlinePayment(method)) {
    return "Online Payment";
  }
  if (isCodPayment(method)) {
    return "Cash on Delivery (COD)";
  }
  return method || "Cash on Delivery (COD)";
}

/**
 * Payment status label.
 * For COD orders:
 * - If status is paid/completed or order is delivered: "Paid (Cash)"
 * - If active/pending: "Pending — pay on delivery"
 * For Online orders:
 * - Reflects gateway state ("Paid", "Processing", "Failed", etc.)
 */
export function formatPaymentStatus(
  status?: string | null,
  method?: string | null,
  orderStatus?: string | null
): string {
  const normStatus = status?.trim().toLowerCase() ?? "";
  const normOrderStatus = orderStatus?.trim().toLowerCase() ?? "";

  if (isCodPayment(method) && !isOnlinePayment(method)) {
    if (
      normStatus === "paid" ||
      normStatus === "completed" ||
      normOrderStatus === "delivered"
    ) {
      return "Paid (Cash)";
    }
    return "Pending — pay on delivery";
  }

  switch (normStatus) {
    case "paid":
    case "completed":
      return "Paid";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "refunded":
      return "Refunded";
    case "partially_refunded":
      return "Partially refunded";
    case "pending":
    default:
      return status || "Pending";
  }
}

export function isPaymentPaid(status?: string | null): boolean {
  return status?.trim().toLowerCase() === "paid";
}

export function isPaymentFailed(status?: string | null): boolean {
  const normalized = status?.trim().toLowerCase() ?? "";
  return normalized.includes("fail") || normalized === "cancelled";
}

