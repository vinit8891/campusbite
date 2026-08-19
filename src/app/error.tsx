"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]:", error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <main className="flex min-h-[70vh] w-full items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-lg flex-col items-center justify-center rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-gray-900">
          Something went wrong
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          We encountered an unexpected problem. Please try reloading the page or return home.
        </p>

        {isDev && error?.message && (
          <details className="mt-4 max-w-full text-left">
            <summary className="cursor-pointer text-xs font-semibold text-red-600 hover:underline">
              Error details (Development only)
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-gray-900 p-3 text-xs font-mono text-red-300">
              {error.name}: {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
            </pre>
          </details>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={reset}
            className="gap-2 bg-orange-600 hover:bg-orange-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>

          <Button
            variant="outline"
            onClick={() => window.location.assign("/")}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Go to home
          </Button>
        </div>
      </div>
    </main>
  );
}
