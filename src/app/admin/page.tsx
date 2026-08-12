"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  AuthHttpError,
  getAdminStats,
  type AdminStats,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const data = await getAdminStats();
        if (cancelled) return;
        setStats(data);
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
      <div className="p-10 text-center text-xl text-gray-500">
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/restaurants"
            className="rounded-lg bg-orange-500 px-5 py-3 text-white"
          >
            Manage Restaurants
          </Link>
          <Link
            href="/admin/add-restaurant"
            className="rounded-lg bg-green-600 px-5 py-3 text-white"
          >
            Add Restaurant
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="rounded-2xl bg-white p-6 shadow"
          >
            <h2 className="font-semibold text-gray-600">{card.label}</h2>
            <p className={`mt-4 text-5xl font-bold ${card.valueClass}`}>
              {stats?.[card.key] ?? 0}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
