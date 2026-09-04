import {
  Building2,
  Store,
  Navigation,
  Zap,
  User,
  MapPin,
  FileText,
} from "lucide-react";
import { formatRestaurantName, shortId } from "@/lib/formatters";
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

  const formattedRestaurants = batch.restaurants
    .map((r) => formatRestaurantName(r))
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(" • ");

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 via-orange-50/20 to-white p-4 sm:p-6 shadow-xs transition-all hover:shadow-md">
      {/* Batch Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-200/60 pb-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-orange-600 px-2.5 py-1 text-[11px] font-black tracking-wide text-white shadow-xs">
              ⚡ BATCH DROP
            </span>
            <span className="rounded-xl bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
              {batch.orders.length} {batch.orders.length === 1 ? "Order" : "Orders"}
            </span>
          </div>

          <h3 className="flex items-center gap-2 text-lg sm:text-2xl font-black text-stone-900 tracking-tight pt-1">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 shrink-0" />
            <span>{batch.building}</span>
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-stone-600 pt-0.5">
            <Store className="h-3.5 w-3.5 text-stone-400 shrink-0" />
            <span className="font-semibold text-stone-700">Pickup:</span>
            <span className="font-medium text-stone-800 truncate">
              {formattedRestaurants || "Campus Eatery"}
            </span>
          </div>
        </div>

        {/* Unclipped Payout Badge */}
        <div className="rounded-2xl bg-emerald-100/90 border border-emerald-200 px-3.5 py-2 text-right shrink-0">
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
            Combined Payout
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-900 leading-tight">
            💰 ₹{batch.estimatedPayout}
          </div>
          <span className="block text-[10px] text-emerald-700 font-bold">
            ({batch.orders.length} drops • ₹20/ea)
          </span>
        </div>
      </div>

      {/* Orders List in Batch */}
      <div className="my-4 space-y-2.5">
        {batch.orders.map((order) => {
          const isSingleClaiming = claimingIds.includes(order._id);
          const canteenName = formatRestaurantName(
            order.restaurant_name || order.restaurant_email
          );

          return (
            <div
              key={order._id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-white p-3 sm:p-4 shadow-xs"
            >
              <div className="min-w-0 space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">
                    #{shortId(order._id)}
                  </span>
                  <span className="text-xs font-extrabold text-stone-900">
                    🏪 {canteenName}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600">
                  <p className="flex items-center gap-1.5 font-medium text-stone-800">
                    <User className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                    <span>{order.customer_name || "Student"}</span>
                    {order.phone && (
                      <span className="text-stone-400">• {order.phone}</span>
                    )}
                  </p>

                  <p className="flex items-center gap-1.5 font-semibold text-stone-700 truncate">
                    <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    <span className="truncate">
                      {order.address || batch.building}
                    </span>
                  </p>
                </div>

                {/* Customer Note Callout Bubble if present */}
                {order.special_instructions || (order as { notes?: string }).notes ? (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200/70 px-2.5 py-1 text-[11px] font-medium text-amber-900">
                    <FileText className="h-3 w-3 text-amber-600 shrink-0" />
                    <span>Note: {order.special_instructions || (order as { notes?: string }).notes}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                <span className="text-sm font-black text-stone-800">
                  ₹{order.total ?? 0}
                </span>

                <button
                  type="button"
                  onClick={() => onClaimSingle(order._id)}
                  disabled={isSingleClaiming || isBatchClaiming}
                  className="rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-2 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSingleClaiming ? "Claiming…" : "Claim Single"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Batch Action Footer with 48px Touch Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <span className="text-xs font-semibold text-stone-500 flex items-center gap-1">
          <span>💡</span>
          <span>Deliver all {batch.orders.length} orders in a single hostel run</span>
        </span>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onNavigate && batch.orders[0] && (
            <button
              type="button"
              onClick={() => onNavigate(batch.orders[0])}
              className="h-12 flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Navigation className="h-4 w-4 text-blue-600" />
              <span className="hidden sm:inline">Map</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onClaimBatch(orderIds)}
            disabled={isBatchClaiming}
            className="h-12 flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-5 sm:px-6 text-sm font-black shadow-sm hover:shadow transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
          >
            <Zap className="h-4 w-4 fill-white shrink-0" />
            <span>
              {isBatchClaiming
                ? "Claiming Batch…"
                : `Claim Batch Run (${batch.orders.length} Orders)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default BatchOrderGroupCard;
