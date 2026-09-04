"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  Bike,
  IndianRupee,
  User,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";
import {
  AUTH_STORAGE_KEYS,
  clearAuthForRole,
  getDeliveryPartnerSession,
} from "@/lib/authTokens";
import type { DeliveryPartner } from "@/types";

type DeliverySidebarProps = {
  activeRunsCount?: number;
  availablePoolCount?: number;
};

export function DeliverySidebar({
  activeRunsCount = 0,
  availablePoolCount = 0,
}: DeliverySidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [partner, setPartner] = useState<DeliveryPartner | null>(() =>
    getDeliveryPartnerSession()
  );

  useEffect(() => {
    const current = getDeliveryPartnerSession();
    if (current) {
      setPartner(current);
    }
  }, []);

  function handleLogout() {
    clearAuthForRole("delivery_partner");
    router.push(ROUTES.DELIVERY_LOGIN);
  }

  const menu = [
    {
      name: "Dashboard",
      href: ROUTES.DELIVERY_DASHBOARD,
      icon: LayoutDashboard,
    },
    {
      name: "Available Orders",
      href: ROUTES.DELIVERY_AVAILABLE,
      icon: Package,
      badge: availablePoolCount,
    },
    {
      name: "My Deliveries",
      href: ROUTES.DELIVERY_ORDERS,
      icon: Bike,
      badge: activeRunsCount,
    },
    {
      name: "History & Earnings",
      href: ROUTES.DELIVERY_HISTORY,
      icon: IndianRupee,
    },
    {
      name: "Profile",
      href: ROUTES.DELIVERY_PROFILE,
      icon: User,
    },
  ];

  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 flex-col justify-between border-r border-orange-200/60 bg-white shadow-xs">
      <div>
        {/* Brand Header */}
        <div className="border-b border-stone-100 p-5 lg:p-6 bg-gradient-to-br from-orange-50/40 via-amber-50/20 to-white">
          <Link
            href={ROUTES.DELIVERY_DASHBOARD}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-sm shadow-orange-600/30">
              <Bike className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-stone-900">
                CampusBite
              </h1>
              <span className="inline-flex items-center gap-1 rounded-md bg-orange-100/80 px-1.5 py-0.5 text-[10px] font-bold text-orange-800">
                Courier Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5 p-4">
          {menu.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== ROUTES.DELIVERY_DASHBOARD &&
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
                  <span>{item.name}</span>
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
            {partner?.name || "Delivery Partner"}
          </p>
          <p className="text-[11px] text-stone-500">
            {partner?.phone || "Live Runner Account"}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export default DeliverySidebar;
