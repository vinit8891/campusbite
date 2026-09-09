import { Suspense } from "react";
import SuccessCard from "@/components/order/SuccessCard";

export default function OrderSuccessPage() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center px-6">
      <Suspense
        fallback={
          <div className="w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-lg">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-amber-500" />
            <p className="mt-4 text-xs font-semibold text-stone-500">
              Loading confirmation...
            </p>
          </div>
        }
      >
        <SuccessCard />
      </Suspense>
    </main>
  );
}