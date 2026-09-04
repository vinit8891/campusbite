"use client";

import React from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ChefHat,
  BellRing,
  PackageCheck,
  Bike,
  Building,
  User,
  Phone,
} from "lucide-react";
import { OrderPrepTimer } from "./OrderPrepTimer";
import { PaymentStatusBadge } from "@/components/common";
import { shortId } from "@/lib/formatters";
import { isOnlinePayment, formatPaymentMethod } from "@/lib/paymentLabels";
import type { Order } from "@/types";

type KitchenDisplayBoardProps = {
  orders: Order[];
  onUpdateStatus: (id: string, nextStatus: string) => void;
  soundEnabled?: boolean;
};

export function KitchenDisplayBoard({
  orders,
  onUpdateStatus,
}: KitchenDisplayBoardProps) {
  const pendingOrders = orders.filter((o) => o.status === "Pending");
  const inKitchenOrders = orders.filter(
    (o) => o.status === "Accepted" || o.status === "Preparing"
  );
  const readyOrders = orders.filter((o) => o.status === "Ready for Pickup");

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 min-h-[70vh]">
      {/* =========================================================
          COLUMN 1: NEW ORDERS (PENDING)
      ========================================================= */}
      <div className="flex flex-col rounded-3xl border-2 border-orange-200 bg-orange-50/40 p-4 shadow-sm">
        {/* Column Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-orange-200/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white shadow-xs">
              <BellRing className="h-5 w-5 animate-bounce" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-900 tracking-tight">
                New Orders
              </h2>
              <p className="text-[11px] font-medium text-orange-800">
                Action required immediately
              </p>
            </div>
          </div>
          <span className="flex h-7 px-2.5 items-center justify-center rounded-full bg-orange-600 text-white font-extrabold text-xs">
            {pendingOrders.length}
          </span>
        </div>

        {/* Order Cards List */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-stone-400">
              <PackageCheck className="h-10 w-10 text-stone-300 mb-2 stroke-[1.5]" />
              <p className="text-xs font-semibold">No pending orders</p>
              <p className="text-[11px] text-stone-400">Kitchen is all caught up</p>
            </div>
          ) : (
            pendingOrders.map((order) => {
              const isUnpaidOnline =
                isOnlinePayment(order.payment_method) &&
                order.payment_status !== "paid";

              return (
                <div
                  key={order._id}
                  className="rounded-2xl border-2 border-orange-300 bg-white p-4 shadow-md transition-all hover:shadow-lg animate-in fade-in"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
                    <div>
                      <span className="font-mono text-xs font-bold text-stone-500">
                        #{shortId(order._id)}
                      </span>
                      <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5 mt-0.5">
                        <User className="h-3.5 w-3.5 text-orange-600" />
                        <span>{order.customer_name}</span>
                      </h3>
                      {order.phone && (
                        <p className="text-[11px] font-medium text-stone-500 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-stone-400" />
                          <span>{order.phone}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <OrderPrepTimer
                        createdAt={order.created_at}
                        status={order.status}
                      />
                      <span className="text-xs font-black text-orange-600">
                        ₹{Number(order.total ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Location & Mode */}
                  <div className="my-2.5 rounded-xl bg-stone-50 p-2.5 text-xs text-stone-700">
                    <div className="flex items-center gap-1.5 font-bold text-stone-900">
                      {order.delivery_type === "HOSTEL_BATCH" ? (
                        <Building className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                      ) : (
                        <Bike className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      )}
                      <span className="truncate">
                        {order.hostel_block || "Campus Drop"}
                      </span>
                      <span className="text-[10px] font-semibold text-stone-500">
                        ({order.delivery_type === "HOSTEL_BATCH" ? "Hostel Batch" : "Express"})
                      </span>
                    </div>
                    {order.address && (
                      <p className="text-[11px] text-stone-600 truncate mt-0.5">
                        📍 {order.address}
                      </p>
                    )}
                  </div>

                  {/* Itemized Order List */}
                  <div className="space-y-1.5 my-3">
                    {order.items.map((item) => (
                      <div
                        key={`${order._id}-${item.id}`}
                        className="flex items-center justify-between text-xs bg-orange-50/40 rounded-lg px-2.5 py-1.5"
                      >
                        <span className="font-bold text-stone-900">
                          <span className="inline-block w-6 text-orange-600 font-extrabold">
                            {item.quantity}×
                          </span>
                          {item.name}
                        </span>
                        <span className="font-semibold text-stone-600">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Payment Alert */}
                  <div className="mb-3 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-stone-500 font-medium">
                      {formatPaymentMethod(order.payment_method)}
                    </span>
                    <PaymentStatusBadge
                      status={order.payment_status}
                      method={order.payment_method}
                      orderStatus={order.status}
                    />
                  </div>

                  {isUnpaidOnline && (
                    <p className="mb-2 text-[11px] font-semibold text-amber-700 bg-amber-50 p-2 rounded-lg">
                      ⚠️ Online payment pending. Await payment before prep.
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isUnpaidOnline}
                      onClick={() => onUpdateStatus(order._id, "Accepted")}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white font-extrabold text-xs shadow-sm shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Accept Order</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(order._id, "Cancelled")}
                      className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-600 font-bold text-xs border border-stone-200 transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =========================================================
          COLUMN 2: IN KITCHEN (PREPARING)
      ========================================================= */}
      <div className="flex flex-col rounded-3xl border-2 border-blue-200 bg-blue-50/30 p-4 shadow-sm">
        {/* Column Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-blue-200/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-900 tracking-tight">
                In Kitchen
              </h2>
              <p className="text-[11px] font-medium text-blue-800">
                Cooking & packing
              </p>
            </div>
          </div>
          <span className="flex h-7 px-2.5 items-center justify-center rounded-full bg-blue-600 text-white font-extrabold text-xs">
            {inKitchenOrders.length}
          </span>
        </div>

        {/* Order Cards List */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {inKitchenOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-stone-400">
              <ChefHat className="h-10 w-10 text-stone-300 mb-2 stroke-[1.5]" />
              <p className="text-xs font-semibold">No active cooking orders</p>
              <p className="text-[11px] text-stone-400">Accepted orders will show here</p>
            </div>
          ) : (
            inKitchenOrders.map((order) => {
              return (
                <div
                  key={order._id}
                  className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm hover:shadow-md transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
                    <div>
                      <span className="font-mono text-xs font-bold text-stone-500">
                        #{shortId(order._id)}
                      </span>
                      <h3 className="text-sm font-extrabold text-stone-900 mt-0.5">
                        {order.customer_name}
                      </h3>
                    </div>
                    <OrderPrepTimer
                      createdAt={order.created_at}
                      status="Preparing"
                    />
                  </div>

                  {/* Dishes to Prepare */}
                  <div className="space-y-2 my-3">
                    {order.items.map((item) => (
                      <div
                        key={`${order._id}-${item.id}`}
                        className="flex items-center justify-between p-2 rounded-xl bg-blue-50/50 border border-blue-100"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-extrabold">
                            {item.quantity}
                          </span>
                          <span className="text-xs font-bold text-stone-900">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-stone-500">
                          Ready in prep
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Instructions if any */}
                  {order.address && (
                    <p className="text-[11px] text-stone-500 truncate mb-3">
                      📍 {order.hostel_block ? `${order.hostel_block} • ` : ""}
                      {order.address}
                    </p>
                  )}

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateStatus(order._id, "Ready for Pickup")
                    }
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-extrabold text-xs shadow-sm shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <PackageCheck className="h-4 w-4" />
                    <span>Mark Ready for Pickup</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =========================================================
          COLUMN 3: READY FOR PICKUP
      ========================================================= */}
      <div className="flex flex-col rounded-3xl border-2 border-emerald-200 bg-emerald-50/30 p-4 shadow-sm">
        {/* Column Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-emerald-200/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-900 tracking-tight">
                Ready for Pickup
              </h2>
              <p className="text-[11px] font-medium text-emerald-800">
                Awaiting courier / student
              </p>
            </div>
          </div>
          <span className="flex h-7 px-2.5 items-center justify-center rounded-full bg-emerald-600 text-white font-extrabold text-xs">
            {readyOrders.length}
          </span>
        </div>

        {/* Order Cards List */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {readyOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-stone-400">
              <Clock className="h-10 w-10 text-stone-300 mb-2 stroke-[1.5]" />
              <p className="text-xs font-semibold">No orders awaiting pickup</p>
              <p className="text-[11px] text-stone-400">Dishes ready will appear here</p>
            </div>
          ) : (
            readyOrders.map((order) => {
              return (
                <div
                  key={order._id}
                  className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
                    <div>
                      <span className="font-mono text-xs font-bold text-stone-500">
                        #{shortId(order._id)}
                      </span>
                      <h3 className="text-sm font-extrabold text-stone-900 mt-0.5">
                        {order.customer_name}
                      </h3>
                      {order.phone && (
                        <p className="text-[11px] font-medium text-stone-500">
                          📞 {order.phone}
                        </p>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Ready</span>
                    </span>
                  </div>

                  <div className="my-2.5 text-xs text-stone-700 space-y-1">
                    <p className="font-bold text-stone-900">
                      {order.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      📍 {order.hostel_block || order.address}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      ⚡ Delivery Partner Assigned
                    </span>
                    <span className="font-bold text-stone-900">
                      ₹{Number(order.total ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default KitchenDisplayBoard;
