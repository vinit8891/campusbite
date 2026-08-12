"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bike, Package } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import { AuthHttpError } from "@/services/authFetch";
import {
  getDeliveryStats,
  type DeliveryDashboardOrder,
  type DeliveryDashboardStats,
} from "@/services/deliveryPartnerService";

type DeliveryPartner = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  vehicle?: string;
  vehicle_number?: string;
};

const EMPTY_STATS: DeliveryDashboardStats = {
  pending: 0,
  completed: 0,
  earnings: 0,
  rating: 0,
  assigned_orders: 0,
  picked_up_orders: 0,
  delivered_today: 0,
  earnings_today: 0,
  total_deliveries: 0,
  recent_assigned_orders: [],
};

const REFRESH_MS = 8000;

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-28 w-full rounded-3xl" />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-36 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-3xl" />
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClass,
  hint,
}: {
  label: string;
  value: string;
  valueClass: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <h2 className={`mt-2 text-4xl font-bold ${valueClass}`}>{value}</h2>
      {hint ? <p className="mt-2 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

function RecentAssignedOrderCard({ order }: { order: DeliveryDashboardOrder }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">
            {order.restaurant_email || "Restaurant"}
          </h3>
          <p className="mt-1 text-gray-700">
            {order.customer_name || "Customer"}
          </p>
          <p className="text-gray-500">{order.phone || "—"}</p>
          <p className="mt-1 text-sm text-gray-500">
            {order.address || "Address not available"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-orange-600">
            ₹{order.total ?? 0}
          </p>
          <span className="mt-2 inline-block rounded bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
            {order.status || "Assigned"}
          </span>
        </div>
      </div>

      {Array.isArray(order.items) && order.items.length > 0 ? (
        <>
          <hr className="my-4" />
          <div className="space-y-2 text-sm text-gray-600">
            {order.items.slice(0, 3).map((item, index) => (
              <div
                key={item.id || `${item.name}-${index}`}
                className="flex justify-between gap-3"
              >
                <span>
                  {item.name || "Item"} × {item.quantity || 1}
                </span>
                <span>
                  ₹{(item.price || 0) * (item.quantity || 1)}
                </span>
              </div>
            ))}
            {order.items.length > 3 ? (
              <p className="text-xs text-gray-400">
                +{order.items.length - 3} more items
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function DeliveryDashboard() {
  const [partner, setPartner] = useState<DeliveryPartner | null>(null);
  const [stats, setStats] = useState<DeliveryDashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const current = getDeliveryPartnerSession();
      if (current) {
        setPartner(current);
      }
    } catch (err) {
      console.error("Failed to load delivery partner:", err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const currentPartner = getDeliveryPartnerSession();
        const phone = currentPartner?.phone;

        if (!phone) {
          if (!cancelled) {
            setError("Delivery partner phone not found. Please log in again.");
            setLoading(false);
          }
          return;
        }

        const data = await getDeliveryStats(phone);

        if (!cancelled) {
          setStats({
            ...EMPTY_STATS,
            ...data,
            recent_assigned_orders: data.recent_assigned_orders || [],
          });
          setError("");
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        if (err instanceof AuthHttpError && err.status === 401) {
          return;
        }
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load delivery dashboard"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    const interval = setInterval(loadDashboard, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const assigned = stats.assigned_orders ?? 0;
  const pickedUp = stats.picked_up_orders ?? 0;
  const deliveredToday = stats.delivered_today ?? 0;
  const earningsToday = stats.earnings_today ?? 0;
  const totalDeliveries = stats.total_deliveries ?? stats.completed ?? 0;
  const recent = stats.recent_assigned_orders || [];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold">
          Welcome, {partner?.name || "Delivery Partner"}
        </h1>
        <p className="mt-2 text-gray-500">
          Manage your deliveries and earnings.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Live updates every {REFRESH_MS / 1000} seconds
        </p>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 border-t pt-6">
          <h2 className="text-xl font-semibold">Partner Information</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <p className="text-lg text-gray-600">
              <span className="font-semibold text-gray-800">Name:</span>{" "}
              {partner?.name || "—"}
            </p>
            <p className="text-lg text-gray-600">
              <span className="font-semibold text-gray-800">Phone:</span>{" "}
              {partner?.phone || "—"}
            </p>
            <p className="text-lg text-gray-600">
              <span className="font-semibold text-gray-800">Email:</span>{" "}
              {partner?.email || "—"}
            </p>
            <p className="text-lg text-gray-600">
              <span className="font-semibold text-gray-800">Vehicle:</span>{" "}
              {partner?.vehicle || "—"}
            </p>
            <p className="text-lg text-gray-600">
              <span className="font-semibold text-gray-800">
                Vehicle Number:
              </span>{" "}
              {partner?.vehicle_number || "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Assigned Orders"
          value={String(assigned)}
          valueClass="text-orange-600"
        />
        <StatCard
          label="Picked Up"
          value={String(pickedUp)}
          valueClass="text-blue-600"
        />
        <StatCard
          label="Delivered Today"
          value={String(deliveredToday)}
          valueClass="text-green-600"
        />
        <StatCard
          label="Earnings Today"
          value={`₹${earningsToday}`}
          valueClass="text-emerald-700"
        />
        <StatCard
          label="Total Deliveries"
          value={String(totalDeliveries)}
          valueClass="text-slate-800"
          hint={`All-time earnings ₹${stats.earnings ?? 0}`}
        />
      </div>

      <section className="rounded-3xl bg-white p-8 shadow">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Recent Assigned Orders</h2>
            <p className="mt-1 text-sm text-gray-500">
              Latest orders waiting for pickup
            </p>
          </div>
          <Link
            href="/delivery/dashboard/orders"
            className="text-sm font-medium text-orange-600 hover:underline"
          >
            View my orders
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-orange-50/60 px-6 py-14 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-orange-500" />
            <h3 className="text-xl font-semibold text-gray-800">
              No assigned orders right now
            </h3>
            <p className="mt-2 text-gray-500">
              When you accept a delivery, it will show up here.
            </p>
            <Link
              href="/delivery/dashboard/available-orders"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
            >
              <Bike className="h-4 w-4" />
              Browse available orders
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recent.map((order) => (
              <RecentAssignedOrderCard key={order._id} order={order} />
            ))}
          </div>
        )}
      </section>

      <Link
        href="/delivery/dashboard/history"
        className="block rounded-2xl border bg-white p-6 shadow transition hover:shadow-lg"
      >
        <h2 className="text-xl font-bold">Delivery History</h2>
        <p className="mt-2 text-gray-500">
          View all completed deliveries.
        </p>
      </Link>
    </div>
  );
}
