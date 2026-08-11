"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  getAvailableOrders,
  getMyDeliveries,
} from "@/services/deliveryService";
import { getDeliveryStats } from "@/services/deliveryPartnerService";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import { AuthHttpError } from "@/services/authFetch";

type DeliveryPartner = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  vehicle?: string;
  vehicle_number?: string;
};

export default function DeliveryDashboard() {
  const [partner, setPartner] =
    useState<DeliveryPartner | null>(null);

  const [availableOrders, setAvailableOrders] = useState(0);
  const [myDeliveries, setMyDeliveries] = useState(0);
  const [earnings, setEarnings] = useState(0);

  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    earnings: 0,
    rating: 0,
  });

  // ==========================================
  // Load logged-in delivery partner
  // ==========================================

  useEffect(() => {
    try {
      const current = getDeliveryPartnerSession();
      if (current) {
        setPartner(current);
      }
    } catch (err) {
      console.error(
        "Failed to load delivery partner:",
        err
      );
    }
  }, []);

  // ==========================================
  // Load dashboard data
  // ==========================================

  useEffect(() => {
    async function loadDashboard() {
      try {
        const currentPartner = getDeliveryPartnerSession();
        const phone = currentPartner?.phone;

        const available =
          await getAvailableOrders();

        setAvailableOrders(available.length);

        if (phone) {
          const deliveries =
            await getMyDeliveries(phone);

          setMyDeliveries(deliveries.length);

          const delivered = deliveries.filter(
            (order: any) =>
              order.status === "Delivered"
          );

          setEarnings(delivered.length * 50);
        }
      } catch (err) {
        console.error(
          "Failed to load dashboard:",
          err
        );
        if (err instanceof AuthHttpError && err.status === 401) {
          return;
        }
      }
    }

    loadDashboard();

    const interval = setInterval(
      loadDashboard,
      5000
    );

    return () => clearInterval(interval);
  }, []);

  // ==========================================
  // Load general delivery statistics
  // ==========================================

  useEffect(() => {
    async function loadStats() {
      try {
        const currentPartner = getDeliveryPartnerSession();
    
        if (!currentPartner?.phone) {
          console.error(
            "Delivery partner phone not found"
          );
          return;
        }
    
        const data = await getDeliveryStats(currentPartner.phone);
        setStats(data);
      } catch (err) {
        console.error(
          "Failed to load delivery stats:",
          err
        );
        if (err instanceof AuthHttpError && err.status === 401) {
          return;
        }
      }
    }

    loadStats();
  }, []);

  // ==========================================
  // Dashboard UI
  // ==========================================

  return (
    <main className="min-h-screen bg-gray-50 p-6">

      {/* ====================================== */}
      {/* Partner Header */}
      {/* ====================================== */}

      <div className="rounded-3xl bg-white p-8 shadow">

        <h1 className="text-3xl font-bold">
          Welcome, {partner?.name || "Delivery Partner"} 🚴
        </h1>

        <p className="mt-2 text-gray-500">
          Manage your deliveries and earnings.
        </p>

        {/* Statistics */}

        <div className="mb-10 mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">

          {/* Pending */}

          <div className="rounded-2xl bg-orange-50 p-6 shadow">

            <p className="text-gray-500">
              Pending
            </p>

            <h2 className="mt-2 text-4xl font-bold text-orange-600">
              📦 {stats.pending}
            </h2>

          </div>

          {/* Completed */}

          <div className="rounded-2xl bg-green-50 p-6 shadow">

            <p className="text-gray-500">
              Completed
            </p>

            <h2 className="mt-2 text-4xl font-bold text-green-600">
              ✅ {stats.completed}
            </h2>

          </div>

          {/* Earnings */}

          <div className="rounded-2xl bg-blue-50 p-6 shadow">

            <p className="text-gray-500">
              Earnings
            </p>

            <h2 className="mt-2 text-4xl font-bold text-blue-600">
              ₹{stats.earnings}
            </h2>

          </div>

          {/* Rating */}

          <div className="rounded-2xl bg-yellow-50 p-6 shadow">

            <p className="text-gray-500">
              Rating
            </p>

            <h2 className="mt-2 text-4xl font-bold text-yellow-600">
              ⭐ {stats.rating}
            </h2>

          </div>

        </div>

        {/* ================================== */}
        {/* Partner Information */}
        {/* ================================== */}

        <div className="border-t pt-6">

          <h2 className="text-xl font-semibold">
            Partner Information
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">

            <p className="text-lg text-gray-600">
              <span className="font-semibold text-gray-800">
                Name:
              </span>{" "}
              {partner?.name || "—"}
            </p>

            <p className="text-lg text-gray-600">
              <span className="font-semibold text-gray-800">
                Phone:
              </span>{" "}
              {partner?.phone || "—"}
            </p>

            <p className="text-lg text-gray-600">
              <span className="font-semibold text-gray-800">
                Email:
              </span>{" "}
              {partner?.email || "—"}
            </p>

            <p className="text-lg text-gray-600">
              <span className="font-semibold text-gray-800">
                Vehicle:
              </span>{" "}
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

      {/* ====================================== */}
      {/* Delivery Cards */}
      {/* ====================================== */}

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        {/* Available Orders */}

        <div className="rounded-3xl bg-white p-6 shadow">

          <h2 className="text-lg font-semibold">
            Available Orders
          </h2>

          <p className="mt-4 text-5xl font-bold text-orange-600">
            {availableOrders}
          </p>

        </div>

        {/* Active Deliveries */}

        <div className="rounded-3xl bg-white p-6 shadow">

          <h2 className="text-lg font-semibold">
            Active Deliveries
          </h2>

          <p className="mt-4 text-5xl font-bold text-blue-600">
            {myDeliveries}
          </p>

        </div>

        {/* Completed */}

        <div className="rounded-3xl bg-white p-6 shadow">

          <h2 className="text-lg font-semibold">
            Completed Today
          </h2>

          <p className="mt-4 text-5xl font-bold text-green-600">
            {Math.floor(earnings / 50)}
          </p>

        </div>

        {/* Earnings */}

        <div className="rounded-3xl bg-white p-6 shadow">

          <h2 className="text-lg font-semibold">
            Earnings
          </h2>

          <p className="mt-4 text-5xl font-bold text-green-700">
            ₹{earnings}
          </p>

        </div>

        {/* History */}

        <Link
          href="/delivery/dashboard/history"
          className="rounded-2xl border bg-white p-6 shadow transition hover:shadow-lg"
        >

          <h2 className="text-2xl font-bold">
            📦 Delivery History
          </h2>

          <p className="mt-2 text-gray-500">
            View all completed deliveries.
          </p>

        </Link>

      </div>

    </main>
  );
}