"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/routes";

type DeliveryBottomNavProps = {
  activeRunsCount?: number;
  availablePoolCount?: number;
};

export function DeliveryBottomNav({
  activeRunsCount = 0,
  availablePoolCount = 0,
}: DeliveryBottomNavProps) {
  const pathname = usePathname();

  const tabs = [
    {
      label: "My Runs",
      href: ROUTES.DELIVERY_ORDERS,
      icon: "🛵",
      badge: activeRunsCount,
    },
    {
      label: "Available",
      href: ROUTES.DELIVERY_AVAILABLE,
      icon: "📦",
      badge: availablePoolCount,
    },
    {
      label: "Earnings",
      href: ROUTES.DELIVERY_HISTORY,
      icon: "💰",
    },
    {
      label: "Profile",
      href: ROUTES.DELIVERY_PROFILE,
      icon: "👤",
    },
  ];

  return (
    <nav
      aria-label="Mobile Courier Navigation"
      className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/80 px-4 py-2 flex items-center justify-around md:hidden shadow-lg"
    >
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href || pathname.startsWith(tab.href);

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
                <span className="absolute -top-1 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[9px] font-black text-white animate-pulse">
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
  );
}

export default DeliveryBottomNav;
