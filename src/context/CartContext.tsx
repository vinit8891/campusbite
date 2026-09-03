"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

import type { CartItem } from "@/types";
import type { DeliveryType } from "@/lib/orderPricing";

type CartContextType = {
  cart: CartItem[];
  restaurantEmail: string | null;
  restaurantName: string | null;
  deliveryType: DeliveryType;
  setDeliveryType: (type: DeliveryType) => void;
  addToCart: (item: CartItem) => void;
  increaseQuantity: (id: string) => void;
  decreaseQuantity: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryType, setDeliveryTypeState] =
    useState<DeliveryType>("HOSTEL_BATCH");

  const restaurantEmail =
    cart.length > 0 ? cart[0].restaurant_email : null;

  const restaurantName =
    cart.length > 0 ? cart[0].restaurant_name ?? null : null;

  // Load cart
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");

    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error("Invalid cart data:", error);
        localStorage.removeItem("cart");
      }
    }

    const savedDelivery = localStorage.getItem("delivery_type");
    if (savedDelivery === "STANDARD" || savedDelivery === "HOSTEL_BATCH") {
      setDeliveryTypeState(savedDelivery);
    } else {
      const savedCheckout = localStorage.getItem("checkout");
      if (savedCheckout) {
        try {
          const parsed = JSON.parse(savedCheckout);
          if (
            parsed.delivery_type === "STANDARD" ||
            parsed.delivery_type === "HOSTEL_BATCH"
          ) {
            setDeliveryTypeState(parsed.delivery_type);
          }
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const setDeliveryType = useCallback((type: DeliveryType) => {
    setDeliveryTypeState(type);
    localStorage.setItem("delivery_type", type);
    try {
      const savedCheckout = localStorage.getItem("checkout");
      const checkoutObj = savedCheckout ? JSON.parse(savedCheckout) : {};
      checkoutObj.delivery_type = type;
      localStorage.setItem("checkout", JSON.stringify(checkoutObj));
    } catch {
      // ignore
    }
  }, []);

  // Save cart
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      // First item
      if (prev.length === 0) {
        return [item];
      }

      // Different restaurant
      if (prev[0].restaurant_email !== item.restaurant_email) {
        const replace = window.confirm(
          "Your cart contains items from another restaurant. Clear the cart and add this item?"
        );

        if (!replace) {
          return prev;
        }

        return [item];
      }

      const existing = prev.find(
        (i) => i.id === item.id
      );

      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                quantity: i.quantity + 1,
              }
            : i
        );
      }

      return [...prev, item];
    });
  }, []);

  const increaseQuantity = useCallback((id: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.max(1, item.quantity + 1),
            }
          : item
      )
    );
  }, []);

  const decreaseQuantity = useCallback((id: string) => {
    setCart((prev) =>
      prev.flatMap((item) => {
        if (item.id !== id) {
          return item;
        }

        if (item.quantity <= 1) {
          return [];
        }

        return {
          ...item,
          quantity: item.quantity - 1,
        };
      })
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) =>
      prev.filter((item) => item.id !== id)
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const value = useMemo(
    () => ({
      cart,
      restaurantEmail,
      restaurantName,
      deliveryType,
      setDeliveryType,
      addToCart,
      increaseQuantity,
      decreaseQuantity,
      removeFromCart,
      clearCart,
    }),
    [
      cart,
      restaurantEmail,
      restaurantName,
      deliveryType,
      setDeliveryType,
      addToCart,
      increaseQuantity,
      decreaseQuantity,
      removeFromCart,
      clearCart,
    ]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
}