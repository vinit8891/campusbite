"use client";

import { useEffect, useState } from "react";

import {
  acceptDelivery,
  getAvailableOrders,
} from "@/services/deliveryService";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import { AuthHttpError } from "@/services/authFetch";

type Order = {
  _id: string;
  customer_name: string;
  phone: string;
  address: string;
  total: number;
  status: string;
  items: {
    id: string | number;
    name: string;
    price: number;
    quantity: number;
  }[];
};

export default function DeliveryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  const [partner, setPartner] = useState({
    name: "",
    phone: "",
    vehicle: "",
  });

  useEffect(() => {
    const session = getDeliveryPartnerSession();
    if (session) {
      setPartner({
        name: session.name || "",
        phone: session.phone || "",
        vehicle: session.vehicle || "",
      });
    }
  }, []);

  async function loadAvailableOrders() {
    try {
      const data = await getAvailableOrders();
      setOrders(data.items);
    } catch (error) {
      console.error(
        "Available Orders Error:",
        error
      );
      if (error instanceof AuthHttpError && error.status === 401) {
        return;
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAvailableOrders();

    const interval = setInterval(
      loadAvailableOrders,
      5000
    );

    return () =>
      clearInterval(interval);
  }, []);

  async function acceptOrder(orderId: string) {
    const session = getDeliveryPartnerSession();

    const name = session?.name || partner.name;
    const phone = session?.phone || partner.phone;
    const vehicle =
      session?.vehicle || partner.vehicle || "Bike";

    if (!name.trim()) {
      alert("Please enter your name.");
      return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      alert(
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    if (!vehicle.trim()) {
      alert("Please enter your vehicle.");
      return;
    }

    try {
      setAccepting(orderId);

      await acceptDelivery(orderId, {
        name,
        phone,
        vehicle,
      });

      alert("Order accepted successfully");
      await loadAvailableOrders();
    } catch (error) {
      console.error(error);
      if (error instanceof AuthHttpError && error.status === 401) {
        return;
      }
      alert(
        error instanceof Error
          ? error.message
          : "Unable to accept order."
      );
    } finally {
      setAccepting(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Header */}

        <div>
          <p className="text-sm font-semibold text-orange-600">
            CAMPUSBITE DELIVERY
          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-gray-900">
            Delivery Partner Dashboard
          </h1>

          <p className="mt-2 text-gray-500">
            Find and accept nearby food delivery
            orders.
          </p>
        </div>

        {/* Partner Information */}

        <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold">
            Your Details
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">

            <input
              className="rounded-xl border px-4 py-3 outline-none focus:border-orange-500"
              placeholder="Your Name"
              value={partner.name}
              onChange={(e) =>
                setPartner((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
            />

            <input
              className="rounded-xl border px-4 py-3 outline-none focus:border-orange-500"
              placeholder="Mobile Number"
              maxLength={10}
              value={partner.phone}
              onChange={(e) =>
                setPartner((prev) => ({
                  ...prev,
                  phone: e.target.value.replace(
                    /\D/g,
                    ""
                  ),
                }))
              }
            />

            <input
              className="rounded-xl border px-4 py-3 outline-none focus:border-orange-500"
              placeholder="Vehicle (e.g. Bike)"
              value={partner.vehicle}
              onChange={(e) =>
                setPartner((prev) => ({
                  ...prev,
                  vehicle: e.target.value,
                }))
              }
            />

          </div>

        </section>

        {/* Available Orders */}

        <section className="mt-8">

          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-2xl font-bold">
                Available Orders
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Orders ready for pickup.
              </p>
            </div>

            <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
              {orders.length} available
            </span>

          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl border bg-white p-10 text-center">
              Loading available orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed bg-white p-12 text-center">

              <div className="text-5xl">
                🚴
              </div>

              <h3 className="mt-4 text-xl font-bold">
                No orders available
              </h3>

              <p className="mt-2 text-gray-500">
                New delivery orders will appear
                here automatically.
              </p>

            </div>
          ) : (
            <div className="mt-6 grid gap-6">

              {orders.map((order) => (

                <div
                  key={order._id}
                  className="rounded-3xl border bg-white p-6 shadow-sm"
                >

                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                    {/* Order Information */}

                    <div className="flex-1">

                      <div className="flex flex-wrap items-center gap-3">

                        <span className="font-bold">
                          Order #
                          {order._id.slice(-8)}
                        </span>

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          Ready for Pickup
                        </span>

                      </div>

                      {/* Customer */}

                      <div className="mt-5">

                        <p className="text-xs font-semibold uppercase text-gray-400">
                          Customer
                        </p>

                        <p className="mt-1 font-semibold">
                          {order.customer_name}
                        </p>

                        <p className="text-sm text-gray-500">
                          {order.phone}
                        </p>

                      </div>

                      {/* Address */}

                      <div className="mt-4">

                        <p className="text-xs font-semibold uppercase text-gray-400">
                          Delivery Address
                        </p>

                        <p className="mt-1 text-sm text-gray-700">
                          📍 {order.address}
                        </p>

                      </div>

                      {/* Items */}

                      <div className="mt-4">

                        <p className="text-xs font-semibold uppercase text-gray-400">
                          Items
                        </p>

                        <div className="mt-2 space-y-1">

                          {order.items.map(
                            (item) => (
                              <p
                                key={item.id}
                                className="text-sm text-gray-700"
                              >
                                {item.name} ×{" "}
                                {item.quantity}
                              </p>
                            )
                          )}

                        </div>

                      </div>

                    </div>

                    {/* Right Side */}

                    <div className="w-full lg:w-56">

                      <div className="rounded-2xl bg-gray-50 p-5">

                        <p className="text-sm text-gray-500">
                          Order Value
                        </p>

                        <p className="mt-1 text-2xl font-extrabold text-gray-900">
                          ₹{order.total}
                        </p>

                        <button
                          onClick={() =>
                            acceptOrder(
                              order._id
                            )
                          }
                          disabled={
                            accepting ===
                            order._id
                          }
                          className="mt-5 w-full rounded-xl bg-orange-500 px-4 py-3 font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {accepting ===
                          order._id
                            ? "Accepting..."
                            : "Accept Order"}
                        </button>

                      </div>

                    </div>

                  </div>

                </div>

              ))}

            </div>
          )}

        </section>

      </div>

    </main>
  );
}