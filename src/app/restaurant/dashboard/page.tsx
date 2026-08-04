"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <>
      <h1 className="mb-8 text-4xl font-bold">
        Dashboard
      </h1>

      {/* Statistics */}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">
            Today's Orders
          </h2>

          <p className="mt-4 text-5xl font-bold text-orange-600">
            0
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">
            Revenue
          </h2>

          <p className="mt-4 text-5xl font-bold text-green-600">
            ₹0
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">
            Menu Items
          </h2>

          <p className="mt-4 text-5xl font-bold">
            0
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">
            Rating
          </h2>

          <p className="mt-4 text-5xl font-bold">
            ⭐ 0.0
          </p>
        </div>

      </div>

      {/* Quick Actions */}

      <h2 className="mt-12 mb-6 text-3xl font-bold">
        Quick Actions
      </h2>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

        <Link href="/restaurant/dashboard/menu">
          <div className="cursor-pointer rounded-2xl border bg-white p-6 shadow transition hover:shadow-lg">
            <h3 className="text-xl font-bold">
              🍽️ Manage Menu
            </h3>

            <p className="mt-2 text-gray-500">
              View, edit and delete menu items.
            </p>
          </div>
        </Link>

        <Link href="/restaurant/dashboard/menu/add">
          <div className="cursor-pointer rounded-2xl border bg-white p-6 shadow transition hover:shadow-lg">
            <h3 className="text-xl font-bold">
              ➕ Add Food
            </h3>

            <p className="mt-2 text-gray-500">
              Add a new dish to your restaurant.
            </p>
          </div>
        </Link>

        <Link href="/restaurant/dashboard/orders">
          <div className="cursor-pointer rounded-2xl border bg-white p-6 shadow transition hover:shadow-lg">
            <h3 className="text-xl font-bold">
              📦 Orders
            </h3>

            <p className="mt-2 text-gray-500">
              View and manage customer orders.
            </p>
          </div>
        </Link>

      </div>
    </>
  );
}