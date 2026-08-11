"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import LiveTrackingMap from "@/components/maps/LiveTrackingMap";
import { getDeliveryLocation } from "@/services/orderService";
import { AuthHttpError } from "@/services/authFetch";

type TrackingLocation = {
  customer_latitude: number;
  customer_longitude: number;

  partner_latitude: number;
  partner_longitude: number;

  restaurant_latitude: number;
  restaurant_longitude: number;

  status: string;
};

export default function TrackOrderPage() {
  const params = useParams();

  const orderId = params.id as string;

  const [location, setLocation] =
    useState<TrackingLocation | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  async function loadLocation() {
    try {
      const data = await getDeliveryLocation(orderId);
      setLocation(data);
      setError("");
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) {
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch tracking location"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!orderId) return;

    loadLocation();

    const interval = setInterval(() => {
      loadLocation();
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-2xl font-bold">
        Loading Live Tracking...
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex h-screen items-center justify-center text-xl">
        Unable to load tracking information.
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-8">

      <h1 className="mb-8 text-4xl font-bold">
        📍 Live Order Tracking
      </h1>

      <div className="rounded-3xl bg-white p-8 shadow">

        <div className="mb-8 grid gap-6 md:grid-cols-3">

          <div className="rounded-2xl bg-gray-50 p-6">

            <h2 className="mb-4 text-2xl font-bold">
              🍽 Restaurant
            </h2>

            <p>
              <strong>Latitude:</strong>{" "}
              {location.restaurant_latitude}
            </p>

            <p>
              <strong>Longitude:</strong>{" "}
              {location.restaurant_longitude}
            </p>

          </div>

          <div className="rounded-2xl bg-gray-50 p-6">

            <h2 className="mb-4 text-2xl font-bold">
              🛵 Delivery Partner
            </h2>

            <p>
                <strong>Latitude:</strong>{" "}
                {location.partner_latitude ?? "Waiting for location..."}
              </p>

              <p>
                <strong>Longitude:</strong>{" "}
                {location.partner_longitude ?? "Waiting for location..."}
              </p>

            <p className="mt-3 font-semibold text-green-600">
              Status: {location.status}
            </p>

          </div>

          <div className="rounded-2xl bg-gray-50 p-6">

            <h2 className="mb-4 text-2xl font-bold">
              🏠 Customer
            </h2>

            <p>
              <strong>Latitude:</strong>{" "}
              {location.customer_latitude}
            </p>

            <p>
              <strong>Longitude:</strong>{" "}
              {location.customer_longitude}
            </p>

          </div>

        </div>

        <LiveTrackingMap
          partnerLat={location.partner_latitude ?? 0}
          partnerLng={location.partner_longitude ?? 0}
          customerLat={location.customer_latitude ?? 0}
          customerLng={location.customer_longitude ?? 0}
          restaurantLat={location.restaurant_latitude ?? 0}
          restaurantLng={location.restaurant_longitude ?? 0}
        />

      </div>

    </main>
  );
}