"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

export default function RestaurantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RestaurantError]:", error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <div className="flex w-full max-w-lg flex-col items-center justify-center rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-gray-900">
          Restaurant Portal Error
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Failed to load this restaurant view. You can retry or head back to your dashboard.
        </p>

        {isDev && error?.message && (
          <details className="mt-4 max-w-full text-left">
            <summary className="cursor-pointer text-xs font-semibold text-red-600 hover:underline">
              Error details (Development only)
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-gray-900 p-3 text-xs font-mono text-red-300">
              {error.name}: {error.message}
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

          <Link
            href={ROUTES.RESTAURANT_DASHBOARD}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
