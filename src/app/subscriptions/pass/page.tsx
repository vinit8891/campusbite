"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Utensils, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentMealPassCard } from "@/components/subscriptions/StudentMealPassCard";
import { ROUTES } from "@/lib/routes";
import { useAuth } from "@/context/AuthContext";
import {
  getMySubscriptions,
  type Subscription,
} from "@/services/subscriptionService";

export default function StudentMealPassPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const items = await getMySubscriptions();
        const activeItems = items.filter(
          (s) => s.status === "active" || s.status === "paused"
        );
        setSubscriptions(activeItems);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load student meal pass"
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const currentSubscription = subscriptions[selectedIndex] || null;

  return (
    <div className="min-h-screen bg-stone-50/70 text-stone-900">
      <Navbar />

      <main className="mx-auto max-w-xl px-4 py-8 sm:px-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={ROUTES.SUBSCRIPTIONS}
            className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Subscriptions Hub</span>
          </Link>

          <Link href={ROUTES.SUBSCRIPTIONS_CALENDAR}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs border-stone-300 text-stone-700 hover:bg-stone-100"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Meal Calendar</span>
            </Button>
          </Link>
        </div>

        {/* Header Title */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-stone-900 flex items-center justify-center gap-2">
            <span>🎟️ Digital Meal Pass</span>
          </h1>
          <p className="text-xs text-stone-500">
            Show this daily pass at your campus mess counter to redeem meals
          </p>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-[480px] w-full rounded-3xl" />
          </div>
        ) : !currentSubscription ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center space-y-4 shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <Utensils className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-stone-900">
                No Active Mess Subscription
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                You don&apos;t have an active meal plan. Subscribe to a campus mess to get your daily counter QR pass.
              </p>
            </div>
            <Link href={ROUTES.SUBSCRIPTIONS}>
              <Button className="h-10 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs">
                Browse Mess Plans
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Multi-Plan Tabs if user has more than 1 active subscription */}
            {subscriptions.length > 1 && (
              <div className="flex justify-center gap-2 p-1 bg-stone-200/70 rounded-2xl max-w-xs mx-auto">
                {subscriptions.map((sub, idx) => (
                  <button
                    key={sub.subscription_id}
                    onClick={() => setSelectedIndex(idx)}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                      selectedIndex === idx
                        ? "bg-white text-stone-900 shadow-xs"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {sub.meal_type.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            <StudentMealPassCard
              subscription={currentSubscription}
              studentName={user?.name || "Campus Student"}
              studentPhone={user?.phone || "+91 98765 43210"}
              onSubscriptionUpdate={(updated) => {
                setSubscriptions((prev) =>
                  prev.map((s) =>
                    s.subscription_id === updated.subscription_id ? updated : s
                  )
                );
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
