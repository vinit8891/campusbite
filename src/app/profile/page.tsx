"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const router = useRouter();

  const { user, logout, isLoggedIn } = useAuth();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    if (user) {
      setLoading(false);
    }
  }, [isLoggedIn, user, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="rounded-3xl bg-gray-200 p-8">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full bg-gray-300" />
              <div className="flex-1">
                <div className="h-5 w-40 rounded bg-gray-300" />
                <div className="mt-3 h-4 w-56 rounded bg-gray-300" />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="h-64 rounded-2xl bg-white shadow-sm" />
            <div className="h-64 rounded-2xl bg-white shadow-sm" />
          </div>

          <div className="mt-6 h-56 rounded-2xl bg-white shadow-sm" />
        </div>
      </main>
    );
  }

  if (!isLoggedIn || !user) {
    return null;
  }

  const initials =
    user.name?.trim()?.charAt(0).toUpperCase() || "C";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Hero */}
        <section className="rounded-3xl bg-gradient-to-r from-orange-500 to-orange-600 p-8 text-white shadow-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">

            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/30 bg-white/20 text-4xl font-bold">
              {initials}
            </div>

            <div>
              <p className="text-sm uppercase tracking-wide text-orange-100">
                Welcome Back
              </p>

              <h1 className="mt-1 text-4xl font-extrabold">
                {user.name}
              </h1>

              <p className="mt-2 text-orange-100">
                {user.email}
              </p>

              <div className="mt-4 inline-flex rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
                Customer Account
              </div>
            </div>

          </div>
        </section>

        {/* Stats */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Orders
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              0
            </h2>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Favorites
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              0
            </h2>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Reviews
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              0
            </h2>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Member
            </p>

            <h2 className="mt-2 text-xl font-bold">
              CampusBite
            </h2>
          </div>

        </section>

        {/* Main Grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          {/* Personal Information */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold text-gray-900">
              Personal Information
            </h2>

            <div className="space-y-5">

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Full Name
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {user.name}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Email
                </p>

                <p className="mt-1 break-all font-semibold text-gray-900">
                  {user.email}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Account Type
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  Customer
                </p>
              </div>

            </div>

          </section>

          {/* Quick Actions */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold text-gray-900">
              Quick Actions
            </h2>

            <div className="space-y-4">

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/my-orders")}
              >
                📦 My Orders
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
              >
                ❤️ Favorite Restaurants
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
              >
                📍 Saved Addresses
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
              >
                💳 Payment Methods
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
              >
                🎁 Coupons
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/restaurants")}
              >
                🍽 Browse Restaurants
              </Button>

            </div>

          </section>

        </div>

        {/* Logout */}
        <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-xl font-bold text-red-700">
                Logout
              </h2>

              <p className="mt-1 text-sm text-red-600">
                Sign out from your CampusBite account on this device.
              </p>
            </div>

            <Button
              variant="outline"
              className="border-red-300 bg-white text-red-600 hover:bg-red-100"
              onClick={() => {
                logout();
                router.replace("/");
              }}
            >
              Logout
            </Button>

          </div>

        </section>

      </div>
    </main>
  );
}