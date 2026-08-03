"use client";

import {
  createContext,
  useContext,
  useState,
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
};

type CheckoutContextType = {
  checkout: CheckoutData;
  setCheckout: React.Dispatch<
    React.SetStateAction<CheckoutData>
  >;
};

const CheckoutContext =
  createContext<CheckoutContextType | null>(null);

export function CheckoutProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [checkout, setCheckout] = useState<CheckoutData>({
    customer_name: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
    landmark: "",
    payment_method: "Cash on Delivery",
  });

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
  const context = useContext(CheckoutContext);

  if (!context) {
    throw new Error(
      "useCheckout must be used inside CheckoutProvider"
    );
  }

  return context;
}