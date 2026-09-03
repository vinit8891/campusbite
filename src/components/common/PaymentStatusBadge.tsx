import React from "react";
import { formatPaymentStatus, isCodPayment } from "@/lib/paymentLabels";

export type PaymentStatusBadgeProps = {
  status?: string | null;
  method?: string | null;
  orderStatus?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function getPaymentStatusClass(
  paymentStatus?: string | null,
  paymentMethod?: string | null,
  orderStatus?: string | null
): string {
  const status = paymentStatus?.toLowerCase() ?? "";
  const oStatus = orderStatus?.toLowerCase() ?? "";

  if (
    status === "paid" ||
    status === "completed" ||
    (isCodPayment(paymentMethod) && oStatus === "delivered")
  ) {
    return "bg-green-100 text-green-700";
  }

  if (status.includes("fail") || status === "cancelled") {
    return "bg-red-100 text-red-700";
  }

  if (status === "refunded" || status === "partially_refunded") {
    return "bg-purple-100 text-purple-700";
  }

  if (isCodPayment(paymentMethod)) {
    return "bg-blue-100 text-blue-700";
  }

  if (status === "pending" || status === "processing") {
    return "bg-yellow-100 text-yellow-700";
  }

  return "bg-gray-100 text-gray-700";
}

function PaymentStatusBadgeComponent({
  status,
  method,
  orderStatus,
  className = "",
  size = "md",
}: PaymentStatusBadgeProps) {
  const colorClass = getPaymentStatusClass(status, method, orderStatus);
  const label = formatPaymentStatus(
    status ?? undefined,
    method ?? undefined,
    orderStatus ?? undefined
  );

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-xs font-semibold",
    lg: "px-4 py-2 text-sm font-bold",
  }[size];

  return (
    <span
      className={`inline-block rounded-full ${sizeClasses} ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}

export const PaymentStatusBadge = React.memo(PaymentStatusBadgeComponent);
export default PaymentStatusBadge;
