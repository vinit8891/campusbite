import React from "react";

export type OrdersHeaderProps = {
  totalOrders: number;
  activeOrdersCount: number;
};

export function OrdersHeader({
  totalOrders,
  activeOrdersCount,
}: OrdersHeaderProps) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 p-5 text-white shadow-xl sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl shadow-inner">
            📦
          </div>

          <div>
            <p className="text-sm font-medium text-orange-100">
              Your order history
            </p>

            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
              My Orders
            </h1>

            <p className="mt-1 text-sm text-orange-100">
              Track current orders and reorder your favourites.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-orange-600 shadow-sm">
            {totalOrders} {totalOrders === 1 ? "Order" : "Orders"}
          </span>

          {activeOrdersCount > 0 && (
            <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
              {activeOrdersCount} Active
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
