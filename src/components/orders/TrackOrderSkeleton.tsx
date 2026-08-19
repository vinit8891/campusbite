export function TrackOrderSkeleton() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 h-5 w-32 animate-pulse rounded bg-gray-200" />

        {/* Hero Skeleton */}
        <section className="animate-pulse rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 p-5 shadow-xl sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/25" />

              <div>
                <div className="h-4 w-32 rounded bg-white/25" />
                <div className="mt-2 h-8 w-64 rounded bg-white/30" />
                <div className="mt-2 h-4 w-48 rounded bg-white/20" />
              </div>
            </div>

            <div className="h-10 w-36 rounded-full bg-white/20" />
          </div>
        </section>

        {/* Status Skeleton */}
        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="h-3 w-28 animate-pulse rounded bg-gray-200" />
              <div className="mt-3 h-9 w-36 animate-pulse rounded-full bg-gray-100" />
            </div>

            <div className="h-16 w-44 animate-pulse rounded-xl bg-orange-50" />
          </div>
        </div>

        {/* Timeline Skeleton */}
        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />

          <div className="mt-5 space-y-4">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-4 animate-pulse rounded bg-gray-100"
              />
            ))}
          </div>
        </div>

        {/* Partner Skeleton */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex gap-3">
                <div className="h-11 w-11 rounded-xl bg-gray-200" />

                <div className="flex-1">
                  <div className="h-3 w-24 rounded bg-gray-200" />
                  <div className="mt-3 h-5 w-36 rounded bg-gray-200" />
                  <div className="mt-2 h-4 w-28 rounded bg-gray-100" />
                  <div className="mt-2 h-4 w-32 rounded bg-gray-100" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Map Skeleton */}
        <div className="mt-4 h-[500px] animate-pulse rounded-3xl bg-gray-200" />
      </div>
    </main>
  );
}
