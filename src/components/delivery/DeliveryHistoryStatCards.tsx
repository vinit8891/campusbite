type DeliveryHistoryStatCardsProps = {
  totalDeliveries: number;
  weekDeliveries: number;
  monthDeliveries: number;
};

export function DeliveryHistoryStatCards({
  totalDeliveries,
  weekDeliveries,
  monthDeliveries,
}: DeliveryHistoryStatCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <div className="rounded-2xl border border-stone-200/80 bg-white p-3 sm:p-5 shadow-xs">
        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 truncate">
          Total Deliveries
        </p>
        <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-black text-stone-900">
          {totalDeliveries}
        </p>
      </div>
      <div className="rounded-2xl border border-orange-200/80 bg-orange-50/60 p-3 sm:p-5 shadow-xs">
        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-orange-700 truncate">
          This Week
        </p>
        <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-black text-orange-600">
          {weekDeliveries}
        </p>
      </div>
      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-3 sm:p-5 shadow-xs">
        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 truncate">
          This Month
        </p>
        <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-black text-emerald-700">
          {monthDeliveries}
        </p>
      </div>
    </div>
  );
}

export default DeliveryHistoryStatCards;
