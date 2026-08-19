import React from "react";

export type OrderStatsSummaryProps = {
  total: number;
  active: number;
  delivered: number;
  cancelled: number;
  className?: string;
};

export function OrderStatsSummary({
  total,
  active,
  delivered,
  cancelled,
  className = "",
}: OrderStatsSummaryProps) {
  return (
    <div
      className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${className}`}
    >
      <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Total Orders
        </p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{total}</p>
      </div>

      <div className="rounded-2xl border border-green-100 bg-green-50/50 p-4 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
          Active
        </p>
        <p className="mt-1 text-2xl font-bold text-green-700">{active}</p>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Delivered
        </p>
        <p className="mt-1 text-2xl font-bold text-blue-700">{delivered}</p>
      </div>

      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
          Cancelled
        </p>
        <p className="mt-1 text-2xl font-bold text-red-700">{cancelled}</p>
      </div>
    </div>
  );
}
