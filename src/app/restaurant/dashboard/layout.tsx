"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  LogOut,
  UserRound,
  CalendarDays,
  NotebookPen,
  Store,
  ChevronRight,
  QrCode,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";
import {
  AUTH_STORAGE_KEYS,
  clearAuthForRole,
  getRestaurantOwnerEmail,
} from "@/lib/authTokens";
import { authJson } from "@/services/authFetch";
import { usePolling } from "@/hooks/usePolling";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

export default function RestaurantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [ownerEmail, setOwnerEmail] = useState("");

  useEffect(() => {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.restaurantToken);
    if (!token) {
      router.replace(ROUTES.RESTAURANT_LOGIN);
      return;
    }

    const email = getRestaurantOwnerEmail();
    if (email) {
      setOwnerEmail(email);
    }

    const savedStatus = localStorage.getItem("cb_restaurant_store_status");
    if (savedStatus) {
      setIsStoreOpen(savedStatus === "open");
    }
  }, [router]);

  // Light poll to update pending orders badge count
  const checkPendingOrders = async () => {
    const email = getRestaurantOwnerEmail();
    if (!email) return;

    try {
      const data = await authJson<{ pending_orders?: number }>(
        `/dashboard/${encodeURIComponent(email)}`,
        { role: "restaurant_owner", cache: "no-store" }
      );
      if (typeof data.pending_orders === "number") {
        setPendingCount(data.pending_orders);
      }
    } catch {
      // Non-blocking
    }
  };

  usePolling(checkPendingOrders, 10000, {
    enabled: true,
    runImmediately: true,
  });

  const toggleStoreStatus = () => {
    if (isStoreOpen) {
      const confirmPause = window.confirm(
        "Pause incoming orders? The kitchen will appear as 'Busy / Paused' to students."
      );
      if (!confirmPause) return;
      setIsStoreOpen(false);
      localStorage.setItem("cb_restaurant_store_status", "paused");
    } else {
      setIsStoreOpen(true);
      localStorage.setItem("cb_restaurant_store_status", "open");
    }
  };

  function logout() {
    clearAuthForRole("restaurant_owner");
    router.push(ROUTES.RESTAURANT_LOGIN);
  }

  const navLinks: NavItem[] = [
    {
      label: "Dashboard",
      href: ROUTES.RESTAURANT_DASHBOARD,
      icon: LayoutDashboard,
    },
    {
      label: "Kitchen Orders",
      href: ROUTES.RESTAURANT_ORDERS,
      icon: ClipboardList,
      badge: pendingCount,
    },
    {
      label: "Mess Counter",
      href: ROUTES.RESTAURANT_COUNTER,
      icon: QrCode,
    },
    {
      label: "Menu Items",
      href: ROUTES.RESTAURANT_MENU,
      icon: UtensilsCrossed,
    },
    {
      label: "Subscriptions",
      href: ROUTES.RESTAURANT_SUBSCRIPTIONS,
      icon: CalendarDays,
    },
    {
      label: "Subscription Plans",
      href: ROUTES.RESTAURANT_SUBSCRIPTION_PLANS,
      icon: NotebookPen,
    },
    {
      label: "Eatery Profile",
      href: ROUTES.RESTAURANT_PROFILE,
      icon: UserRound,
    },
  ];

  const mobileNavTabs = [
    {
      label: "Live KDS",
      href: ROUTES.RESTAURANT_ORDERS,
      icon: "🍳",
      badge: pendingCount,
    },
    {
      label: "Counter",
      href: ROUTES.RESTAURANT_COUNTER,
      icon: "🎟️",
    },
    {
      label: "Menu",
      href: ROUTES.RESTAURANT_MENU,
      icon: "🍱",
    },
    {
      label: "Earnings",
      href: ROUTES.RESTAURANT_DASHBOARD,
      icon: "📈",
    },
    {
      label: "Profile",
      href: ROUTES.RESTAURANT_PROFILE,
      icon: "⚙️",
    },
  ];

  return (
    <div className="flex min-h-screen bg-stone-50/70 text-stone-900 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col justify-between border-r border-amber-200/60 bg-white shadow-xs">
        <div>
          {/* Brand Header */}
          <div className="border-b border-stone-100 p-5 lg:p-6 bg-gradient-to-br from-amber-50/40 via-orange-50/20 to-white">
            <Link
              href={ROUTES.RESTAURANT_DASHBOARD}
              className="flex items-center gap-2.5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-sm shadow-orange-600/30">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-stone-900">
                  CampusBite
                </h1>
                <span className="inline-flex items-center gap-1 rounded-md bg-orange-100/80 px-1.5 py-0.5 text-[10px] font-bold text-orange-800">
                  Partner Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 p-4">
            {navLinks.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== ROUTES.RESTAURANT_DASHBOARD &&
                  pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-orange-500/10 text-orange-700 font-bold border border-orange-200/70 shadow-xs"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? "text-orange-600" : "text-stone-400"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && item.badge > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1.5 text-[11px] font-extrabold text-white animate-pulse">
                      {item.badge}
                    </span>
                  ) : isActive ? (
                    <ChevronRight className="h-4 w-4 text-orange-400" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-stone-100 p-4 space-y-3 bg-stone-50/50">
          <div className="rounded-xl bg-white p-2.5 border border-stone-200/70 text-xs shadow-xs">
            <p className="font-bold text-stone-900 truncate">
              {ownerEmail || "Restaurant Partner"}
            </p>
            <p className="text-[11px] text-stone-500">Live Partner Account</p>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-amber-200/50 bg-white/90 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
          {/* Left Title / Branding for Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-xl">🍲</span>
            <span className="text-base font-black tracking-tight text-stone-900">
              CampusBite Partner
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-stone-500">
            <span>Restaurant Kitchen Console</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">
              Live Polling Connected
            </span>
          </div>

          {/* Right Top Bar: Store Status Quick Switch */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleStoreStatus}
              aria-label="Toggle store acceptance status"
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs border cursor-pointer active:scale-95 ${
                isStoreOpen
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                  : "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isStoreOpen
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-rose-500"
                }`}
              />
              <span>
                {isStoreOpen ? "🟢 Accepting Orders" : "🔴 Kitchen Busy / Paused"}
              </span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile / Tablet Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Restaurant Navigation"
        className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/80 px-4 py-2 flex items-center justify-around md:hidden shadow-lg"
      >
        {mobileNavTabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== ROUTES.RESTAURANT_DASHBOARD &&
              pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? "text-orange-600 font-bold bg-orange-50/80 scale-105"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <div className="relative">
                <span className="text-lg leading-none">{tab.icon}</span>
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[9px] font-black text-white">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}