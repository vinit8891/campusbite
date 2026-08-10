"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type OrderItem = {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  _id: string;
  restaurant_email: string;
  customer_name: string;
  phone: string;
  address: string;
  payment_method: string;
  total: number;
  status: string;
  items: OrderItem[];

  delivery_partner?: {
    name?: string;
    phone?: string;
    vehicle?: string;
    latitude?: number | null;
    longitude?: number | null;
  };

  latitude?: number | null;
  longitude?: number | null;

  restaurant_latitude?: number | null;
  restaurant_longitude?: number | null;

  delivery_otp?: number;
  otp_verified?: boolean;

  created_at?: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

const statuses = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready for Pickup",
  "Assigned",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
];

export default function OrderDetailsPage() {
  const params = useParams();

  const orderId = params.id as string;

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

    async function loadOrder() {
      try {
        const res = await fetch(
          `${API_URL}/orders/${orderId}`,
          {
            cache: "no-store",
          }
        );
    
        if (res.status === 404) {
          setError("Order not found.");
          return;
        }
    
        if (!res.ok) {
          throw new Error(
            "Failed to load order"
          );
        }
    
        const data = await res.json();
    
        setOrder(data);
      } catch (err) {
        console.error(err);
    
        setError(
          "Unable to load order details."
        );
      } finally {
        setLoading(false);
      }
    }

  useEffect(() => {
    loadOrder();

    // Refresh order status every 5 seconds
    const interval = setInterval(
      loadOrder,
      5000
    );

    return () =>
      clearInterval(interval);
  }, [orderId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-5xl rounded-2xl border bg-white p-10 text-center">
          Loading order...
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-5xl rounded-2xl border bg-white p-10 text-center">

          <div className="text-5xl">
            😕
          </div>

          <h1 className="mt-4 text-2xl font-bold">
            Order Not Found
          </h1>

          <p className="mt-2 text-gray-500">
            {error ||
              "We couldn't find this order."}
          </p>

          <Link
            href="/orders"
            className="mt-6 inline-block rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
          >
            Back to My Orders
          </Link>

        </div>
      </main>
    );
  }

  const currentIndex =
    statuses.indexOf(order.status);

  const isDelivered =
    order.status === "Delivered";

  const isCancelled =
    order.status === "Cancelled";

  return (
    <main className="min-h-screen bg-gray-50">

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Back */}

        <Link
          href="/orders"
          className="text-sm font-medium text-gray-500 hover:text-orange-600"
        >
          ← Back to My Orders
        </Link>

        {/* Header */}

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-sm text-gray-500">
              Order ID
            </p>

            <h1 className="text-2xl font-extrabold text-gray-900">
              #{order._id.slice(-8)}
            </h1>

            {order.created_at && (
              <p className="mt-1 text-sm text-gray-500">
                {new Date(
                  order.created_at
                ).toLocaleString()}
              </p>
            )}

          </div>

          <span
            className={`w-fit rounded-full px-5 py-2 text-sm font-bold ${
              isDelivered
                ? "bg-green-100 text-green-700"
                : isCancelled
                ? "bg-red-100 text-red-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {order.status}
          </span>

        </div>

        {/* Status Timeline */}

        {!isCancelled && (
          <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">

            <h2 className="text-xl font-bold">
              Order Status
            </h2>

            <div className="mt-8 space-y-6">

              {statuses.map(
                (status, index) => {

                  const completed =
                    currentIndex >= index;

                  const current =
                    order.status === status;

                  return (
                    <div
                      key={status}
                      className="flex items-start gap-4"
                    >

                      <div className="flex flex-col items-center">

                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                            completed
                              ? "bg-orange-500 text-white"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {completed
                            ? "✓"
                            : index + 1}
                        </div>

                        {index <
                          statuses.length -
                            1 && (
                          <div
                            className={`mt-1 h-8 w-0.5 ${
                              currentIndex >
                              index
                                ? "bg-orange-500"
                                : "bg-gray-200"
                            }`}
                          />
                        )}

                      </div>

                      <div>

                        <p
                          className={`font-semibold ${
                            current
                              ? "text-orange-600"
                              : completed
                              ? "text-gray-900"
                              : "text-gray-400"
                          }`}
                        >
                          {status}
                        </p>

                        {current && (
                          <p className="mt-1 text-sm text-gray-500">
                            Current order status
                          </p>
                        )}

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </section>
        )}

        {/* Delivery Partner */}

        {order.delivery_partner && (
          <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">

            <h2 className="text-xl font-bold">
              Delivery Partner
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">
                  Name
                </p>

                <p className="mt-1 font-semibold">
                  {order.delivery_partner.name ||
                    "Delivery Partner"}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">
                  Phone
                </p>

                <p className="mt-1 font-semibold">
                  {order.delivery_partner.phone ||
                    "Not available"}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">
                  Vehicle
                </p>

                <p className="mt-1 font-semibold">
                  {order.delivery_partner.vehicle ||
                    "Not specified"}
                </p>
              </div>

            </div>

          </section>
        )}

        {/* Live Location */}

        {order.status ===
          "Out for Delivery" &&
          order.delivery_partner && (
            <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  📍
                </div>

                <div>

                  <h2 className="text-xl font-bold">
                    Live Delivery Location
                  </h2>

                  <p className="text-sm text-gray-500">
                    Your delivery partner's
                    latest location.
                  </p>

                </div>

              </div>

              {order.delivery_partner
                .latitude !== null &&
              order.delivery_partner
                .latitude !== undefined &&
              order.delivery_partner
                .longitude !== null &&
              order.delivery_partner
                .longitude !== undefined ? (

                <div className="mt-5 rounded-2xl bg-green-50 p-5">

                  <p className="font-semibold text-green-800">
                    Delivery partner location
                    available
                  </p>

                  <p className="mt-2 text-sm text-green-700">
                    Latitude:{" "}
                    {
                      order.delivery_partner
                        .latitude
                    }
                  </p>

                  <p className="text-sm text-green-700">
                    Longitude:{" "}
                    {
                      order.delivery_partner
                        .longitude
                    }
                  </p>

                  <a
                    href={`https://www.google.com/maps?q=${order.delivery_partner.latitude},${order.delivery_partner.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Open Live Location
                  </a>

                </div>

              ) : (

                <div className="mt-5 rounded-2xl bg-orange-50 p-5">

                  <p className="font-semibold text-orange-800">
                    Waiting for delivery
                    partner location...
                  </p>

                  <p className="mt-1 text-sm text-orange-700">
                    This page automatically
                    refreshes every 5 seconds.
                  </p>

                </div>

              )}

            </section>
          )}

        {/* OTP */}

        {order.status ===
          "Out for Delivery" && (
          <section className="mt-8 rounded-3xl border border-orange-200 bg-orange-50 p-6">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-2xl">
                🔐
              </div>

              <div>

                <h2 className="text-xl font-bold text-orange-900">
                  Delivery OTP
                </h2>

                <p className="mt-1 text-sm text-orange-800">
                  Give the delivery partner
                  your OTP when your food
                  arrives.
                </p>

                {order.otp_verified ? (
                  <p className="mt-4 font-semibold text-green-700">
                    ✓ OTP Verified
                  </p>
                ) : (
                  <p className="mt-4 font-semibold text-orange-700">
                    OTP verification pending
                  </p>
                )}

              </div>

            </div>

          </section>
        )}

        {/* Order Items */}

        <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold">
            Ordered Items
          </h2>

          <div className="mt-5 space-y-3">

            {order.items.map(
              (item) => (

                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 p-4"
                >

                  <div>

                    <p className="font-semibold">
                      {item.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      ₹{item.price} ×{" "}
                      {item.quantity}
                    </p>

                  </div>

                  <p className="font-bold">
                    ₹
                    {item.price *
                      item.quantity}
                  </p>

                </div>

              )
            )}

          </div>

        </section>

        {/* Delivery Information */}

        <section className="mt-8 grid gap-8 lg:grid-cols-2">

          <div className="rounded-3xl border bg-white p-6 shadow-sm">

            <h2 className="text-xl font-bold">
              Delivery Address
            </h2>

            <div className="mt-4 text-sm text-gray-600">

              <p className="font-semibold text-gray-900">
                {order.customer_name}
              </p>

              <p className="mt-1">
                {order.phone}
              </p>

              <p className="mt-3">
                {order.address}
              </p>

            </div>

          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">

            <h2 className="text-xl font-bold">
              Payment Summary
            </h2>

            <div className="mt-4 space-y-3">

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  Payment Method
                </span>

                <span className="font-medium">
                  {order.payment_method}
                </span>
              </div>

              <div className="border-t pt-3">

                <div className="flex justify-between text-xl font-bold">

                  <span>Total</span>

                  <span className="text-orange-600">
                    ₹{order.total}
                  </span>

                </div>

              </div>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}