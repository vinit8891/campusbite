"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/lib/routes";
import { AuthHttpError } from "@/services/authFetch";

import {
  getSubscriptionCalendar,
  type SubscriptionCalendar,
} from "@/services/subscriptionService";
import {
  monthKey,
  formatMonthTitle,
  buildCalendarDays,
} from "@/lib/subscriptionDomain";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function SubscriptionCalendarPage() {

  const { isLoggedIn } = useAuth();
  const [month, setMonth] = useState(monthKey(new Date()));
  const [calendar, setCalendar] = useState<SubscriptionCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const mealDates = useMemo(() => {
    const set = new Set<string>();
    for (const meal of [
      ...(calendar?.today_meals ?? []),
      ...(calendar?.upcoming_meals ?? []),
    ]) {
      set.add(meal.date);
    }
    return set;
  }, [calendar]);

  const skippedSet = useMemo(
    () => new Set(calendar?.skipped_dates ?? []),
    [calendar]
  );
  const pausedSet = useMemo(
    () => new Set(calendar?.paused_dates ?? []),
    [calendar]
  );

  const cells = useMemo(() => buildCalendarDays(month), [month]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        if (!isLoggedIn && !localStorage.getItem("token")) {
          setError("Please log in to view your meal calendar.");
          setCalendar(null);
          return;
        }

        const data = await getSubscriptionCalendar(month);
        setCalendar(data);
      } catch (err) {
        if (err instanceof AuthHttpError && err.status === 401) return;
        setError(
          err instanceof Error ? err.message : "Unable to load meal calendar"
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [isLoggedIn, month]);

  function shiftMonth(delta: number) {
    const [year, monthNum] = month.split("-").map(Number);
    const next = new Date(year, monthNum - 1 + delta, 1);
    setMonth(monthKey(next));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Meal Calendar</h1>
            <p className="mt-1 text-muted-foreground">
              Read-only schedule view. No orders are generated automatically.
            </p>
          </div>
          <Link href={ROUTES.SUBSCRIPTIONS}>
            <Button variant="outline">Back to subscriptions</Button>
          </Link>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mb-6 flex items-center justify-between rounded-2xl border bg-white p-4 shadow-sm">
          <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">{formatMonthTitle(month)}</h2>
          <Button variant="outline" size="icon" onClick={() => shiftMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            Meal day
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            Skipped
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-slate-400" />
            Paused
          </span>
        </div>

        {loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="grid grid-cols-7 border-b bg-gray-50 text-center text-xs font-medium uppercase text-muted-foreground">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="px-2 py-3">
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((cell, index) => {
                  if (!cell.date || cell.day === null) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-24 border-b border-r bg-gray-50/60"
                      />
                    );
                  }

                  const isMeal = mealDates.has(cell.date);
                  const isSkipped = skippedSet.has(cell.date);
                  const isPaused = pausedSet.has(cell.date);

                  let cellClass = "bg-white";
                  if (isPaused) cellClass = "bg-slate-100";
                  else if (isSkipped) cellClass = "bg-amber-50";
                  else if (isMeal) cellClass = "bg-green-50";

                  return (
                    <div
                      key={cell.date}
                      className={`min-h-24 border-b border-r p-2 ${cellClass}`}
                    >
                      <div className="text-sm font-medium">{cell.day}</div>
                      {isMeal ? (
                        <div className="mt-2 text-xs text-green-800">Meal</div>
                      ) : null}
                      {isSkipped ? (
                        <div className="mt-2 text-xs text-amber-800">Skipped</div>
                      ) : null}
                      {isPaused ? (
                        <div className="mt-2 text-xs text-slate-700">Paused</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-semibold">Today&apos;s meals</h3>
                {(calendar?.today_meals.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No meals today.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {calendar?.today_meals.map((meal) => (
                      <li key={`${meal.subscription_id}-${meal.date}`}>
                        <span className="font-medium capitalize">
                          {meal.meal_type}
                        </span>
                        {meal.plan_name ? ` · ${meal.plan_name}` : ""}
                        {meal.start_time && meal.end_time
                          ? ` (${meal.start_time}–${meal.end_time})`
                          : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-semibold">Upcoming meals</h3>
                {(calendar?.upcoming_meals.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No upcoming meals in this range.
                  </p>
                ) : (
                  <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                    {calendar?.upcoming_meals.slice(0, 12).map((meal) => (
                      <li key={`${meal.subscription_id}-${meal.date}`}>
                        <span className="font-medium">
                          {new Date(`${meal.date}T00:00:00`).toLocaleDateString()}
                        </span>
                        {" · "}
                        <span className="capitalize">{meal.meal_type}</span>
                        {meal.plan_name ? ` · ${meal.plan_name}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
