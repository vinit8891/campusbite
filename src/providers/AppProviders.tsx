"use client";

import { ReactNode } from "react";

import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { CheckoutProvider } from "@/context/CheckoutContext";

export default function AppProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      <CheckoutProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </CheckoutProvider>
    </AuthProvider>
  );
}