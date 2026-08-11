"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  LogOut,
} from "lucide-react";

export default function RestaurantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("restaurantToken");

    if (!token) {
      router.replace("/restaurant/login");
    }
  }, [router]);

  function logout() {
    localStorage.removeItem("restaurantToken");
    localStorage.removeItem("restaurantOwner");

    router.push("/restaurant/login");
  }

  return (
    <div className="flex min-h-screen">

      {/* Sidebar */}

      <aside className="w-72 bg-orange-600 text-white">

        <div className="border-b border-orange-500 p-6">

          <h1 className="text-2xl font-bold">
            🍽️ CampusBite
          </h1>

          <p className="text-orange-100">
            Restaurant Partner
          </p>

        </div>

        <nav className="space-y-2 p-5">

          <Link
            href="/restaurant/dashboard"
            className="flex items-center gap-3 rounded-xl p-3 hover:bg-orange-500"
          >
            <LayoutDashboard size={20} />
            Dashboard
          </Link>

          <Link
            href="/restaurant/dashboard/menu"
            className="flex items-center gap-3 rounded-xl p-3 hover:bg-orange-500"
          >
            <UtensilsCrossed size={20} />
            Menu
          </Link>

          <Link
            href="/restaurant/dashboard/orders"
            className="flex items-center gap-3 rounded-xl p-3 hover:bg-orange-500"
          >
            <ClipboardList size={20} />
            Orders
          </Link>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-red-500"
          >
            <LogOut size={20} />
            Logout
          </button>

        </nav>

      </aside>

      {/* Main */}

      <main className="flex-1 bg-gray-50 p-8">
        {children}
      </main>

    </div>
  );
}