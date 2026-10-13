"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on checkout for a streamlined, mobile-first, distraction-free funnel
  if (pathname === "/checkout" || pathname?.startsWith("/checkout")) {
    return null;
  }

  return (
    <footer className="mt-auto border-t border-zinc-800 bg-zinc-950 text-zinc-400">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Top Bar: Brand & Quick Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-5">
          <Link className="flex items-center gap-2 text-white font-bold text-base" href="/">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-600 text-sm">🔥</span>
            CampusBite
          </Link>
          <div className="flex items-center gap-2 rounded-full bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Canteens Live • 8 AM – 2 AM
          </div>
        </div>

        {/* Compact Multi-Column Navigation */}
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 md:grid-cols-4">
          {/* Col 1: Explore */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">Explore</h4>
            <ul className="mt-2 space-y-1.5 text-xs">
              <li><Link className="hover:text-orange-400 transition-colors" href="/restaurants">Campus Canteens</Link></li>
              <li><Link className="hover:text-orange-400 transition-colors" href="/subscriptions">Mess & Tiffin Plans</Link></li>
              <li><Link className="hover:text-orange-400 transition-colors" href="/orders">Track Order</Link></li>
            </ul>
          </div>

          {/* Col 2: Partners */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">For Partners</h4>
            <ul className="mt-2 space-y-1.5 text-xs">
              <li><Link className="hover:text-orange-400 transition-colors" href="/restaurant/login">Canteen Login</Link></li>
              <li><Link className="hover:text-orange-400 transition-colors" href="/restaurant/register">Register Eatery</Link></li>
              <li><Link className="hover:text-orange-400 transition-colors" href="/delivery/login">Rider Login</Link></li>
              <li><Link className="hover:text-orange-400 transition-colors" href="/delivery/register">Become a Courier</Link></li>
            </ul>
          </div>

          {/* Col 3: Support */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">Support</h4>
            <ul className="mt-2 space-y-1.5 text-xs">
              <li><Link className="hover:text-orange-400 transition-colors" href="/contact">Contact Us</Link></li>
              <li><a href="mailto:support@campusbite.in" className="hover:text-orange-400 transition-colors">Email Help Desk</a></li>
              <li><Link className="hover:text-orange-400 transition-colors" href="/terms">Terms of Service</Link></li>
              <li><Link className="hover:text-orange-400 transition-colors" href="/privacy">Privacy Policy</Link></li>
              <li><Link className="hover:text-orange-400 transition-colors" href="/refund-policy">Refund Policy</Link></li>
            </ul>
          </div>

          {/* Col 4: Operations */}
          <div className="col-span-2 sm:col-span-1">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">Admin</h4>
            <ul className="mt-2 space-y-1.5 text-xs">
              <li><Link className="hover:text-orange-400 transition-colors" href="/admin/verifications">Admin Verification Hub</Link></li>
              <li><span className="text-[11px] text-zinc-500">Zeal College Campus Network</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-zinc-900 pt-4 text-center sm:flex-row sm:text-left text-[11px] text-zinc-500">
          <p>© 2026 CampusBite Technologies. Built for campus communities.</p>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className="text-emerald-400 text-xs">🔒</span> 100% Encrypted UPI • FSSAI Verified
          </div>
        </div>
      </div>
    </footer>
  );
}