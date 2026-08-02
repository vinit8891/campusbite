"use client";

import { useAuth } from "@/context/AuthContext";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Navbar() {

  const { user, logout, isLoggedIn } = useAuth();
      const { cart } = useCart();

    const totalItems = cart.reduce(
      (total, item) => total + item.quantity,
      0
    );
  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-bold text-primary"
        >
          🍽️ CampusBite
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/">Home</Link>
          <Link href="/restaurants">Restaurants</Link>
          <Link href="/mess">Mess</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </nav>

        {/* Desktop Button */}
        <div className="hidden items-center gap-4 md:flex">

          <Link href="/cart">
            <Button variant="outline">

              <ShoppingCart className="mr-2 h-4 w-4" />

              {totalItems}

            </Button>
          </Link>

          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <span className="font-medium">
                👋 {user?.name}
              </span>

              <Button
                variant="outline"
                onClick={logout}
              >
                Logout
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button>
                Login
              </Button>
            </Link>
          )}

</div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet>

            <SheetTrigger
              render={
                <Button
                  size="icon"
                  variant="outline"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              }
            />

            <SheetContent side="right">

              <div className="mt-8 flex flex-col gap-6">

                <Link href="/">Home</Link>

                <Link href="/restaurants">
                  Restaurants
                </Link>

                <Link href="/mess">
                  Mess
                </Link>

                <Link href="/about">
                  About
                </Link>

                <Link href="/contact">
                  Contact
                </Link>

                <Link href="/cart">

                <Button
                  variant="outline"
                  className="w-full justify-start"
                >

                  <ShoppingCart className="mr-2 h-4 w-4" />

                  Cart ({totalItems})

                </Button>

              </Link>

              {isLoggedIn ? (
  <>
                    <div className="font-medium">
                      👋 {user?.name}
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={logout}
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <Link href="/login">
                    <Button className="mt-4 w-full">
                      Login
                    </Button>
                  </Link>
                )}

              </div>

            </SheetContent>

          </Sheet>
        </div>

      </div>
    </header>
  );
}