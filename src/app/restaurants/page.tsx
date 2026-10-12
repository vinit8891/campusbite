import { Suspense } from "react";

import RestaurantsPage from "./RestaurantsClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50">
          <div className="w-full max-w-md md:max-w-7xl mx-auto px-4 py-10">
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
