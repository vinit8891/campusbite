import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { formatUpdatedTime } from "@/lib/formatters";

type TrackOrderHeaderProps = {
  lastUpdated: Date | null;
  statusConfig: {
    label: string;
    className: string;
    dotClassName: string;
  };
};

export function TrackOrderHeader({
  lastUpdated,
  statusConfig,
}: TrackOrderHeaderProps) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={ROUTES.MY_ORDERS}
          className="inline-flex items-center text-sm font-semibold text-gray-500 transition hover:text-orange-600"
        >
          ← Back to Orders
        </Link>

        <span
          suppressHydrationWarning
          className="text-xs font-medium text-gray-400"
          aria-live="polite"
        >
          {formatUpdatedTime(lastUpdated)}
        </span>
      </div>

      <div className="w-full rounded-3xl bg-zinc-900 text-white p-5 sm:p-6 shadow-lg border border-zinc-800 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-orange-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          {/* Top Meta: Live status pulse */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-2.5 py-1 text-[11px] font-medium text-zinc-300 border border-zinc-700/60 backdrop-blur-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Tracking
            </span>
          </div>

          {/* Title & Description */}
          <div className="mt-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Track Your Order
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Follow your order in real-time from the restaurant to your door.
            </p>
          </div>

          {/* Elegant Unified Status Pill */}
          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-1 text-xs font-semibold">
                <span className={`h-2 w-2 rounded-full ${statusConfig.dotClassName}`} />
                <span>{statusConfig.label}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
