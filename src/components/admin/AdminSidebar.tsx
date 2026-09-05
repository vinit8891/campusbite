"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Store,
  Users,
  LogOut,
  ShieldCheck,
  X,
  ChevronRight,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";

export interface AdminSidebarProps {
  onLogout: () => void;
  onClose?: () => void;
  isMobile?: boolean;
  className?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  isActive: (pathname: string) => boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function AdminSidebar({
  onLogout,
  onClose,
  isMobile = false,
  className = "",
}: AdminSidebarProps) {
  const pathname = usePathname();

  const navGroups: NavGroup[] = [
    {
      label: "OPERATIONS",
      items: [
        {
          name: "Mission Control",
          href: ROUTES.ADMIN,
          icon: LayoutDashboard,
          isActive: (path) => path === ROUTES.ADMIN,
        },
        {
          name: "Global Orders",
          href: ROUTES.ADMIN_ORDERS,
          icon: ClipboardList,
          isActive: (path) =>
            path === ROUTES.ADMIN_ORDERS || path.startsWith("/admin/orders/"),
        },
        {
          name: "Mess Subscriptions",
          href: ROUTES.ADMIN_SUBSCRIPTIONS,
          icon: CalendarDays,
          isActive: (path) =>
            path === ROUTES.ADMIN_SUBSCRIPTIONS ||
            path.startsWith("/admin/subscriptions/"),
        },
      ],
    },
    {
      label: "DIRECTORIES",
      items: [
        {
          name: "Campus Eateries",
          href: ROUTES.ADMIN_RESTAURANTS,
          icon: Store,
          isActive: (path) =>
            path === ROUTES.ADMIN_RESTAURANTS ||
            path === ROUTES.ADMIN_ADD_RESTAURANT ||
            path.startsWith("/admin/edit-restaurant"),
        },
        {
          name: "User & Courier Directory",
          href: ROUTES.ADMIN_USERS,
          icon: Users,
          isActive: (path) =>
            path === ROUTES.ADMIN_USERS || path.startsWith("/admin/users/"),
        },
      ],
    },
  ];

  return (
    <aside
      className={`flex h-full w-full flex-col justify-between bg-stone-900 text-stone-300 ${
        isMobile ? "" : "border-r border-stone-800"
      } ${className}`}
      aria-label="Admin navigation sidebar"
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-stone-800 px-5 py-4 lg:px-6">
          <Link
            href={ROUTES.ADMIN}
            onClick={onClose}
            className="flex items-center gap-3 group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-orange-950/40 transition-transform group-hover:scale-105">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                CampusBite
              </h1>
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                <span>🛡️ Admin Console</span>
              </div>
            </div>
          </Link>

          {/* Close button for mobile drawer */}
          {isMobile && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-800 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Grouped Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-stone-400">
                {group.label}
              </div>
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const active = item.isActive(pathname);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                        active
                          ? "bg-amber-500/15 text-amber-400 font-bold border-l-4 border-amber-500 shadow-xs"
                          : "text-stone-300 hover:bg-stone-800/80 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`h-4 w-4 transition-colors ${
                            active
                              ? "text-amber-400"
                              : "text-stone-400 group-hover:text-stone-200"
                          }`}
                        />
                        <span>{item.name}</span>
                      </div>
                      {active ? (
                        <ChevronRight className="h-4 w-4 text-amber-400/80" />
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Profile & Footer */}
      <div className="border-t border-stone-800 p-4 space-y-3 bg-stone-950/40">
        <div className="rounded-xl bg-stone-800/60 p-3 border border-stone-700/50 flex items-center justify-between text-xs">
          <div className="min-w-0 pr-2">
            <p className="font-bold text-white truncate">Super Admin</p>
            <p className="text-[11px] text-stone-400 truncate">
              campusbite@admin
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-emerald-400 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>API Online</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold text-stone-400 hover:bg-rose-950/50 hover:text-rose-300 border border-transparent hover:border-rose-900/60 transition-colors cursor-pointer"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
