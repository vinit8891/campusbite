"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

export default function TrackOrderPage() {
  const params = useParams();

  const orderId = params.id as string;

  const [location, setLocation] = useState<any>(null);

  async function loadLocation() {
    try {
      const res = await fetch(
        `${API}/orders/delivery/location/${orderId}`,
        {
          cache: "no-store",
        }
      );

      if (!res.ok) return;

      const data = await res.json();

      setLocation(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadLocation();

    const interval = setInterval(loadLocation, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!location) {
    return (
      <div className="flex h-screen items-center justify-center text-2xl font-bold">
        Loading Live Tracking...
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-8">

      <h1 className="mb-8 text-4xl font-bold">
        📍 Live Order Tracking
      </h1>

      <div className="rounded-3xl bg-white p-8 shadow">

        <div className="grid gap-6 md:grid-cols-2">

          <div>

            <h2 className="mb-4 text-2xl font-bold">
              Customer
            </h2>

            <p>
              Latitude:
              {" "}
              {location.customer_latitude}
            </p>

            <p>
              Longitude:
              {" "}
              {location.customer_longitude}
            </p>

          </div>

          <div>

            <h2 className="mb-4 text-2xl font-bold">
              Delivery Partner
            </h2>

            <p>
              Latitude:
              {" "}
              {location.partner_latitude}
            </p>

            <p>
              Longitude:
              {" "}
              {location.partner_longitude}
            </p>

          </div>

        </div>

        <div className="mt-10">

          <iframe
            width="100%"
            height="500"
            loading="lazy"
            className="rounded-2xl"
            src={`https://www.google.com/maps?q=${location.partner_latitude},${location.partner_longitude}&z=16&output=embed`}
          />

        </div>

      </div>

    </main>
  );
}