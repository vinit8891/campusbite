"use client";

import { ReactNode } from "react";
import { CartProvider } from "@/context/CartContext";

type AppProvidersProps = {
  children: ReactNode;
};

export default function AppProviders({
  children,
}: AppProvidersProps) {
  return (
    <CartProvider>
      {children}
    </CartProvider>
  );
}