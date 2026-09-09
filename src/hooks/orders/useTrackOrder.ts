"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getOrderOTP } from "@/services/deliveryService";
import { getDeliveryLocation } from "@/services/orderService";
import { AuthHttpError } from "@/services/authFetch";
import { usePolling } from "@/hooks/usePolling";
import { hasValidCoordinates, isTerminalStatus } from "@/lib/orderDomain";
import type { TrackingLocation, OrderOtp } from "@/types";

export type { TrackingLocation, OrderOtp };

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    className: string;
    dotClassName: string;
  }
> = {
  Pending: {
    label: "Pending",
    className: "bg-orange-100 text-orange-700",
    dotClassName: "bg-orange-500",
  },
  Accepted: {
    label: "Accepted",
    className: "bg-blue-100 text-blue-700",
    dotClassName: "bg-blue-500",
  },
  Preparing: {
    label: "Preparing",
    className: "bg-yellow-100 text-yellow-700",
    dotClassName: "bg-yellow-500",
  },
  "Ready for Pickup": {
    label: "Ready for Pickup",
    className: "bg-purple-100 text-purple-700",
    dotClassName: "bg-purple-500",
  },
  Assigned: {
    label: "Assigned",
    className: "bg-blue-100 text-blue-700",
    dotClassName: "bg-blue-500",
  },
  "Picked Up": {
    label: "Picked Up",
    className: "bg-blue-100 text-blue-700",
    dotClassName: "bg-blue-500",
  },
  "Out for Delivery": {
    label: "Out for Delivery",
    className: "bg-blue-100 text-blue-700",
    dotClassName: "bg-blue-500",
  },
  Delivered: {
    label: "Delivered",
    className: "bg-green-100 text-green-700",
    dotClassName: "bg-green-500",
  },
  Rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700",
    dotClassName: "bg-red-500",
  },
  Cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700",
    dotClassName: "bg-red-500",
  },
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      label: status,
      className: "bg-gray-100 text-gray-700",
      dotClassName: "bg-gray-500",
    }
  );
}

export function useTrackOrder() {
  const params = useParams();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [location, setLocation] = useState<TrackingLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderOtp, setOrderOtp] = useState<OrderOtp | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadLocation = useCallback(async () => {
    const isInvalidOrLast =
      !orderId ||
      orderId === "undefined" ||
      orderId === "null" ||
      orderId === "last" ||
      orderId === "latest";

    if (isInvalidOrLast) {
      if (typeof window !== "undefined") {
        const rawCached = localStorage.getItem("cb_last_order");
        if (rawCached && rawCached !== "undefined" && rawCached !== "null") {
          try {
            const cached = JSON.parse(rawCached);
            if (cached) {
              const fallbackLoc: TrackingLocation = {
                status: cached.status || "Accepted",
                restaurant_latitude: cached.restaurant_latitude || 18.52043,
                restaurant_longitude: cached.restaurant_longitude || 73.856743,
                customer_latitude: cached.latitude || 18.52143,
                customer_longitude: cached.longitude || 73.857743,
                partner_latitude: cached.delivery_partner?.latitude ?? null,
                partner_longitude: cached.delivery_partner?.longitude ?? null,
                restaurant_name: cached.restaurant_name || "Campus Restaurant",
                restaurant_cuisine: cached.restaurant_cuisine || "Campus Dining",
                delivery_partner_name: cached.delivery_partner?.name || "Delivery Partner",
                delivery_partner_phone: cached.delivery_partner?.phone || "",
                delivery_partner_vehicle: cached.delivery_partner?.vehicle || "",
                customer_name: cached.customer_name || "Student",
                customer_address: cached.address || "",
              };
              setLocation(fallbackLoc);
              setError("");
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error("Failed to parse cached order in useTrackOrder", e);
          }
        }
      }
      setLoading(false);
      setError("Invalid order ID.");
      return;
    }

    try {
      const data = await getDeliveryLocation(orderId);
      setLocation(data);
      setError("");
      setLastUpdated(new Date());

      if (
        data.status === "Picked Up" ||
        data.status === "Out for Delivery"
      ) {
        try {
          const otp = await getOrderOTP(orderId);
          setOrderOtp(otp);
        } catch (otpError) {
          console.error("Unable to load delivery OTP:", otpError);
        }
      } else {
        setOrderOtp(null);
      }
    } catch (err) {
      console.error(err);

      // Local storage fallback on fetch failure
      if (typeof window !== "undefined") {
        const rawCached = localStorage.getItem("cb_last_order");
        if (rawCached && rawCached !== "undefined" && rawCached !== "null") {
          try {
            const cached = JSON.parse(rawCached);
            if (cached) {
              const fallbackLoc: TrackingLocation = {
                status: cached.status || "Accepted",
                restaurant_latitude: cached.restaurant_latitude || 18.52043,
                restaurant_longitude: cached.restaurant_longitude || 73.856743,
                customer_latitude: cached.latitude || 18.52143,
                customer_longitude: cached.longitude || 73.857743,
                partner_latitude: cached.delivery_partner?.latitude ?? null,
                partner_longitude: cached.delivery_partner?.longitude ?? null,
                restaurant_name: cached.restaurant_name || "Campus Restaurant",
                restaurant_cuisine: cached.restaurant_cuisine || "Campus Dining",
                delivery_partner_name: cached.delivery_partner?.name || "Delivery Partner",
                delivery_partner_phone: cached.delivery_partner?.phone || "",
                delivery_partner_vehicle: cached.delivery_partner?.vehicle || "",
                customer_name: cached.customer_name || "Student",
                customer_address: cached.address || "",
              };
              setLocation(fallbackLoc);
              setError("");
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error("Failed to parse cached order in track error fallback", e);
          }
        }
      }

      if (err instanceof AuthHttpError && err.status === 401) {
        setError("Please log in to view live tracking.");
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch tracking location."
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const isTrackingActive =
    !location || !isTerminalStatus(location.status);

  usePolling(loadLocation, 5000, {
    enabled: Boolean(orderId) && orderId !== "undefined" && orderId !== "last" && isTrackingActive,
    runImmediately: true,
  });

  const statusConfig = useMemo(
    () => getStatusConfig(location?.status ?? ""),
    [location?.status]
  );

  const partnerHasLocation = useMemo(
    () =>
      hasValidCoordinates(
        location?.partner_latitude,
        location?.partner_longitude
      ),
    [
      location?.partner_latitude,
      location?.partner_longitude,
    ]
  );

  const showOtp =
    !orderOtp?.verified &&
    (location?.status === "Picked Up" ||
      location?.status === "Out for Delivery") &&
    orderOtp?.otp;

  const restaurantName =
    location?.restaurant_name ?? "Campus Restaurant";
  const restaurantCuisine =
    location?.restaurant_cuisine ?? "Campus Dining";
  const partnerName =
    location?.delivery_partner_name ?? "Delivery Partner";
  const customerName =
    location?.customer_name ?? "Customer";

  return {
    orderId,
    location,
    loading,
    error,
    orderOtp,
    lastUpdated,
    statusConfig,
    partnerHasLocation,
    showOtp,
    restaurantName,
    restaurantCuisine,
    partnerName,
    customerName,
    loadLocation,
    setError,
    setLoading,
  };
}
