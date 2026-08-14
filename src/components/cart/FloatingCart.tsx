"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";

export default function FloatingCart() {
  const { cart } = useCart();

  if (cart.length === 0) return null;

  const items = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="fixed bottom-5 left-1/2 z-50 w-[92%] max-w-xl -translate-x-1/2">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-orange-400/20 bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-white shadow-2xl transition-all duration-200 hover:scale-[1.02]">
        {/* Cart Info */}
        <div className="flex min-w-0 items-center gap-3">
          <ShoppingCart className="h-6 w-6 shrink-0" />

          <p className="font-semibold text-white">
            {items} {items === 1 ? "Item" : "Items"}
          </p>
        </div>

        {/* Total */}
        <p className="shrink-0 text-xl font-bold text-white">
          ₹{total}
        </p>

        {/* View Cart */}
        <Link href="/cart" className="shrink-0">
          <Button
            variant="ghost"
            className="font-semibold text-white transition-all duration-200 hover:translate-x-1 hover:bg-transparent hover:text-white"
          >
            View Cart →
          </Button>
        </Link>
      </div>
    </div>
  );
}