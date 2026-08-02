"use client";
import Link from "next/link";
import { Menu, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/context/CartContext";

export function Navbar() {
  const { cart } = useCart();

      const totalItems = cart.reduce(
        (sum, item) => sum + item.quantity,
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

        {/* Desktop Login */}
        <div className="hidden items-center gap-4 md:flex">

          <a href="/cart">
            <Button variant="outline">
              <ShoppingCart className="mr-2 h-4 w-4" />
              {totalItems}
            </Button>
          </a>

          <Button>
            Login
          </Button>

</div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet>
          <SheetTrigger
  render={
    <Button size="icon" variant="outline">
      <Menu className="h-5 w-5" />
    </Button>
  }
/>

            <SheetContent side="right">
              <div className="mt-8 flex flex-col gap-6">
                <Link href="/">Home</Link>
                <Link href="/restaurants">Restaurants</Link>
                <Link href="/mess">Mess</Link>
                <Link href="/about">About</Link>
                <Link href="/contact">Contact</Link>

                <Button className="mt-4">
                  Login
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}