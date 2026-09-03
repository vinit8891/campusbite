"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminFinancialSummaryCards from "@/components/admin/AdminFinancialSummaryCards";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import { ROUTES } from "@/lib/routes";
import {
  AuthHttpError,
  getAdminStats,
  getAdminAnalytics,
  getBackendHealth,
  type AdminStats,
  type AdminFinancialAnalytics,
  type BackendHealth,
} from "@/services/adminService";

const STAT_CARDS: {
  key: keyof Pick<
    AdminStats,
    "users" | "restaurant_owners" | "restaurants" | "delivery_partners" | "orders"
  >;
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
  { key: "orders", label: "Total Orders", valueClass: "text-slate-800" },
];

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminFinancialAnalytics | null>(null);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      try {
        const [statsData, analyticsData, healthData] = await Promise.all([
          getAdminStats(),
          getAdminAnalytics().catch(() => null),
          getBackendHealth().catch(() => null),
        ]);
        if (cancelled) return;
        setStats(statsData);
        // If analytics endpoint succeeded, use it; otherwise fallback to statsData financial keys if present
        if (analyticsData) {
          setAnalytics(analyticsData);
        } else if (statsData && statsData.total_revenue !== undefined) {
          setAnalytics({
            total_revenue: statsData.total_revenue ?? 0,
            platform_earnings: statsData.platform_earnings ?? 0,
            total_orders: statsData.total_orders ?? 0,
            restaurant_settlements: statsData.restaurant_settlements ?? 0,
            courier_payouts: statsData.courier_payouts ?? 0,
            gst_pool: statsData.gst_pool ?? 0,
            average_order_value: statsData.average_order_value ?? 0,
          });
        }
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
            : "Unable to load admin dashboard statistics"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <AdminPageHeader title="Admin Dashboard" />
        <AdminTableSkeleton rows={1} columns={4} />
        <AdminTableSkeleton rows={1} columns={5} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <AdminPageHeader
        title="Admin Dashboard"
        description="Platform revenue, fund distributions, and management quick actions"
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

      {!error && !stats && !analytics ? (
        <AdminEmptyState
          title="No statistics available"
          description="Try refreshing the page after logging in again."
        />
      ) : (
        <>
          {/* Financial Metrics & Fund Distribution */}
          <section aria-label="Platform Financial Metrics">
            <AdminFinancialSummaryCards analytics={analytics} />
          </section>

          {/* Platform Directory Document Counts */}
          <section aria-label="Platform Directory" className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              Platform Directory
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {STAT_CARDS.map((card) => (
                <div
                  key={card.key}
                  className="rounded-2xl border bg-white p-5 shadow-sm"
                >
                  <h3 className="text-sm font-semibold text-gray-600">
                    {card.label}
                  </h3>
                  <p className={`mt-3 text-4xl font-bold ${card.valueClass}`}>
                    {stats?.[card.key] ?? 0}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
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
