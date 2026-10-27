"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ShoppingCart, Search, X } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useLocation } from "@/context/LocationContext";
import { useUserLocation } from "@/hooks/useUserLocation";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { UserNavDropdown } from "@/components/layout/UserNavDropdown";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { cart } = useCart();
  const { openLocationModal } = useLocation();
  const { campusLabel } = useUserLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");

  const displayLocation = campusLabel || "Near Zeal College, Narhe";

  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const isLinkActive = (path: string) => {
    if (path === ROUTES.HOME) {
      return pathname === ROUTES.HOME;
    }
    return pathname.startsWith(path);
  };

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = headerSearch.trim();
    if (clean) {
      router.push(`${ROUTES.MENU}?q=${encodeURIComponent(clean)}`);
    } else {
      router.push(ROUTES.MENU);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-orange-100/70 bg-white/95 backdrop-blur-md shadow-xs supports-backdrop-filter:bg-white/80">
        <div className="w-full max-w-md md:max-w-7xl mx-auto flex h-16 items-center justify-between px-4 gap-2 sm:gap-4">
          {/* Brand Logo & Location Indicator */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
            <Link
              href={ROUTES.HOME}
              className="flex items-center gap-2 group shrink-0"
              aria-label="CampusBite Home"
            >
              <Image
                src="/images/brand-logo.png"
                alt="CampusBite Logo"
                width={48}
                height={48}
                className="h-9 sm:h-10 md:h-11 w-auto object-contain"
                priority
              />
              <span className="text-lg sm:text-xl md:text-2xl font-bold font-serif tracking-tight text-neutral-900 group-hover:text-orange-600 transition-colors">
                Campus<span className="text-orange-600">Bite</span>
              </span>
            </Link>

            {/* Top Location Pill */}
            <button
              type="button"
              onClick={openLocationModal}
              className="hidden lg:flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50/80 px-2.5 py-1 text-xs text-zinc-700 max-w-[170px] hover:border-orange-300 hover:bg-orange-100 hover:text-orange-700 transition-all cursor-pointer active:scale-98 shadow-xs"
              aria-label="Change campus delivery location"
            >
              <span className="shrink-0 text-orange-500" aria-hidden="true">📍</span>
              <span className="truncate font-medium">{displayLocation || "Zeal Campus"}</span>
              <span className="shrink-0 text-orange-600 font-semibold">(Change)</span>
            </button>
          </div>

          {/* Desktop Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex relative items-center flex-1 max-w-xs lg:max-w-sm"
          >
            <Search className="absolute left-3 h-4 w-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Search dishes, tags, canteens..."
              className="w-full h-9 pl-9 pr-8 rounded-xl bg-stone-100/90 border border-stone-200/80 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-orange-500 focus:outline-none transition shadow-2xs"
            />
            {headerSearch && (
              <button
                type="button"
                onClick={() => setHeaderSearch("")}
                aria-label="Clear search input"
                className="absolute right-2.5 p-0.5 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>

          {/* Desktop Navigation Links */}
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Main desktop navigation"
          >
            <Link
              href={ROUTES.HOME}
              className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-orange-50/60 hover:text-orange-600 ${
                isLinkActive(ROUTES.HOME)
                  ? "bg-orange-50 text-orange-600 font-semibold"
                  : "text-gray-600"
              }`}
            >
              Home
            </Link>
            <Link
              href={ROUTES.MENU}
              className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-orange-50/60 hover:text-orange-600 ${
                isLinkActive(ROUTES.MENU)
                  ? "bg-orange-50 text-orange-600 font-semibold"
                  : "text-gray-600"
              }`}
            >
              Menu
            </Link>
            <Link
              href={ROUTES.RESTAURANTS}
              className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-orange-50/60 hover:text-orange-600 ${
                isLinkActive(ROUTES.RESTAURANTS)
                  ? "bg-orange-50 text-orange-600 font-semibold"
                  : "text-gray-600"
              }`}
            >
              Restaurants
            </Link>
            <Link
              href={ROUTES.SUBSCRIPTIONS}
              className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-orange-50/60 hover:text-orange-600 ${
                isLinkActive(ROUTES.SUBSCRIPTIONS)
                  ? "bg-orange-50 text-orange-600 font-semibold"
                  : "text-gray-600"
              }`}
            >
              Mess Plans
            </Link>
            <Link
              href={ROUTES.ABOUT}
              className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-orange-50/60 hover:text-orange-600 ${
                isLinkActive(ROUTES.ABOUT)
                  ? "bg-orange-50 text-orange-600 font-semibold"
                  : "text-gray-600"
              }`}
            >
              About
            </Link>
            <Link
              href={ROUTES.CONTACT}
              className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-orange-50/60 hover:text-orange-600 ${
                isLinkActive(ROUTES.CONTACT)
                  ? "bg-orange-50 text-orange-600 font-semibold"
                  : "text-gray-600"
              }`}
            >
              Contact
            </Link>
          </nav>

          {/* Desktop Right Controls */}
          <div className="hidden items-center gap-2.5 md:flex shrink-0">
            {/* Styled Cart Pill */}
            <Link
              href={ROUTES.CART}
              aria-label={`Shopping cart with ${totalItems} items`}
              className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700 shadow-2xs hover:bg-orange-100 transition-colors"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              <span>Cart</span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-xs font-bold text-white">
                {totalItems}
              </span>
            </Link>

            {isLoggedIn ? (
              <UserNavDropdown />
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href={ROUTES.LOGIN}
                  className="rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-700 hover:text-orange-600 transition-colors"
                >
                  Sign In
                </Link>

                <Link
                  href={ROUTES.REGISTER}
                  className="rounded-xl bg-orange-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-orange-700 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Right Controls: Cart & Hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href={ROUTES.CART}
              className="relative p-2 text-gray-700 hover:text-orange-600 transition-colors"
              aria-label={`Shopping cart with ${totalItems} items`}
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </Link>

            <Button
              size="icon"
              variant="outline"
              aria-label="Open navigation menu"
              aria-expanded={isMobileNavOpen}
              aria-controls="mobile-navigation-drawer"
              onClick={() => setIsMobileNavOpen(true)}
              className="h-10 w-10 rounded-xl border-gray-200"
            >
              <Menu className="h-5 w-5 text-gray-700" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Mobile Sub-Header Search Bar (Visible on mobile viewports) */}
        <div className="px-4 pb-2.5 md:hidden">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
            <Search className="absolute left-3 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Search dishes (Misal Pav, Coffee...), canteens..."
              className="w-full h-9 pl-9 pr-8 rounded-xl bg-stone-100 border border-stone-200/80 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-orange-500 focus:outline-none transition shadow-2xs"
            />
            {headerSearch && (
              <button
                type="button"
                onClick={() => setHeaderSearch("")}
                aria-label="Clear mobile search"
                className="absolute right-2.5 p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>
        </div>
      </header>

      {/* Modern Touch-friendly Mobile Drawer */}
      <MobileDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />
    </>
  );
}

export default Navbar;