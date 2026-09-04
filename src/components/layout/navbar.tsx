"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingCart } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { UserNavDropdown } from "@/components/layout/UserNavDropdown";

export function Navbar() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const { cart } = useCart();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

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

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-orange-100/70 bg-white/90 backdrop-blur-md shadow-xs supports-backdrop-filter:bg-white/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Brand Logo with warm badge */}
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
            <span className="text-xl font-bold tracking-tight text-gray-900 group-hover:text-orange-600 transition-colors">
              Campus<span className="text-orange-600">Bite</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            className="hidden items-center gap-1.5 md:flex"
            aria-label="Main desktop navigation"
          >
            <Link
              href={ROUTES.HOME}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-orange-50/60 hover:text-orange-600 ${
                isLinkActive(ROUTES.HOME)
                  ? "bg-orange-50 text-orange-600 font-semibold"
                  : "text-gray-600"
              }`}
            >
              Home
            </Link>
            <Link
              href={ROUTES.RESTAURANTS}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-orange-50/60 hover:text-orange-600 ${
                isLinkActive(ROUTES.RESTAURANTS)
                  ? "bg-orange-50 text-orange-600 font-semibold"
                  : "text-gray-600"
              }`}
            >
              Restaurants
            </Link>
            <Link
              href={ROUTES.SUBSCRIPTIONS}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-orange-50/60 hover:text-orange-600 ${
                isLinkActive(ROUTES.SUBSCRIPTIONS)
                  ? "bg-orange-50 text-orange-600 font-semibold"
                  : "text-gray-600"
              }`}
            >
              Mess Plans
            </Link>
            <Link
              href={ROUTES.ABOUT}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-orange-50/60 hover:text-orange-600 ${
                isLinkActive(ROUTES.ABOUT)
                  ? "bg-orange-50 text-orange-600 font-semibold"
                  : "text-gray-600"
              }`}
            >
              About
            </Link>
            <Link
              href={ROUTES.CONTACT}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-orange-50/60 hover:text-orange-600 ${
                isLinkActive(ROUTES.CONTACT)
                  ? "bg-orange-50 text-orange-600 font-semibold"
                  : "text-gray-600"
              }`}
            >
              Contact
            </Link>
          </nav>

          {/* Desktop Right Controls */}
          <div className="hidden items-center gap-3 md:flex">
            {/* Styled Cart Pill */}
            <Link
              href={ROUTES.CART}
              aria-label={`Shopping cart with ${totalItems} items`}
              className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2 text-sm font-semibold text-orange-700 shadow-2xs hover:bg-orange-100 transition-colors"
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
              <div className="flex items-center gap-2">
                <Link
                  href={ROUTES.LOGIN}
                  className="rounded-xl px-3.5 py-2 text-sm font-semibold text-gray-700 hover:text-orange-600 transition-colors"
                >
                  Sign In
                </Link>

                <Link
                  href={ROUTES.REGISTER}
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-orange-700 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Actions & Hamburger */}
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