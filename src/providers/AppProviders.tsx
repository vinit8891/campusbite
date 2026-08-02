"use client";

import { ReactNode } from "react";

import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";

export default function AppProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </AuthProvider>
  );
}