"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, ShieldCheck, Mail } from "lucide-react";
import { ROUTES } from "@/lib/routes";

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on checkout for a streamlined, mobile-first, distraction-free funnel
  if (pathname === "/checkout" || pathname?.startsWith("/checkout")) {
    return null;
  }

  return (
    <footer className="mt-auto border-t border-zinc-800 bg-zinc-950 text-zinc-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          {/* Brand Column */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-2">
            <Link
              href={ROUTES.HOME}
              className="group inline-flex items-center gap-2.5"
              aria-label="CampusBite Home"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-md shadow-orange-950/30 transition-transform duration-200 group-hover:scale-105">
                <Flame className="h-5 w-5 fill-white/20 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-white transition-colors duration-150 group-hover:text-orange-400">
                Campus<span className="text-orange-500">Bite</span>
              </span>
            </Link>

            <p className="text-xs leading-relaxed text-zinc-400 max-w-sm">
              Hyperlocal closed-campus food delivery network connecting hostels with certified college canteens and messes.
            </p>

            {/* Live Status Indicator */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Canteens Live • 8:00 AM – 2:00 AM</span>
            </div>
          </div>

          {/* Explore Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Explore
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  href="/restaurants"
                  className="text-zinc-400 hover:text-orange-400 transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Campus Canteens &amp; Stalls
                </Link>
              </li>
              <li>
                <Link
                  href="/subscriptions"
                  className="text-zinc-400 hover:text-orange-400 transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Hostel Tiffin &amp; Mess Plans
                </Link>
              </li>
              <li>
                <Link
                  href="/orders"
                  className="text-zinc-400 hover:text-orange-400 transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Live Order Tracking
                </Link>
              </li>
              <li>
                <Link
                  href="/restaurants?filter=deals"
                  className="text-zinc-400 hover:text-orange-400 transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Student Combo Deals
                </Link>
              </li>
            </ul>
          </div>

          {/* Partner & Operations Portals */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Partner Portals
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  href="/restaurant/login"
                  className="text-zinc-400 hover:text-orange-400 transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Canteen Partner Portal
                </Link>
              </li>
              <li>
                <Link
                  href="/restaurant/register"
                  className="text-zinc-400 hover:text-orange-400 transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Register New Kitchen
                </Link>
              </li>
              <li>
                <Link
                  href="/delivery/login"
                  className="text-zinc-400 hover:text-orange-400 transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Student Courier Portal
                </Link>
              </li>
              <li>
                <Link
                  href="/delivery/register"
                  className="text-zinc-400 hover:text-orange-400 transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Become a Campus Runner
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/verifications"
                  className="text-zinc-400 hover:text-orange-400 transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Admin Verification Hub
                </Link>
              </li>
            </ul>
          </div>

          {/* Help & Campus Safety */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Help &amp; Campus Safety
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  href="/help"
                  className="text-zinc-400 hover:text-orange-400 transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Zeal Campus Help Desk
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@campusbite.in"
                  className="text-zinc-400 hover:text-orange-400 hover:underline transition-colors duration-150 inline-flex items-center gap-1"
                >
                  <Mail className="h-3 w-3 text-orange-400/80 shrink-0" />
                  <span>support@campusbite.in</span>
                </a>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-zinc-400 hover:text-orange-400 transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-zinc-400 hover:text-orange-400 transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms#refunds"
                  className="text-zinc-400 hover:text-orange-400 transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Refunds &amp; Settlement Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-zinc-900 pt-6 text-xs text-zinc-500 sm:flex-row">
          <p className="text-center sm:text-left">
            © 2026 CampusBite Technologies. Built for Zeal College &amp; Campus Communities.
          </p>
          <div className="inline-flex items-center gap-1.5 font-medium text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>100% Encrypted UPI Payments • FSSAI Verified Partners</span>
          </div>
        </div>
      </div>
    </footer>
  );
}