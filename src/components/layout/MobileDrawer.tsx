"use client";

import React, { useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  UtensilsCrossed,
  CalendarCheck,
  ShoppingBag,
  ShoppingCart,
  Info,
  PhoneCall,
  LogOut,
  LogIn,
  UserPlus,
  X,
  ChevronRight,
  User as UserIcon,
  QrCode,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ROUTES } from "@/lib/routes";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { user, logout, isLoggedIn } = useAuth();
  const { cart } = useCart();

  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleLogout = useCallback(() => {
    logout();
    onClose();
  }, [logout, onClose]);

  const isActive = (path: string) => {
    if (path === ROUTES.HOME) {
      return pathname === ROUTES.HOME;
    }
    return pathname.startsWith(path);
  };

  const navItems = [
    {
      label: "Home",
      href: ROUTES.HOME,
      icon: Home,
      badge: null,
    },
    {
      label: "Restaurants",
      href: ROUTES.RESTAURANTS,
      icon: UtensilsCrossed,
      badge: null,
    },
    {
      label: "Hostel Mess Plans",
      href: ROUTES.SUBSCRIPTIONS,
      icon: CalendarCheck,
      badge: null,
    },
    {
      label: "🎟️ Digital Meal Pass",
      href: ROUTES.SUBSCRIPTIONS_PASS,
      icon: QrCode,
      badge: null,
    },
    {
      label: "My Orders",
      href: ROUTES.MY_ORDERS,
      icon: ShoppingBag,
      badge: isLoggedIn ? (
        <span
          data-testid="active-order-pulse"
          className="relative flex h-2.5 w-2.5 ml-auto mr-1"
        >
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
        </span>
      ) : null,
    },
    {
      label: "Cart",
      href: ROUTES.CART,
      icon: ShoppingCart,
      badge: (
        <span
          data-testid="cart-badge"
          className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-orange-600 rounded-full"
        >
          {totalItems}
        </span>
      ),
    },
    {
      label: "About & Campus FAQ",
      href: ROUTES.ABOUT,
      icon: Info,
      badge: null,
    },
    {
      label: "Contact Support",
      href: ROUTES.CONTACT,
      icon: PhoneCall,
      badge: null,
    },
  ];

  return (
    <>
      {/* Backdrop overlay */}
      <div
        data-testid="drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 bg-black/50 backdrop-blur-xs z-50 transition-opacity duration-300 ease-in-out ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sliding Drawer Shell */}
      <aside
        id="mobile-navigation-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="CampusBite Navigation Menu"
        className={`fixed top-0 left-0 bottom-0 z-50 w-[82vw] max-w-sm h-full bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Bar Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <Link
            href={ROUTES.HOME}
            onClick={onClose}
            className="flex items-center gap-2 text-xl font-bold text-orange-600 hover:opacity-90 transition-opacity"
            aria-label="CampusBite Home"
          >
            <span className="text-2xl" role="img" aria-label="Plate and cutlery">
              🍽️
            </span>
            <span className="tracking-tight">CampusBite</span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* User Profile Banner / Auth Card */}
        <div className="px-4 pt-3 pb-1">
          {isLoggedIn ? (
            <Link
              href={ROUTES.PROFILE}
              onClick={onClose}
              className="flex items-center gap-3.5 bg-orange-50/80 hover:bg-orange-100/80 border border-orange-100 rounded-2xl p-4 transition-all duration-200 group cursor-pointer shadow-xs"
              aria-label="View user profile"
            >
              {/* Circular Avatar */}
              <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white font-bold flex items-center justify-center text-lg shadow-xs shrink-0 uppercase ring-2 ring-orange-200">
                {user?.name ? user.name.charAt(0) : "U"}
              </div>

              {/* User Info & Role Badge */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-orange-600 transition-colors">
                    {user?.name || "Om Roy"}
                  </h3>
                </div>
                <div className="mt-0.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                    Student / Customer
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-1">
                  {user?.email || "student@campus.edu"}
                </p>
              </div>

              <ChevronRight className="h-4 w-4 text-orange-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          ) : (
            <div className="bg-orange-50/70 border border-orange-100 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Welcome to CampusBite!
                  </h3>
                  <p className="text-xs text-gray-500">
                    Sign in to track orders and mess meals
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Link
                  href={ROUTES.LOGIN}
                  onClick={onClose}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition-colors shadow-xs"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Link>
                <Link
                  href={ROUTES.REGISTER}
                  onClick={onClose}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 hover:text-orange-600 transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Main Navigation List */}
        <nav
          className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5"
          aria-label="Mobile main navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium transition-colors text-sm ${
                  active
                    ? "bg-orange-50 text-orange-600 font-semibold border-l-4 border-orange-500"
                    : "text-gray-700 hover:bg-gray-100 hover:text-orange-600"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    active ? "text-orange-600" : "text-gray-500"
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
                {item.badge}
              </Link>
            );
          })}
        </nav>

        {/* Sticky Bottom Action / Logout / Version Tag */}
        <div className="mt-auto border-t border-gray-100 p-4 bg-gray-50/70 flex flex-col gap-3 shrink-0">
          {isLoggedIn && (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors text-sm font-medium shadow-xs"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Logout</span>
            </button>
          )}

          {/* Version Tag */}
          <div className="text-center text-[11px] font-medium text-gray-400 select-none">
            CampusBite v1.0 • Closed Campus Delivery
          </div>
        </div>
      </aside>
    </>
  );
}

export default MobileDrawer;
