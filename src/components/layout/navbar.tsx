"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingCart, User } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { MobileDrawer } from "@/components/layout/MobileDrawer";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, isLoggedIn } = useAuth();
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
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <Link
            href={ROUTES.HOME}
            className="flex items-center gap-2 text-2xl font-bold text-primary hover:opacity-90 transition-opacity"
            aria-label="CampusBite Home"
          >
            <span role="img" aria-label="Plate and cutlery">
              🍽️
            </span>
            <span className="tracking-tight">CampusBite</span>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden items-center gap-8 md:flex"
            aria-label="Main desktop navigation"
          >
            <Link
              href={ROUTES.HOME}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isLinkActive(ROUTES.HOME)
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              Home
            </Link>
            <Link
              href={ROUTES.RESTAURANTS}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isLinkActive(ROUTES.RESTAURANTS)
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              Restaurants
            </Link>
            <Link
              href={ROUTES.SUBSCRIPTIONS}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isLinkActive(ROUTES.SUBSCRIPTIONS)
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              Mess
            </Link>
            <Link
              href={ROUTES.ABOUT}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isLinkActive(ROUTES.ABOUT)
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              About
            </Link>
            <Link
              href={ROUTES.CONTACT}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isLinkActive(ROUTES.CONTACT)
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              Contact
            </Link>
          </nav>

          {/* Desktop Right */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href={ROUTES.CART}
              aria-label={`Shopping cart with ${totalItems} items`}
            >
              <Button variant="outline" className="relative gap-2">
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                <span>Cart</span>
                <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                  {totalItems}
                </span>
              </Button>
            </Link>

            {isLoggedIn ? (
              <>
                <Link href={ROUTES.MY_ORDERS}>
                  <Button variant="outline">My Orders</Button>
                </Link>

                <Link href={ROUTES.PROFILE}>
                  <Button variant="outline" className="gap-2">
                    <User className="h-4 w-4" aria-hidden="true" />
                    <span className="max-w-[120px] truncate">
                      {user?.name || "Profile"}
                    </span>
                  </Button>
                </Link>

                <Button variant="outline" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href={ROUTES.LOGIN}>
                  <Button variant="outline">Login</Button>
                </Link>

                <Link href={ROUTES.REGISTER}>
                  <Button>Register</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href={ROUTES.CART}
              className="relative p-2 text-gray-700 hover:text-primary transition-colors"
              aria-label={`Shopping cart with ${totalItems} items`}
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
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
              className="h-10 w-10 rounded-xl"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
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