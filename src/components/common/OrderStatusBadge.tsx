import React from "react";

export type OrderStatus =
  | "Pending"
  | "Accepted"
  | "Preparing"
  | "Ready for Pickup"
  | "Assigned"
  | "Picked Up"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled"
  | "Rejected"
  | string;

export type OrderStatusBadgeProps = {
  status?: OrderStatus | null;
  variant?: "pill" | "dot" | "subtle";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const STATUS_MAP: Record<
  string,
  {
    label: string;
    pillClass: string;
    dotClass: string;
  }
> = {
  Pending: {
    label: "Pending",
    pillClass: "bg-orange-100 text-orange-700",
    dotClass: "bg-orange-500",
  },
  Accepted: {
    label: "Accepted",
    pillClass: "bg-blue-100 text-blue-700",
    dotClass: "bg-blue-500",
  },
  Preparing: {
    label: "Preparing",
    pillClass: "bg-yellow-100 text-yellow-700",
    dotClass: "bg-yellow-500",
  },
  "Ready for Pickup": {
    label: "Ready for Pickup",
    pillClass: "bg-purple-100 text-purple-700",
    dotClass: "bg-purple-500",
  },
  Assigned: {
    label: "Assigned",
    pillClass: "bg-indigo-100 text-indigo-700",
    dotClass: "bg-indigo-500",
  },
  "Picked Up": {
    label: "Picked Up",
    pillClass: "bg-blue-100 text-blue-700",
    dotClass: "bg-blue-500",
  },
  "Out for Delivery": {
    label: "Out for Delivery",
    pillClass: "bg-cyan-100 text-cyan-700",
    dotClass: "bg-cyan-500",
  },
  Delivered: {
    label: "Delivered",
    pillClass: "bg-green-100 text-green-700",
    dotClass: "bg-green-500",
  },
  Cancelled: {
    label: "Cancelled",
    pillClass: "bg-red-100 text-red-700",
    dotClass: "bg-red-500",
  },
  Rejected: {
    label: "Rejected",
    pillClass: "bg-red-100 text-red-700",
    dotClass: "bg-red-500",
  },
};

export function getOrderStatusStyles(status?: string | null) {
  if (!status) {
    return {
      label: "—",
      pillClass: "bg-gray-100 text-gray-700",
      dotClass: "bg-gray-500",
    };
  }

  return (
    STATUS_MAP[status] ?? {
      label: status,
      pillClass: "bg-gray-100 text-gray-700",
      dotClass: "bg-gray-500",
    }
  );
}

export function OrderStatusBadge({
  status,
  variant = "pill",
  size = "md",
  className = "",
}: OrderStatusBadgeProps) {
  const config = getOrderStatusStyles(status);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-xs font-semibold",
    lg: "px-4 py-2 text-sm font-bold",
  }[size];

  if (variant === "dot") {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full ${sizeClasses} ${config.pillClass} ${className}`}
      >
        <span className={`h-2 w-2 rounded-full ${config.dotClass}`} />
        {config.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-block rounded-full ${sizeClasses} ${config.pillClass} ${className}`}
    >
      {config.label}
    </span>
  );
}
