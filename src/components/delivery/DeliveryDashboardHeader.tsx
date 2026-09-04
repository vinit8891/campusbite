import type { DeliveryPartner } from "@/types";
import { REFRESH_MS } from "@/hooks/delivery/useDeliveryDashboard";

type DeliveryDashboardHeaderProps = {
  partner: DeliveryPartner | null;
  error: string;
};

export function DeliveryDashboardHeader({
  partner,
  error,
}: DeliveryDashboardHeaderProps) {
  const firstName = partner?.name?.trim().split(/\s+/)[0] || "Runner";

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-amber-200/60 bg-gradient-to-r from-amber-100/70 via-orange-50 to-white p-5 sm:p-7 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-600/10 px-2.5 py-0.5 text-xs font-bold text-orange-700">
            ✨ Courier Hub
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Dispatch
          </span>
        </div>

        <span className="text-[11px] text-stone-400 font-medium">
          Syncs every {REFRESH_MS / 1000}s
        </span>
      </div>

      <h1 className="mt-3 text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-stone-900">
        Hey, {firstName}! 🛵 Ready for your next run?
      </h1>

      <p className="mt-1.5 text-xs sm:text-sm text-stone-600 max-w-xl">
        Manage your active campus runs, claim high-density batch drops, and track your daily runner payouts in real time.
      </p>

      {error ? (
        <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-700 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}

export default DeliveryDashboardHeader;
