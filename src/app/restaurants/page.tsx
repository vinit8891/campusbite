import { Suspense } from "react";

import RestaurantsPage from "./RestaurantsClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-10">
            <div className="rounded-2xl border bg-white p-10 text-center">
              Loading restaurants...
            </div>
          </div>
        </main>
      }
    >
      <RestaurantsPage />
    </Suspense>
  );
}
