"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type CheckoutData = {
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  landmark: string;
  payment_method: string;

  // Google Maps
  latitude: number | null;
  longitude: number | null;
};

type CheckoutContextType = {
  checkout: CheckoutData;
  setCheckout: React.Dispatch<
    React.SetStateAction<CheckoutData>
  >;
};

const defaultCheckout: CheckoutData = {
  customer_name: "",
  phone: "",
  address: "",
  city: "",
  pincode: "",
  landmark: "",
  payment_method: "Cash on Delivery",

  latitude: null,
  longitude: null,
};

const CheckoutContext =
  createContext<CheckoutContextType | null>(null);

export function CheckoutProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [checkout, setCheckout] =
    useState<CheckoutData>(defaultCheckout);

  // Load checkout from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("checkout");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        setCheckout({
          customer_name:
            parsed.customer_name || "",
          phone: parsed.phone || "",
          address: parsed.address || "",
          city: parsed.city || "",
          pincode: parsed.pincode || "",
          landmark: parsed.landmark || "",
          payment_method:
            parsed.payment_method ||
            "Cash on Delivery",

          latitude:
            parsed.latitude ?? null,

          longitude:
            parsed.longitude ?? null,
        });
      } catch (error) {
        console.error(
          "Invalid checkout data",
          error
        );
      }
    }
  }, []);

  // Save checkout
  useEffect(() => {
    localStorage.setItem(
      "checkout",
      JSON.stringify(checkout)
    );
  }, [checkout]);

  return (
    <CheckoutContext.Provider
      value={{
        checkout,
        setCheckout,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(
    CheckoutContext
  );

  if (!context) {
    throw new Error(
      "useCheckout must be used inside CheckoutProvider"
    );
  }

  return context;
}