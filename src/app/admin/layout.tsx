"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Store,
  Users,
} from "lucide-react";

import {
  AUTH_STORAGE_KEYS,
  clearAuthForRole,
} from "@/lib/authTokens";
import { authFetch } from "@/services/authFetch";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    let cancelled = false;

    async function verifyAdminSession() {
      const token = localStorage.getItem(AUTH_STORAGE_KEYS.adminToken);

      if (!token) {
        router.replace("/admin/login");
        return;
      }

      try {
        const res = await authFetch("/admin/health", {
          role: "admin",
          redirectOnAuthError: false,
        });

        if (!res.ok) {
          throw new Error("Admin health check failed");
        }

        if (!cancelled) {
          setReady(true);
        }
      } catch {
        clearAuthForRole("admin");
        router.replace("/admin/login");
      }
    }

    void verifyAdminSession();

    return () => {
      cancelled = true;
    };
  }, [router, isLoginPage, pathname]);

  function logout() {
    clearAuthForRole("admin");
    router.push("/admin/login");
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Verifying admin session...</p>
      </div>
    );
  }

  const restaurantsActive =
    pathname === "/admin/restaurants" ||
    pathname === "/admin/add-restaurant" ||
    pathname.startsWith("/admin/edit-restaurant");

  return (
    <div className="flex min-h-screen">
      <aside className="w-72 bg-slate-900 text-white">
        <div className="border-b border-slate-700 p-6">
          <h1 className="text-2xl font-bold">CampusBite</h1>
          <p className="text-slate-300">Admin Panel</p>
        </div>

        <nav className="space-y-2 p-5">
          <Link
            href="/admin"
            className={`flex items-center gap-3 rounded-xl p-3 hover:bg-slate-800 ${
              pathname === "/admin" ? "bg-slate-800" : ""
            }`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </Link>

          <Link
            href="/admin/orders"
            className={`flex items-center gap-3 rounded-xl p-3 hover:bg-slate-800 ${
              pathname === "/admin/orders" ? "bg-slate-800" : ""
            }`}
          >
            <ClipboardList size={20} />
            Orders
          </Link>

          <Link
            href="/admin/restaurants"
            className={`flex items-center gap-3 rounded-xl p-3 hover:bg-slate-800 ${
              restaurantsActive ? "bg-slate-800" : ""
            }`}
          >
            <Store size={20} />
            Restaurants
          </Link>

          <Link
            href="/admin/users"
            className={`flex items-center gap-3 rounded-xl p-3 hover:bg-slate-800 ${
              pathname === "/admin/users" ? "bg-slate-800" : ""
            }`}
          >
            <Users size={20} />
            Users
          </Link>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-red-600"
          >
            <LogOut size={20} />
            Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 bg-gray-50 p-8">{children}</main>
    </div>
  );
}
