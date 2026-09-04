import { Building2, IndianRupee, Store, Navigation, Zap, User, Phone, MapPin } from "lucide-react";
import { shortId } from "@/lib/formatters";
import type { AvailableOrder } from "@/hooks/delivery/useAvailableOrders";

export type BatchGroup = {
  building: string;
  orders: AvailableOrder[];
  estimatedPayout: number;
  restaurants: string[];
};

type BatchOrderGroupCardProps = {
  batch: BatchGroup;
  claimingIds: string[];
  onClaimBatch: (orderIds: string[]) => void;
  onClaimSingle: (orderId: string) => void;
  onNavigate?: (order: AvailableOrder) => void;
};

export function BatchOrderGroupCard({
  batch,
  claimingIds,
  onClaimBatch,
  onClaimSingle,
  onNavigate,
}: BatchOrderGroupCardProps) {
  const isBatchClaiming = batch.orders.some((o) => claimingIds.includes(o._id));
  const orderIds = batch.orders.map((o) => o._id);

  return (
    <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 via-orange-50/20 to-white p-5 sm:p-7 shadow-sm transition-all hover:shadow-md">
      {/* Batch Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-amber-200/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-orange-600 px-2.5 py-1 text-xs font-black text-white shadow-xs">
              ⚡ BATCH RUN
            </span>
            <span className="rounded-xl bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
              {batch.orders.length} {batch.orders.length === 1 ? "Order" : "Orders"}
            </span>
          </div>

          <h3 className="flex items-center gap-2 text-xl sm:text-2xl font-black text-stone-900 tracking-tight pt-1">
            <Building2 className="h-6 w-6 text-orange-600 shrink-0" />
            <span>{batch.building}</span>
          </h3>

          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 pt-1">
            <Store className="h-3.5 w-3.5 text-stone-400 shrink-0" />
            <span className="font-semibold text-stone-700">Pickup from:</span>
            <span>{batch.restaurants.join(" • ")}</span>
          </div>
        </div>

        {/* Payout Tag */}
        <div className="text-right">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
            Est. Runner Payout
          </span>
          <div className="flex items-center justify-end text-2xl sm:text-3xl font-black text-emerald-700">
            <IndianRupee className="h-6 w-6" />
            <span>{batch.estimatedPayout}</span>
          </div>
          <span className="text-[10px] text-stone-500 font-medium">
            (₹{Math.round(batch.estimatedPayout / batch.orders.length)} / drop)
          </span>
        </div>
      </div>

      {/* Orders List in Batch */}
      <div className="my-5 space-y-3">
        {batch.orders.map((order) => {
          const isSingleClaiming = claimingIds.includes(order._id);

          return (
            <div
              key={order._id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-white p-3.5 sm:p-4 shadow-xs"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">
                    #{shortId(order._id)}
                  </span>
                  <span className="text-xs font-bold text-stone-900 truncate">
                    {order.restaurant_email || "Campus Canteen"}
                  </span>
                </div>

                <p className="flex items-center gap-1.5 text-xs text-stone-600 truncate">
                  <User className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <span className="font-medium text-stone-800">
                    {order.customer_name || "Student"}
                  </span>
                  {order.phone && (
                    <span className="text-stone-400">• {order.phone}</span>
                  )}
                </p>

                <p className="flex items-center gap-1.5 text-xs text-stone-600 truncate">
                  <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  <span className="font-semibold text-stone-700 truncate">
                    {order.address || batch.building}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-stone-800">
                  ₹{order.total ?? 0}
                </span>

                <button
                  type="button"
                  onClick={() => onClaimSingle(order._id)}
                  disabled={isSingleClaiming || isBatchClaiming}
                  className="rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSingleClaiming ? "Claiming…" : "Claim Single"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Batch Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <span className="text-xs font-semibold text-stone-500">
          💡 Deliver all {batch.orders.length} orders together in one campus drop
        </span>

        <div className="flex items-center gap-2">
          {onNavigate && batch.orders[0] && (
            <button
              type="button"
              onClick={() => onNavigate(batch.orders[0])}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Navigation className="h-3.5 w-3.5 text-blue-600" />
              <span>Map Route</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onClaimBatch(orderIds)}
            disabled={isBatchClaiming}
            className="flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 text-xs font-extrabold shadow-sm hover:shadow transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            <Zap className="h-4 w-4 fill-white" />
            <span>
              {isBatchClaiming
                ? "Claiming Batch Run…"
                : `Claim Batch Run (${batch.orders.length} Orders)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
