"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import { ROUTES } from "@/constants/routes";
import {
  AuthHttpError,
  getAdminStats,
  getBackendHealth,
  type AdminStats,
  type BackendHealth,
} from "@/services/adminService";

const STAT_CARDS: {
  key: keyof AdminStats;
  label: string;
  valueClass: string;
}[] = [
  { key: "users", label: "Users", valueClass: "text-blue-600" },
  {
    key: "restaurant_owners",
    label: "Restaurant Owners",
    valueClass: "text-orange-600",
  },
  {
    key: "restaurants",
    label: "Restaurants",
    valueClass: "text-green-600",
  },
  {
    key: "delivery_partners",
    label: "Delivery Partners",
    valueClass: "text-teal-600",
  },
  { key: "orders", label: "Orders", valueClass: "text-slate-800" },
];

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const [data, healthData] = await Promise.all([
          getAdminStats(),
          getBackendHealth().catch(() => null),
        ]);
        if (cancelled) return;
        setStats(data);
        setHealth(healthData);
        setError("");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AuthHttpError && err.status === 401) {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load admin statistics"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <AdminPageHeader title="Admin Dashboard" />
        <AdminTableSkeleton rows={1} columns={5} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <AdminPageHeader
        title="Admin Dashboard"
        description="Platform overview and quick actions"
        actions={
          <>
            <Link
              href={ROUTES.ADMIN_RESTAURANTS}
              className="inline-flex h-10 items-center rounded-lg bg-orange-500 px-4 text-sm font-medium text-white hover:bg-orange-600"
            >
              Manage Restaurants
            </Link>
            <Link
              href={ROUTES.ADMIN_ADD_RESTAURANT}
              className="inline-flex h-10 items-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white hover:bg-green-700"
            >
              Add Restaurant
            </Link>
            <Link
              href={ROUTES.ADMIN_ORDERS}
              className="inline-flex h-10 items-center rounded-lg border bg-white px-4 text-sm font-medium hover:bg-gray-50"
            >
              View Orders
            </Link>
          </>
        }
      />

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {!error && !stats ? (
        <AdminEmptyState
          title="No statistics available"
          description="Try refreshing the page after logging in again."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {STAT_CARDS.map((card) => (
            <div
              key={card.key}
              className="rounded-2xl border bg-white p-5 shadow-sm"
            >
              <h2 className="text-sm font-semibold text-gray-600">
                {card.label}
              </h2>
              <p className={`mt-3 text-4xl font-bold ${card.valueClass}`}>
                {stats?.[card.key] ?? 0}
              </p>
            </div>
          ))}
        </div>
      )}

      <footer className="border-t pt-4 text-center text-xs text-gray-400">
        {health?.version ? (
          <p>
            Backend v{health.version}
            {health.environment ? ` · ${health.environment}` : ""}
          </p>
        ) : (
          <p>Backend version unavailable</p>
        )}
      </footer>
    </div>
  );
}
