"use client";

import Link from "next/link";
import { Menu, ShoppingCart, User } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

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

        {/* Desktop Navigation */}

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/">Home</Link>
          <Link href="/restaurants">Restaurants</Link>
          <Link href="/mess">Mess</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </nav>

        {/* Desktop Right */}

        <div className="hidden items-center gap-3 md:flex">

          <Link href="/cart">
            <Button variant="outline">
              <ShoppingCart className="mr-2 h-4 w-4" />
              {totalItems}
            </Button>
          </Link>

          {isLoggedIn ? (
            <>
              <Link href="/my-orders">
                <Button variant="outline">
                  My Orders
                </Button>
              </Link>

              <Link href="/profile">
                <Button variant="outline">
                  <User className="mr-2 h-4 w-4" />
                  {user?.name}
                </Button>
              </Link>

              <Button
                variant="outline"
                onClick={logout}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline">
                  Login
                </Button>
              </Link>

              <Link href="/register">
                <Button>
                  Register
                </Button>
              </Link>
            </>
          )}

        </div>

        {/* Mobile */}

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

              <div className="mt-8 flex flex-col gap-5">

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

                    <div className="font-semibold">
                      👋 {user?.name}
                    </div>

                    <Link href="/my-orders">

                      <Button
                        variant="outline"
                        className="w-full"
                      >
                        My Orders
                      </Button>

                    </Link>

                    <Link href="/profile">

                      <Button
                        variant="outline"
                        className="w-full"
                      >
                        Profile
                      </Button>

                    </Link>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={logout}
                    >
                      Logout
                    </Button>

                  </>
                ) : (
                  <>

                    <Link href="/login">

                      <Button
                        variant="outline"
                        className="w-full"
                      >
                        Login
                      </Button>

                    </Link>

                    <Link href="/register">

                      <Button className="w-full">
                        Register
                      </Button>

                    </Link>

                  </>
                )}

              </div>

            </SheetContent>

          </Sheet>

        </div>

      </div>
    </header>
  );
}