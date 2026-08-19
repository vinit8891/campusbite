"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Home,
  Package,
  Bike,
  IndianRupee,
  User,
  LogOut,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { clearAuthForRole } from "@/lib/authTokens";



export default function DeliverySidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const menu = [
    {
      name: "Dashboard",
      href: ROUTES.DELIVERY_DASHBOARD,
      icon: Home,
    },
    {
      name: "Available Orders",
      href: ROUTES.DELIVERY_AVAILABLE,
      icon: Package,
    },
    {
      name: "My Orders",
      href: ROUTES.DELIVERY_ORDERS,
      icon: Bike,
    },
    {
      name: "History",
      href: ROUTES.DELIVERY_HISTORY,
      icon: IndianRupee,
    },
    {
      name: "Profile",
      href: ROUTES.DELIVERY_PROFILE,
      icon: User,
    },
  ];

  function handleLogout() {
    clearAuthForRole("delivery_partner");
    router.push(ROUTES.DELIVERY_LOGIN);
  }


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
            const active = pathname === item.href;

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
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-orange-500"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>

    </aside>
  );
}