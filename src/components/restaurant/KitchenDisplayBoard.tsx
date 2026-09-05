"use client";

import React from "react";
import {
  CheckCircle2,
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
import {
  isNewOrder,
  isCookingOrder,
  isReadyOrder,
  isOrderStale,
} from "@/lib/orderDomain";
import type { Order } from "@/types";

export type MobileKdsTab = "new" | "cooking" | "ready" | "all";

type KitchenDisplayBoardProps = {
  orders: Order[];
  onUpdateStatus: (id: string, nextStatus: string) => void;
  soundEnabled?: boolean;
  activeMobileTab?: MobileKdsTab;
  onSwitchToHistory?: () => void;
};

export function KitchenDisplayBoard({
  orders,
  onUpdateStatus,
  activeMobileTab = "all",
  onSwitchToHistory,
}: KitchenDisplayBoardProps) {
  const pendingOrders = orders.filter(
    (o) => isNewOrder(o.status) && !isOrderStale(o.created_at)
  );
  const inKitchenOrders = orders.filter(
    (o) => isCookingOrder(o.status) && !isOrderStale(o.created_at)
  );
  const readyOrders = orders.filter(
    (o) => isReadyOrder(o.status) && !isOrderStale(o.created_at)
  );

  const totalActive =
    pendingOrders.length + inKitchenOrders.length + readyOrders.length;

  if (totalActive === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border-2 border-dashed border-stone-200 bg-white min-h-[50vh] shadow-2xs">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50 border border-orange-200/60 text-4xl mb-4 shadow-xs">
          <span role="img" aria-label="Chef">
            👨‍🍳
          </span>
        </div>
        <h2 className="text-xl font-black text-stone-900 tracking-tight">
          Kitchen is all caught up!
        </h2>
        <p className="text-sm text-stone-500 mt-1.5 max-w-md font-medium">
          New student orders will alert you here as soon as they are placed.
        </p>
        {onSwitchToHistory && (
          <button
            type="button"
            onClick={onSwitchToHistory}
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-extrabold shadow-sm active:scale-98 transition-all cursor-pointer"
          >
            <span>📋 View All Past Orders ({orders.length})</span>
          </button>
        )}
      </div>
    );
  }

  // Determine visibility of columns on mobile (< md) based on activeMobileTab
  const showPendingOnMobile =
    activeMobileTab === "all" || activeMobileTab === "new";
  const showKitchenOnMobile =
    activeMobileTab === "all" || activeMobileTab === "cooking";
  const showReadyOnMobile =
    activeMobileTab === "all" || activeMobileTab === "ready";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 min-h-[65vh]">
      {/* =========================================================
          COLUMN 1: NEW ORDERS (PENDING)
      ========================================================= */}
      <div
        className={`flex flex-col rounded-3xl border-2 border-orange-200/90 bg-orange-50/40 p-3.5 sm:p-5 shadow-xs transition-all ${
          showPendingOnMobile ? "flex" : "hidden md:flex"
        }`}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-orange-200/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-sm shadow-orange-600/30">
              <BellRing className="h-5 w-5 animate-bounce" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-900 tracking-tight">
                New Orders
              </h2>
              <p className="text-[11px] font-semibold text-orange-800">
                Action required immediately
              </p>
            </div>
          </div>
          <span className="flex h-7 min-w-7 px-2.5 items-center justify-center rounded-full bg-orange-600 text-white font-extrabold text-xs shadow-xs">
            {pendingOrders.length}
          </span>
        </div>

        {/* Order Cards List */}
        <div className="space-y-3.5 sm:space-y-4 overflow-y-auto flex-1 pr-0.5">
          {pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <span className="text-2xl mb-1.5 opacity-60">🔔</span>
              <p className="text-xs font-bold text-stone-600">No new incoming orders</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Awaiting new student orders.</p>
            </div>
          ) : (
            pendingOrders.map((order) => {
              const isUnpaidOnline =
                isOnlinePayment(order.payment_method) &&
                order.payment_status !== "paid";

              return (
                <div
                  key={order._id}
                  className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-md"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-stone-400">
                        #{shortId(order._id)}
                      </span>
                      <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-1.5 mt-0.5">
                        <User className="h-4 w-4 text-orange-600 shrink-0" />
                        <span>{order.customer_name}</span>
                      </h3>
                      {order.phone && (
                        <a
                          href={`tel:${order.phone}`}
                          className="text-xs font-semibold text-stone-600 hover:text-orange-600 active:text-orange-700 flex items-center gap-1 mt-0.5 transition-colors cursor-pointer"
                        >
                          <Phone className="h-3 w-3 text-stone-400" />
                          <span>{order.phone}</span>
                        </a>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <OrderPrepTimer
                        createdAt={order.created_at}
                        status={order.status}
                      />
                      <span className="text-sm font-black text-orange-600">
                        ₹{Number(order.total ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Location & Mode */}
                  <div className="my-2.5 rounded-xl bg-stone-50 p-2 text-xs text-stone-700">
                    <div className="flex items-center gap-1.5 font-bold text-stone-900">
                      {order.delivery_type === "HOSTEL_BATCH" ? (
                        <Building className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                      ) : (
                        <Bike className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      )}
                      <span className="truncate">
                        {order.hostel_block || "Campus Delivery"}
                      </span>
                      <span className="text-[10px] font-semibold text-stone-500">
                        ({order.delivery_type === "HOSTEL_BATCH" ? "Hostel Batch" : "Express"})
                      </span>
                    </div>
                  </div>

                  {/* Customer Notes / Address Callout Bubble */}
                  {order.address && (
                    <div className="my-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 p-2.5 text-xs text-amber-950 flex items-start gap-1.5">
                      <span className="text-sm leading-none shrink-0">📝</span>
                      <div className="min-w-0">
                        <p className="font-bold text-[11px] text-amber-800 uppercase tracking-wide">
                          Special Instructions / Location
                        </p>
                        <p className="font-semibold text-xs text-amber-900 mt-0.5">
                          {order.address}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Itemized Order Breakdown */}
                  <div className="space-y-1.5 my-3">
                    {order.items.map((item) => (
                      <div
                        key={`${order._id}-${item.id}`}
                        className="flex items-center justify-between text-sm bg-orange-50/30 rounded-xl px-3 py-2 border border-orange-100/60"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex items-center justify-center rounded-lg bg-orange-600 text-white font-black text-xs px-2.5 py-0.5 shrink-0 shadow-xs">
                            {item.quantity}×
                          </span>
                          <span className="font-extrabold text-stone-900 truncate">
                            {item.name}
                          </span>
                        </div>
                        <span className="font-extrabold text-stone-700 shrink-0 ml-2">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Payment Details */}
                  <div className="mb-3 flex items-center justify-between text-xs">
                    <span className="text-xs text-stone-500 font-medium">
                      {formatPaymentMethod(order.payment_method)}
                    </span>
                    <PaymentStatusBadge
                      status={order.payment_status}
                      method={order.payment_method}
                      orderStatus={order.status}
                    />
                  </div>

                  {isUnpaidOnline && (
                    <p className="mb-3 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                      ⚠️ Online payment pending. Await payment confirmation before cooking.
                    </p>
                  )}

                  {/* Touch Action Buttons (Oversized 48px height) */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isUnpaidOnline}
                      onClick={() => onUpdateStatus(order._id, "Accepted")}
                      className="h-12 flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm shadow-sm active:scale-98 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Accept Order (15m)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(order._id, "Cancelled")}
                      className="h-12 px-4 rounded-xl bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-600 font-bold text-xs border border-stone-200 transition-colors cursor-pointer active:scale-98"
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
      <div
        className={`flex flex-col rounded-3xl border-2 border-blue-200/90 bg-blue-50/30 p-3.5 sm:p-5 shadow-xs transition-all ${
          showKitchenOnMobile ? "flex" : "hidden md:flex"
        }`}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-blue-200/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
              <span className="text-lg">👨‍🍳</span>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-900 tracking-tight">
                In Kitchen
              </h2>
              <p className="text-[11px] font-semibold text-blue-800">
                Cooking & packing meals
              </p>
            </div>
          </div>
          <span className="flex h-7 min-w-7 px-2.5 items-center justify-center rounded-full bg-blue-600 text-white font-extrabold text-xs shadow-xs">
            {inKitchenOrders.length}
          </span>
        </div>

        {/* Order Cards List */}
        <div className="space-y-3.5 sm:space-y-4 overflow-y-auto flex-1 pr-0.5">
          {inKitchenOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <span className="text-2xl mb-1.5 opacity-60">🍲</span>
              <p className="text-xs font-bold text-stone-600">No active cooking orders</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Accepted orders will appear here ready for prep & packaging.
              </p>
            </div>
          ) : (
            inKitchenOrders.map((order) => {
              return (
                <div
                  key={order._id}
                  className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-stone-400">
                        #{shortId(order._id)}
                      </span>
                      <h3 className="text-base font-extrabold text-stone-900 mt-0.5">
                        {order.customer_name}
                      </h3>
                      {order.phone && (
                        <a
                          href={`tel:${order.phone}`}
                          className="text-xs font-semibold text-stone-600 hover:text-blue-600 active:text-blue-700 flex items-center gap-1 mt-0.5 transition-colors cursor-pointer"
                        >
                          <Phone className="h-3 w-3 text-stone-400" />
                          <span>{order.phone}</span>
                        </a>
                      )}
                    </div>
                    <OrderPrepTimer
                      createdAt={order.created_at}
                      status="Preparing"
                    />
                  </div>

                  {/* Dishes to Prepare */}
                  <div className="space-y-1.5 my-3">
                    {order.items.map((item) => (
                      <div
                        key={`${order._id}-${item.id}`}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/50 border border-blue-100/80"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-7 min-w-7 px-1.5 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-black shrink-0">
                            {item.quantity}×
                          </span>
                          <span className="text-sm font-extrabold text-stone-900 truncate">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-blue-700 shrink-0 ml-2">
                          In Prep
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Instructions Callout */}
                  {order.address && (
                    <div className="my-2.5 rounded-xl bg-amber-50/80 border border-amber-200/70 p-2.5 text-xs text-amber-950 flex items-start gap-1.5">
                      <span>📝</span>
                      <p className="font-semibold text-xs text-amber-900 truncate">
                        {order.hostel_block ? `${order.hostel_block} • ` : ""}
                        {order.address}
                      </p>
                    </div>
                  )}

                  {/* Action Button (Oversized 48px height) */}
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateStatus(order._id, "Ready for Pickup")
                    }
                    className="h-12 w-full mt-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-sm active:scale-98 flex items-center justify-center gap-2 transition-all cursor-pointer"
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
      <div
        className={`flex flex-col rounded-3xl border-2 border-emerald-200/90 bg-emerald-50/30 p-3.5 sm:p-5 shadow-xs transition-all ${
          showReadyOnMobile ? "flex" : "hidden md:flex"
        }`}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-emerald-200/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-900 tracking-tight">
                Ready for Pickup
              </h2>
              <p className="text-[11px] font-semibold text-emerald-800">
                Awaiting student / rider pickup
              </p>
            </div>
          </div>
          <span className="flex h-7 min-w-7 px-2.5 items-center justify-center rounded-full bg-emerald-600 text-white font-extrabold text-xs shadow-xs">
            {readyOrders.length}
          </span>
        </div>

        {/* Order Cards List */}
        <div className="space-y-3.5 sm:space-y-4 overflow-y-auto flex-1 pr-0.5">
          {readyOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <span className="text-2xl mb-1.5 opacity-60">✨</span>
              <p className="text-xs font-bold text-stone-600">No orders awaiting pickup</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Packaged meals ready for pickup will appear here.
              </p>
            </div>
          ) : (
            readyOrders.map((order) => {
              return (
                <div
                  key={order._id}
                  className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-stone-400">
                        #{shortId(order._id)}
                      </span>
                      <h3 className="text-base font-extrabold text-stone-900 mt-0.5">
                        {order.customer_name}
                      </h3>
                      {order.phone && (
                        <a
                          href={`tel:${order.phone}`}
                          className="text-xs font-semibold text-stone-600 hover:text-emerald-600 active:text-emerald-700 flex items-center gap-1 mt-0.5 transition-colors cursor-pointer"
                        >
                          <Phone className="h-3 w-3 text-stone-400" />
                          <span>{order.phone}</span>
                        </a>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Ready</span>
                    </span>
                  </div>

                  <div className="my-3 text-xs text-stone-700 space-y-1.5">
                    <p className="font-bold text-stone-900 text-sm">
                      {order.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}
                    </p>
                    <p className="text-xs text-stone-500">
                      📍 {order.hostel_block || order.address}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      ⚡ Ready at Counter
                    </span>
                    <span className="font-black text-stone-900 text-sm">
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

