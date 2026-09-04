"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ShoppingBag,
  User as UserIcon,
  Settings,
  Clock,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/lib/routes";

export function UserNavDropdown() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
        className="flex items-center gap-2 py-1 pl-1.5 pr-2.5 rounded-full border border-orange-200/80 bg-orange-50/80 hover:bg-orange-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/40 cursor-pointer shadow-2xs"
      >
        {/* Circular Avatar */}
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-xs ring-1 ring-white">
          {initial}
        </div>

        <span className="text-sm font-semibold text-gray-800 max-w-[100px] truncate hidden xl:inline">
          {user?.name?.split(" ")[0] || "Account"}
        </span>

        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-orange-600" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-label="User profile options"
          className="absolute right-0 mt-2 w-64 rounded-2xl border border-orange-100 bg-white p-2 shadow-xl shadow-orange-950/10 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* User Header Info */}
          <div className="px-3 py-2.5 border-b border-gray-100 mb-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-gray-900 text-sm truncate">
                {user?.name || "Student"}
              </h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200 shrink-0">
                Student Account
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {user?.email || "student@campus.edu"}
            </p>
          </div>

          {/* Menu Items */}
          <div className="space-y-0.5">
            <Link
              href={ROUTES.MY_ORDERS}
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              <ShoppingBag className="h-4 w-4 text-gray-500" />
              <span>My Orders</span>
            </Link>

            <Link
              href={ROUTES.PROFILE}
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              <Settings className="h-4 w-4 text-gray-500" />
              <span>Account & Settings</span>
            </Link>

            <Link
              href={ROUTES.SUBSCRIPTIONS_CALENDAR}
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              <Clock className="h-4 w-4 text-gray-500" />
              <span>Campus Batch Schedule</span>
            </Link>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 my-1" />

          {/* Sign Out */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            role="menuitem"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-red-500" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default UserNavDropdown;
