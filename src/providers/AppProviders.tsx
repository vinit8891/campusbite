"use client";

import { ReactNode } from "react";

import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { CheckoutProvider } from "@/context/CheckoutContext";
import { LocationProvider } from "@/context/LocationContext";

export default function AppProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      <CheckoutProvider>
        <LocationProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </LocationProvider>
      </CheckoutProvider>
    </AuthProvider>
  );
}