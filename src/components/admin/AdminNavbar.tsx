"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, ShieldCheck } from "lucide-react";
import { ROUTES } from "@/lib/routes";

export interface AdminNavbarProps {
  onOpenDrawer: () => void;
}

export function AdminNavbar({ onOpenDrawer }: AdminNavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-stone-200/80 bg-white/95 px-4 backdrop-blur-md md:hidden">
      {/* Left: Hamburger button & Brand Logo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open admin navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 active:scale-95 transition-all cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link
          href={ROUTES.ADMIN}
          className="flex items-center gap-2 group"
          aria-label="CampusBite Admin Console Home"
        >
          <Image
            src="/images/brand-logo.png"
            alt="CampusBite Logo"
            width={32}
            height={32}
            className="h-8 w-auto object-contain rounded-xl"
          />
          <div>
            <span className="text-sm font-black tracking-tight text-stone-900 block leading-tight">
              CampusBite
            </span>
            <span className="text-[10px] font-bold text-amber-700 block leading-none">
              🛡️ Admin Console
            </span>
          </div>
        </Link>
      </div>

      {/* Right: Live API Health Indicator Pill */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>API Online</span>
        </div>
      </div>
    </header>
  );
}

export default AdminNavbar;
