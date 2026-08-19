import Link from "next/link";
import { ROUTES } from "@/lib/routes";

type TrackOrderErrorStateProps = {
  error: string;
  onRetry: () => void;
};

export function TrackOrderErrorState({
  error,
  onRetry,
}: TrackOrderErrorStateProps) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <section className="w-full rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl">
            😕
          </div>

          <h1 className="mt-5 text-2xl font-extrabold text-gray-900">
            Unable to load tracking
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            {error ||
              "We couldn't retrieve the live tracking information for this order."}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Retry
            </button>

            <Link
              href={ROUTES.MY_ORDERS}
              className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-orange-300 hover:text-orange-600"
            >
              Back to Orders
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
