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
  CalendarDays,
} from "lucide-react";

import {
  AUTH_STORAGE_KEYS,
  clearAuthForRole,
} from "@/lib/authTokens";
import { ROUTES } from "@/lib/routes";
import { getAdminHealth } from "@/services/adminService";

const NAV_LINK =
  "flex items-center gap-3 rounded-xl p-3 transition hover:bg-slate-800";

function navClass(active: boolean) {
  return `${NAV_LINK}${active ? " bg-slate-800" : ""}`;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === ROUTES.ADMIN_LOGIN;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    let cancelled = false;

    async function verifyAdminSession() {
      const token = localStorage.getItem(AUTH_STORAGE_KEYS.adminToken);

      if (!token) {
        router.replace(ROUTES.ADMIN_LOGIN);
        return;
      }

      try {
        await getAdminHealth();

        if (!cancelled) {
          setReady(true);
        }
      } catch {
        clearAuthForRole("admin");
        router.replace(ROUTES.ADMIN_LOGIN);
      }

    }

    void verifyAdminSession();

    return () => {
      cancelled = true;
    };
  }, [router, isLoginPage, pathname]);

  function logout() {
    clearAuthForRole("admin");
    router.push(ROUTES.ADMIN_LOGIN);
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
    pathname === ROUTES.ADMIN_RESTAURANTS ||
    pathname === ROUTES.ADMIN_ADD_RESTAURANT ||
    pathname.startsWith("/admin/edit-restaurant");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-slate-900 text-white sm:w-72">
        <div className="border-b border-slate-700 p-6">
          <h1 className="text-2xl font-bold">CampusBite</h1>
          <p className="mt-1 text-sm text-slate-300">Admin Panel</p>
        </div>

        <nav className="flex flex-1 flex-col space-y-1 p-4">
          <Link
            href={ROUTES.ADMIN}
            className={navClass(pathname === ROUTES.ADMIN)}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </Link>

          <Link
            href={ROUTES.ADMIN_ORDERS}
            className={navClass(pathname === ROUTES.ADMIN_ORDERS)}
          >
            <ClipboardList size={20} />
            Orders
          </Link>

          <Link
            href={ROUTES.ADMIN_RESTAURANTS}
            className={navClass(restaurantsActive)}
          >
            <Store size={20} />
            Restaurants
          </Link>

          <Link
            href={ROUTES.ADMIN_USERS}
            className={navClass(pathname === ROUTES.ADMIN_USERS)}
          >
            <Users size={20} />
            Users
          </Link>

          <Link
            href={ROUTES.ADMIN_SUBSCRIPTIONS}
            className={navClass(pathname === ROUTES.ADMIN_SUBSCRIPTIONS)}
          >
            <CalendarDays size={20} />
            Subscriptions
          </Link>

          <button
            type="button"
            onClick={logout}
            className="mt-auto flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-red-600"
          >
            <LogOut size={20} />
            Logout
          </button>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
