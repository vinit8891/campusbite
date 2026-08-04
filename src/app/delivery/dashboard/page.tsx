"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  getAvailableOrders,
  getMyDeliveries,
} from "@/services/deliveryService";

export default function DeliveryDashboard() {
  const [availableOrders, setAvailableOrders] = useState(0);
  const [myDeliveries, setMyDeliveries] = useState(0);
  const [earnings, setEarnings] = useState(0);

  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    earnings: 0,
    rating: 0,
  });

  useEffect(() => {
    async function loadDashboard() {
      try {
        const partner = JSON.parse(
          localStorage.getItem("deliveryPartner") || "{}"
        );

        const phone = partner.phone;

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
        console.error(err);
      }
    }

    loadDashboard();

    const interval = setInterval(
      loadDashboard,
      5000
    );

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const res = await fetch(
        "http://127.0.0.1:8000/delivery-dashboard/stats"
      );

      const data = await res.json();

      setStats(data);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <main>
      <div className="rounded-3xl bg-white p-8 shadow">
        <h1 className="text-5xl font-bold">
          Welcome, Rahul Sharma 🚴
        </h1>

        <div className="mb-10 mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-orange-50 p-6 shadow">
            <p className="text-gray-500">
              Pending
            </p>

            <h2 className="mt-2 text-4xl font-bold text-orange-600">
              📦 {stats.pending}
            </h2>
          </div>

          <div className="rounded-2xl bg-green-50 p-6 shadow">
            <p className="text-gray-500">
              Completed
            </p>

            <h2 className="mt-2 text-4xl font-bold text-green-600">
              ✅ {stats.completed}
            </h2>
          </div>

          <div className="rounded-2xl bg-blue-50 p-6 shadow">
            <p className="text-gray-500">
              Earnings
            </p>

            <h2 className="mt-2 text-4xl font-bold text-blue-600">
              ₹{stats.earnings}
            </h2>
          </div>

          <div className="rounded-2xl bg-yellow-50 p-6 shadow">
            <p className="text-gray-500">
              Rating
            </p>

            <h2 className="mt-2 text-4xl font-bold text-yellow-600">
              ⭐ {stats.rating}
            </h2>
          </div>
        </div>

        <p className="mt-3 text-lg text-gray-600">
          Vehicle : Bike
        </p>

        <p className="text-lg text-gray-600">
          Vehicle Number :
          KA01AB1234
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">
            Available Orders
          </h2>

          <p className="mt-4 text-5xl font-bold text-orange-600">
            {availableOrders}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">
            Active Deliveries
          </h2>

          <p className="mt-4 text-5xl font-bold text-blue-600">
            {myDeliveries}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">
            Completed Today
          </h2>

          <p className="mt-4 text-5xl font-bold text-green-600">
            {Math.floor(earnings / 50)}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">
            Earnings
          </h2>

          <p className="mt-4 text-5xl font-bold text-green-700">
            ₹{earnings}
          </p>
        </div>

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