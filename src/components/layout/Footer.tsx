import React from "react";
import Link from "next/link";
import {
  Utensils,
  Clock,
  ShieldCheck,
  Building,
  Bike,
  HelpCircle,
  Mail,
  Lock,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-800 bg-stone-950 text-stone-300">
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-12">
        {/* 4-Column Grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand & Campus Mission */}
          <div className="space-y-4">
            <Link
              href={ROUTES.HOME}
              className="flex items-center gap-2.5 group"
              aria-label="CampusBite Home"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-sm shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <span className="text-lg" role="img" aria-label="Plate and cutlery">
                  🍽️
                </span>
              </div>
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-orange-400 transition-colors">
                Campus<span className="text-orange-500">Bite</span>
              </span>
            </Link>

            <p className="text-sm leading-relaxed text-stone-400">
              Hyperlocal, student-first food delivery network connecting campus
              hostels with top campus eateries &amp; late-night messes.
            </p>

            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
                🚀 Closed Campus Direct Delivery
              </span>
            </div>
          </div>

          {/* Column 2: Student Corner */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-white uppercase mb-4">
              Student Corner
            </h3>

            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href={ROUTES.RESTAURANTS}
                  className="hover:text-orange-400 transition-colors flex items-center gap-2"
                >
                  <span>Browse Restaurants</span>
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.SUBSCRIPTIONS}
                  className="hover:text-orange-400 transition-colors flex items-center gap-2"
                >
                  <span>Hostel Mess Plans</span>
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.RESTAURANTS}
                  className="hover:text-orange-400 transition-colors flex items-center gap-2"
                >
                  <span>Student Budget Specials (Under ₹99)</span>
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.MY_ORDERS}
                  className="hover:text-orange-400 transition-colors flex items-center gap-2"
                >
                  <span>Track Live Order</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Partner With Us */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-white uppercase mb-4">
              Partner With Us
            </h3>

            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href={ROUTES.RESTAURANT_LOGIN}
                  className="hover:text-orange-400 transition-colors flex items-center gap-2"
                >
                  <Building className="h-4 w-4 text-orange-500/80" />
                  <span>Restaurant Partner Portal</span>
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.DELIVERY_LOGIN}
                  className="hover:text-orange-400 transition-colors flex items-center gap-2"
                >
                  <Bike className="h-4 w-4 text-orange-500/80" />
                  <span>Courier Onboarding</span>
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.ADMIN_LOGIN}
                  className="hover:text-orange-400 transition-colors flex items-center gap-2"
                >
                  <ShieldCheck className="h-4 w-4 text-orange-500/80" />
                  <span>Campus Admin Portal</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Campus Help & Hours */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-white uppercase mb-4">
              Campus Help &amp; Hours
            </h3>

            <div className="space-y-3 text-sm text-stone-400">
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-white">Daily: 8:00 AM – 2:00 AM</p>
                  <p className="text-xs text-stone-500">Late Night delivery supported</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Building className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-white">Hostel Batch Windows</p>
                  <p className="text-xs text-stone-500">Every 20 mins to main lobby</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <Mail className="h-4 w-4 text-orange-400 shrink-0" />
                <a
                  href="mailto:support@campusbite.in"
                  className="text-stone-300 hover:text-orange-400 transition-colors"
                >
                  support@campusbite.in
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust & Legal Bar */}
        <div className="mt-12 border-t border-stone-800/80 pt-8 flex flex-col gap-4 text-xs text-stone-500 md:flex-row md:items-center md:justify-between">
          <div>
            © {new Date().getFullYear()} CampusBite • Crafted for Campus Life
          </div>

          {/* Security badge */}
          <div className="inline-flex items-center gap-1.5 text-stone-400 font-medium">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>256-bit Encrypted Campus Checkout • Razorpay Verified</span>
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-4">
            <Link href={ROUTES.PRIVACY_POLICY} className="hover:text-stone-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href={ROUTES.TERMS} className="hover:text-stone-300 transition-colors">
              Terms of Service
            </Link>
            <Link href={ROUTES.TERMS} className="hover:text-stone-300 transition-colors">
              Campus Refund Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}