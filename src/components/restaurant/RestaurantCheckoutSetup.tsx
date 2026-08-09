"use client";

import { useEffect } from "react";
import { useCheckout } from "@/context/CheckoutContext";

type Props = {
  restaurantEmail: string;
  latitude?: number | null;
  longitude?: number | null;
};

export default function RestaurantCheckoutSetup({
  restaurantEmail,
  latitude,
  longitude,
}: Props) {
  const { setCheckout } = useCheckout();

  useEffect(() => {
    setCheckout((prev) => ({
      ...prev,

      restaurant_email: restaurantEmail,

      restaurant_latitude:
        latitude ?? prev.restaurant_latitude ?? 18.52043,

      restaurant_longitude:
        longitude ?? prev.restaurant_longitude ?? 73.856743,
    }));
  }, [
    restaurantEmail,
    latitude,
    longitude,
    setCheckout,
  ]);

  return null;
}