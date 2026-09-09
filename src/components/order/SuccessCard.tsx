"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ROUTES, orderDetailsPath, trackOrderPath } from "@/lib/routes";

export default function SuccessCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resolvedOrderId, setResolvedOrderId] = useState<string>("");

  useEffect(() => {
    const fromQuery = searchParams.get("orderId");
    if (fromQuery && fromQuery.trim() && fromQuery !== "undefined" && fromQuery !== "null") {
      setResolvedOrderId(fromQuery.trim());
      return;
    }

    if (typeof window !== "undefined") {
      try {
        const lastRaw = localStorage.getItem("cb_last_order");
        if (lastRaw) {
          const last = JSON.parse(lastRaw);
          const id = last?._id || last?.id;
          if (id) {
            setResolvedOrderId(String(id));
            return;
          }
        }
        const activeId = localStorage.getItem("cb_active_order_id");
        if (activeId && activeId !== "undefined" && activeId !== "null") {
          setResolvedOrderId(activeId);
        }
      } catch {
        // ignore
      }
    }
  }, [searchParams]);

  const handleViewDetails = () => {
    if (resolvedOrderId) {
      router.push(orderDetailsPath(resolvedOrderId));
    } else {
      router.push(ROUTES.MY_ORDERS);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-8 sm:p-10 text-center shadow-lg animate-in fade-in zoom-in-95 duration-300">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-5xl">
        🎉
      </div>

      <h1 className="mt-6 text-3xl font-extrabold text-stone-900 sm:text-4xl">
        Order Placed Successfully!
      </h1>

      {resolvedOrderId ? (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
          <span>Order ID:</span>
          <span className="font-mono text-amber-900">
            #{resolvedOrderId.slice(-8).toUpperCase()}
          </span>
        </div>
      ) : null}

      <p className="mt-4 text-sm text-stone-600">
        Thank you for ordering with CampusBite. Your canteen is actively preparing your items.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          type="button"
          onClick={handleViewDetails}
          className="w-full sm:w-auto px-7 py-3 font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
        >
          View Details
        </Button>

        {resolvedOrderId ? (
          <Link href={trackOrderPath(resolvedOrderId)} className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full px-7 py-3 font-bold text-blue-600 border-blue-200 hover:bg-blue-50 rounded-xl"
            >
              📍 Track Order
            </Button>
          </Link>
        ) : null}

        <Link href={ROUTES.HOME} className="w-full sm:w-auto">
          <Button
            variant="ghost"
            className="w-full px-7 py-3 font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
          >
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}