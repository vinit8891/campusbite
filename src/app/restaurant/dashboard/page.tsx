"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import { AuthHttpError, authJson } from "@/services/authFetch";

type DashboardData = {
  orders: number;
  revenue: number;
  menu_items: number;
  rating: number;
};

type FoodAnalytics = {
  name: string;
  orders: number;
};

export default function DashboardPage() {
  const router = useRouter();

  const [dashboard, setDashboard] =
    useState<DashboardData>({
      orders: 0,
      revenue: 0,
      menu_items: 0,
      rating: 0,
    });

  const [foods, setFoods] = useState<
    FoodAnalytics[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboard();

    const interval = setInterval(
      fetchDashboard,
      5000
    );

    return () => clearInterval(interval);
  }, []);

  async function fetchDashboard() {
    try {
      const email = getRestaurantOwnerEmail();

      if (!email) {
        setError("Restaurant owner email not found. Please log in again.");
        router.replace("/restaurant/login");
        return;
      }

      const dashboardData = await authJson<DashboardData>(
        `/dashboard/${encodeURIComponent(email)}`,
        { role: "restaurant_owner", cache: "no-store" }
      );

      setDashboard(dashboardData);

      const analyticsData = await authJson<FoodAnalytics[]>(
        `/analytics/best-selling/${encodeURIComponent(email)}`,
        { role: "restaurant_owner", cache: "no-store" }
      );

      setFoods(analyticsData);
      setError("");
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) {
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-xl">
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-10">

      <h1 className="text-4xl font-bold">
        Restaurant Dashboard
      </h1>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Stats */}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="font-semibold">
            Orders
          </h2>

          <p className="mt-4 text-5xl font-bold text-orange-600">
            {dashboard.orders}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="font-semibold">
            Revenue
          </h2>

          <p className="mt-4 text-5xl font-bold text-green-600">
            ₹{dashboard.revenue}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="font-semibold">
            Menu Items
          </h2>

          <p className="mt-4 text-5xl font-bold text-blue-600">
            {dashboard.menu_items}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="font-semibold">
            Rating
          </h2>

          <p className="mt-4 text-5xl font-bold text-yellow-500">
            ⭐ {dashboard.rating}
          </p>
        </div>

      </div>

      {/* Analytics */}

      <div className="rounded-3xl bg-white p-8 shadow">

        <h2 className="mb-8 text-2xl font-bold">
          🔥 Best Selling Foods
        </h2>

        {foods.length === 0 ? (
          <p className="text-gray-500">
            No delivered orders yet.
          </p>
        ) : (
          <div className="space-y-6">
            {foods.map((food, index) => (
              <div key={food.name}>
                <div className="mb-2 flex justify-between">

                  <span className="font-semibold">
                    #{index + 1} {food.name}
                  </span>

                  <span className="font-bold">
                    {food.orders} Orders
                  </span>

                </div>

                <div className="h-3 rounded-full bg-gray-200">

                  <div
                    className="h-3 rounded-full bg-orange-500"
                    style={{
                      width: `${
                        (food.orders /
                          foods[0].orders) *
                        100
                      }%`,
                    }}
                  />

                </div>

              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
