type DeliveryDashboardStatCardsProps = {
  assigned: number;
  pickedUp: number;
  deliveredToday: number;
  earningsToday: number;
  totalDeliveries: number;
  allTimeEarnings?: number;
  rating?: number;
};

export function DeliveryDashboardStatCards({
  assigned,
  pickedUp,
  deliveredToday,
  earningsToday,
  totalDeliveries,
  allTimeEarnings,
  rating = 4.9,
}: DeliveryDashboardStatCardsProps) {
  const activeRuns = assigned + pickedUp;

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
      {/* 💰 Today's Earnings */}
      <div className="rounded-2xl sm:rounded-3xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 sm:p-5 text-emerald-950 shadow-xs transition-all hover:shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-800/80">
            Today&apos;s Earnings
          </p>
          <span className="text-base sm:text-lg">💰</span>
        </div>
        <h2 className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-black tracking-tight text-emerald-950">
          ₹{earningsToday}
        </h2>
        <p className="mt-1 text-[10px] sm:text-xs font-medium text-emerald-700/80">
          +₹20 / completed run
        </p>
      </div>

      {/* 📦 Delivered Today */}
      <div className="rounded-2xl sm:rounded-3xl border border-blue-200/80 bg-blue-50/70 p-3.5 sm:p-5 text-blue-950 shadow-xs transition-all hover:shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-blue-800/80">
            Delivered Today
          </p>
          <span className="text-base sm:text-lg">📦</span>
        </div>
        <h2 className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-black tracking-tight text-blue-950">
          {deliveredToday}
        </h2>
        <p className="mt-1 text-[10px] sm:text-xs font-medium text-blue-700/80">
          Completed drops
        </p>
      </div>

      {/* ⚡ Active Runs */}
      <div
        className={`rounded-2xl sm:rounded-3xl border p-3.5 sm:p-5 shadow-xs transition-all hover:shadow-sm ${
          activeRuns > 0
            ? "border-amber-300 bg-amber-50/80 text-amber-950 ring-2 ring-amber-400/50"
            : "border-amber-200/80 bg-amber-50/70 text-amber-950"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-800/80">
            Active Runs
          </p>
          <span className="text-base sm:text-lg">⚡</span>
        </div>
        <h2 className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-black tracking-tight text-amber-950 flex items-center gap-1.5">
          {activeRuns}
          {activeRuns > 0 ? (
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
          ) : null}
        </h2>
        <p className="mt-1 text-[10px] sm:text-xs font-medium text-amber-700/80 truncate">
          {assigned} assigned • {pickedUp} in transit
        </p>
      </div>

      {/* ⭐ Runner Rating */}
      <div className="rounded-2xl sm:rounded-3xl border border-orange-200/80 bg-orange-50/70 p-3.5 sm:p-5 text-orange-950 shadow-xs transition-all hover:shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-orange-800/80">
            Runner Rating
          </p>
          <span className="text-base sm:text-lg">⭐</span>
        </div>
        <h2 className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-black tracking-tight text-orange-950">
          {Number(rating).toFixed(1)} ★
        </h2>
        <p className="mt-1 text-[10px] sm:text-xs font-medium text-orange-700/80">
          Campus courier score
        </p>
      </div>

      {/* 🏆 Total Deliveries (Col spans 2 on mobile if 5th item, or single on lg) */}
      <div className="col-span-2 md:col-span-4 lg:col-span-1 rounded-2xl sm:rounded-3xl border border-stone-200/80 bg-stone-50/70 p-3.5 sm:p-5 text-stone-900 shadow-xs transition-all hover:shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-600">
            Total Deliveries
          </p>
          <span className="text-base sm:text-lg">🚴</span>
        </div>
        <h2 className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-black tracking-tight text-stone-900">
          {totalDeliveries}
        </h2>
        <p className="mt-1 text-[10px] sm:text-xs font-medium text-stone-500">
          All-time ₹{allTimeEarnings ?? 0}
        </p>
      </div>
    </div>
  );
}

export default DeliveryDashboardStatCards;
