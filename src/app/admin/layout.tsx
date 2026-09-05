"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  AUTH_STORAGE_KEYS,
  clearAuthForRole,
} from "@/lib/authTokens";
import { ROUTES } from "@/lib/routes";
import { getAdminHealth } from "@/services/adminService";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNavbar } from "@/components/admin/AdminNavbar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === ROUTES.ADMIN_LOGIN;
  const [ready, setReady] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  function logout() {
    clearAuthForRole("admin");
    router.push(ROUTES.ADMIN_LOGIN);
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50/80">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
          <p className="text-sm font-medium text-stone-600 animate-pulse">
            Verifying admin session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-stone-50/70 text-stone-900">
      {/* Desktop Sticky Sidebar */}
      <AdminSidebar
        className="hidden md:flex md:w-64 lg:w-72 shrink-0 sticky top-0 h-screen shadow-xs"
        onLogout={logout}
      />

      {/* Mobile Slide-Over Drawer */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-950/50 backdrop-blur-xs transition-opacity duration-300 md:hidden"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation drawer"
      >
        <AdminSidebar
          isMobile
          onLogout={logout}
          onClose={() => setIsDrawerOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminNavbar onOpenDrawer={() => setIsDrawerOpen(true)} />
        <main className="w-full flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
