"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Home,
  Package,
  Bike,
  IndianRupee,
  User,
  LogOut,
} from "lucide-react";

export default function DeliverySidebar() {
  const pathname = usePathname();

  const menu = [
    {
      name: "Dashboard",
      href: "/delivery/dashboard",
      icon: Home,
    },
    {
      name: "Available Orders",
      href: "/delivery/dashboard/available-orders",
      icon: Package,
    },
    {
      name: "My Deliveries",
      href: "/delivery/dashboard/my-deliveries",
      icon: Bike,
    },
    {
      name: "Earnings",
      href: "/delivery/dashboard/earnings",
      icon: IndianRupee,
    },
    {
      name: "Profile",
      href: "/delivery/dashboard/profile",
      icon: User,
    },
  ];

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-72 flex-col bg-orange-600 text-white">

      <div className="border-b border-orange-500 p-8">

        <h1 className="text-3xl font-bold">
          🚴 CampusBite
        </h1>

        <p className="mt-1 text-orange-100">
          Delivery Partner
        </p>

      </div>

      <nav className="flex-1 px-4 py-6">

        <div className="space-y-2">

          {menu.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                  active
                    ? "bg-white text-orange-600"
                    : "hover:bg-orange-500"
                }`}
              >
                <Icon size={20} />

                <span>{item.name}</span>
              </Link>
            );
          })}

        </div>

      </nav>

      <div className="border-t border-orange-500 p-5">

        <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-orange-500">

          <LogOut size={20} />

          Logout

        </button>

      </div>

    </aside>
  );
}