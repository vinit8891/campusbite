import React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { ROUTES } from "@/lib/routes";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-800 bg-stone-950 text-stone-300">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Mobile-First Compact Grid */}
        <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
          {/* Column 1: Brand & Tagline (spans 2 cols on mobile for balance, 1 on desktop) */}
          <div className="col-span-2 space-y-2.5 md:col-span-1">
            <Link
              href={ROUTES.HOME}
              className="group flex items-center gap-2"
              aria-label="CampusBite Home"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-xs transition-transform group-hover:scale-105">
                <span className="text-sm" role="img" aria-label="Plate and cutlery">
                  🍽️
                </span>
              </div>
              <span className="text-lg font-bold tracking-tight text-white transition-colors group-hover:text-orange-400">
                Campus<span className="text-orange-500">Bite</span>
              </span>
            </Link>

            <p className="text-xs leading-relaxed text-stone-400">
              Closed-campus food delivery network connecting hostels with top campus eateries.
            </p>

            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                ⚡ Daily 8 AM – 2 AM
              </span>
            </div>
          </div>

          {/* Column 2: Order Food / Explore */}
          <div>
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-orange-400">
              Explore
            </h3>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <Link href={ROUTES.RESTAURANTS} className="transition-colors hover:text-white">
                  Restaurants
                </Link>
              </li>
              <li>
                <Link href={ROUTES.SUBSCRIPTIONS} className="transition-colors hover:text-white">
                  Hostel Mess Plans
                </Link>
              </li>
              <li>
                <Link href={ROUTES.RESTAURANTS} className="transition-colors hover:text-white">
                  Student Specials
                </Link>
              </li>
              <li>
                <Link href={ROUTES.MY_ORDERS} className="transition-colors hover:text-white">
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Partner Portals */}
          <div>
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-orange-400">
              Portals
            </h3>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <Link href={ROUTES.RESTAURANT_LOGIN} className="transition-colors hover:text-white">
                  Restaurant Portal
                </Link>
              </li>
              <li>
                <Link href={ROUTES.DELIVERY_LOGIN} className="transition-colors hover:text-white">
                  Courier Partner
                </Link>
              </li>
              <li>
                <Link href={ROUTES.ADMIN_LOGIN} className="transition-colors hover:text-white">
                  Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Support & Legal */}
          <div>
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-orange-400">
              Help
            </h3>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <Link href={ROUTES.TERMS} className="transition-colors hover:text-white">
                  Campus Help Desk
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@campusbite.in"
                  className="transition-colors hover:text-white"
                >
                  support@campusbite.in
                </a>
              </li>
              <li>
                <Link href={ROUTES.TERMS} className="transition-colors hover:text-white">
                  Terms
                </Link>
              </li>
              <li>
                <Link href={ROUTES.PRIVACY_POLICY} className="transition-colors hover:text-white">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Streamlined Bottom Bar */}
        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-stone-800/60 pt-6 text-xs text-stone-500 sm:flex-row">
          <div>
            © {new Date().getFullYear()} CampusBite • Closed Campus Delivery
          </div>
          <div className="inline-flex items-center gap-1.5 font-medium text-stone-400">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>🔒 Razorpay Verified &amp; Encrypted</span>
          </div>
        </div>
      </div>
    </footer>
  );
}