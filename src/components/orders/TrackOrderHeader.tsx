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
          className="text-xs font-medium text-gray-400"
          aria-live="polite"
        >
          {formatUpdatedTime(lastUpdated)}
        </span>
      </div>

      <section className="rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 p-5 text-white shadow-xl sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl shadow-inner">
              📍
            </div>

            <div>
              <p className="text-sm font-medium text-orange-100">
                Live delivery tracking
              </p>

              <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Track Your Order
              </h1>

              <p className="mt-1 text-sm text-orange-100">
                Follow your order from the restaurant to your door.
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-2 self-start rounded-full bg-white/15 px-4 py-2 backdrop-blur-sm sm:self-auto"
            aria-live="polite"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${statusConfig.dotClassName}`}
            />

            <span className="text-sm font-bold">
              {statusConfig.label}
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
