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
  /** "cod" | "online" */
  payment_method: string;
  /** Customer must explicitly confirm COD before placing order. */
  cod_confirmed: boolean;
  /** Customer must confirm online payment understanding. */
  online_confirmed: boolean;

  // Delivery for
  delivery_for: "self" | "someone_else";

  // Google Maps GPS
  latitude: number | null;
  longitude: number | null;

  // Restaurant GPS
  restaurant_email: string;
  restaurant_latitude: number;
  restaurant_longitude: number;
};

type CheckoutContextType = {
  checkout: CheckoutData;
  setCheckout: React.Dispatch<React.SetStateAction<CheckoutData>>;
};

const defaultCheckout: CheckoutData = {
  customer_name: "",
  phone: "",
  address: "",
  city: "",
  pincode: "",
  landmark: "",

  payment_method: "cod",
  cod_confirmed: false,
  online_confirmed: false,

  delivery_for: "self",

  latitude: null,
  longitude: null,

  restaurant_email: "",
  restaurant_latitude: 18.52043,
  restaurant_longitude: 73.856743,
};

function normalizePaymentMethod(value: unknown): string {
  const raw = String(value || "cod")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (
    raw === "online" ||
    raw === "online_payment" ||
    raw === "razorpay" ||
    raw.includes("upi") ||
    raw.includes("card")
  ) {
    return "online";
  }
  return "cod";
}

const CheckoutContext = createContext<CheckoutContextType | null>(null);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [checkout, setCheckout] = useState<CheckoutData>(defaultCheckout);

  useEffect(() => {
    const saved = localStorage.getItem("checkout");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        setCheckout({
          customer_name: parsed.customer_name || "",
          phone: parsed.phone || "",
          address: parsed.address || "",
          city: parsed.city || "",
          pincode: parsed.pincode || "",
          landmark: parsed.landmark || "",
          payment_method: normalizePaymentMethod(parsed.payment_method),
          cod_confirmed: false,
          online_confirmed: false,
          delivery_for: parsed.delivery_for || "self",
          latitude: parsed.latitude ?? null,
          longitude: parsed.longitude ?? null,
          restaurant_email: parsed.restaurant_email || "",
          restaurant_latitude: parsed.restaurant_latitude ?? 18.52043,
          restaurant_longitude: parsed.restaurant_longitude ?? 73.856743,
        });
      } catch (error) {
        console.error("Invalid checkout data", error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("checkout", JSON.stringify(checkout));
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
  const context = useContext(CheckoutContext);

  if (!context) {
    throw new Error("useCheckout must be used inside CheckoutProvider");
  }

  return context;
}
