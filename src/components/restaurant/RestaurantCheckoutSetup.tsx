"use client";

import { useEffect } from "react";
import { useCheckout } from "@/context/CheckoutContext";

type Props = {
  restaurantEmail: string;
  latitude?: number;
  longitude?: number;
};

export default function RestaurantCheckoutSetup({
  restaurantEmail,
  latitude = 18.52043,
  longitude = 73.856743,
}: Props) {
  const { setCheckout } = useCheckout();

  useEffect(() => {
    setCheckout((prev) => ({
      ...prev,

      restaurant_email: restaurantEmail,

      restaurant_latitude: latitude,

      restaurant_longitude: longitude,
    }));
  }, [
    restaurantEmail,
    latitude,
    longitude,
    setCheckout,
  ]);

  return null;
}