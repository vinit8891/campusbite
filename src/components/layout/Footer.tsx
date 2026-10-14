"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Phone, MessageCircle, Mail, ShieldCheck } from "lucide-react";

function InstagramIcon({ className = "h-3 w-3 text-pink-400" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on checkout for a streamlined, mobile-first, distraction-free funnel
  if (pathname === "/checkout" || pathname?.startsWith("/checkout")) {
    return null;
  }

  return (
    <footer className="mt-auto border-t border-zinc-800 bg-zinc-950 text-zinc-400">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Top Bar: Brand, Mission & Live Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-5">
          <div>
            <Link className="flex items-center gap-2.5 text-white font-bold text-base" href="/">
              <Image
                src="/images/brand-logo.png"
                alt="CampusBite Logo"
                width={28}
                height={28}
                className="h-7 w-auto object-contain rounded-lg"
              />
              <span>CampusBite</span>
            </Link>
            <p className="mt-1 text-xs text-zinc-400">
              CampusBite — Built for Zeal College of Engineering &amp; Research, Pune
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Canteens Live • 8 AM – 2 AM
            </div>
            <a
              href="https://wa.me/919024197988"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/20 border border-emerald-500/30 px-3 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-600/30 transition-colors"
            >
              <MessageCircle className="h-3 w-3" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Compact Multi-Column Navigation */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          {/* Col 1: Explore */}
          <div className="min-w-0">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">Explore</h4>
            <ul className="mt-2 space-y-1.5 text-xs">
              <li><Link className="hover:text-orange-400 transition-colors" href="/restaurants">Campus Canteens</Link></li>
              <li><Link className="hover:text-orange-400 transition-colors" href="/subscriptions">Mess &amp; Tiffin Plans</Link></li>
              <li><Link className="hover:text-orange-400 transition-colors" href="/orders">Track Order</Link></li>
            </ul>
          </div>

          {/* Col 2: Partners */}
          <div className="min-w-0">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">For Partners</h4>
            <ul className="mt-2 space-y-1.5 text-xs">
              <li><Link className="hover:text-orange-400 transition-colors" href="/restaurant/login">Canteen Login</Link></li>
              <li><Link className="hover:text-orange-400 transition-colors" href="/restaurant/register">Register Eatery</Link></li>
              <li><Link className="hover:text-orange-400 transition-colors" href="/delivery/login">Rider Login</Link></li>
              <li><Link className="hover:text-orange-400 transition-colors" href="/delivery/register">Become a Courier</Link></li>
            </ul>
          </div>

          {/* Col 3: Support */}
          <div className="min-w-0">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">Support</h4>
            <ul className="mt-2 space-y-1.5 text-xs">
              <li><Link className="hover:text-orange-400 transition-colors" href="/contact">Contact Us</Link></li>
              <li><a href="mailto:campusbites.co.in@gmail.com" className="hover:text-orange-400 transition-colors">Email Help Desk</a></li>
              <li><Link className="hover:text-orange-400 transition-colors" href="/terms">Terms of Service</Link></li>
              <li><Link className="hover:text-orange-400 transition-colors" href="/privacy">Privacy Policy</Link></li>
              <li><Link className="hover:text-orange-400 transition-colors" href="/refund-policy">Refund Policy</Link></li>
            </ul>
          </div>

          {/* Col 4: Contact & Operations */}
          <div className="min-w-0">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">Admin</h4>
            <ul className="mt-2 space-y-1.5 text-xs">
              <li>
                <a href="tel:9404125117" className="hover:text-orange-400 transition-colors flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-orange-400 shrink-0" />
                  <span className="truncate">Call: +91 9404125117</span>
                </a>
              </li>
              <li>
                <a href="https://wa.me/919024197988" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors flex items-center gap-1.5">
                  <MessageCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span className="truncate">WhatsApp: +91 9024197988</span>
                </a>
              </li>
              <li>
                <a href="mailto:campusbites.co.in@gmail.com" className="hover:text-orange-400 transition-colors flex items-center gap-1.5" title="campusbites.co.in@gmail.com">
                  <Mail className="h-3 w-3 text-amber-400 shrink-0" />
                  <span className="truncate">campusbites.co.in@gmail.com</span>
                </a>
              </li>
              <li>
                <a href="https://instagram.com/campusbites.co.in" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors flex items-center gap-1.5">
                  <InstagramIcon className="h-3 w-3 text-pink-400 shrink-0" />
                  <span className="truncate">@campusbites.co.in</span>
                </a>
              </li>
              <li className="pt-1">
                <Link className="hover:text-orange-400 transition-colors font-medium text-zinc-300 block truncate" href="/admin/verifications">
                  Admin Verification Hub
                </Link>
              </li>
              <li>
                <span className="text-[11px] text-zinc-500 block truncate">Zeal College Campus Network</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Founder & Campus Leadership Statement */}
        <div className="mt-6 pt-4 border-t border-zinc-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-200">Founder &amp; CEO: Vinit Awathare</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">Zeal Institutes Narhe Campus, Pune</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Verified Campus Food Aggregator | Zeal Institutes Narhe Campus</span>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="mt-4 flex flex-col items-center justify-between gap-2 border-t border-zinc-900 pt-4 text-center sm:flex-row sm:text-left text-[11px] text-zinc-500">
          <p>© 2026 CampusBite Technologies. Built for campus communities.</p>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className="text-emerald-400 text-xs">🔒</span> Verified Campus Food Aggregator | Zeal Institutes Narhe Campus
          </div>
        </div>
      </div>
    </footer>
  );
}