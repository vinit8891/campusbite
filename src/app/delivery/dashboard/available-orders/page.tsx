"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Phone,
  User,
  Clock3,
  Bike,
  IndianRupee,
  Navigation,
} from "lucide-react";

import {
  getAvailableOrders,
  acceptDelivery,
} from "@/services/deliveryService";

export default function AvailableOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    try {
      const data = await getAvailableOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function handleAccept(orderId: string) {
    try {
      await acceptDelivery(orderId, {
        name: "Rahul Sharma",
        phone: "9876543210",
        vehicle: "Bike",
      });

      loadOrders();
    } catch (err) {
      console.error(err);
      alert("Failed to accept order");
    }
  }

  function openNavigation(order: any) {
    if (
      order.latitude == null ||
      order.longitude == null
    ) {
      alert("Customer location not available.");
      return;
    }

    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`,
      "_blank"
    );
  }

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center text-xl font-semibold">
        Loading Orders...
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-8">

      <div className="mb-8">

        <h1 className="text-4xl font-bold">
          Available Orders
        </h1>

        <p className="mt-2 text-gray-500">
          Accept a delivery and start earning.
        </p>

      </div>

      {orders.length === 0 ? (

        <div className="rounded-3xl bg-white p-16 text-center shadow">

          <Bike className="mx-auto mb-5 h-16 w-16 text-orange-500" />

          <h2 className="text-3xl font-bold">
            No Orders Available
          </h2>

          <p className="mt-3 text-gray-500">
            New delivery requests will appear here automatically.
          </p>

        </div>

      ) : (

        <div className="grid gap-8">

          {orders.map((order) => (

            <div
              key={order._id}
              className="rounded-3xl border bg-white p-7 shadow transition hover:-translate-y-1 hover:shadow-xl"
            >

              {/* Header */}

              <div className="flex flex-wrap items-start justify-between gap-4">

                <div>

                  <h2 className="text-2xl font-bold">
                    🍽 {order.restaurant_email}
                  </h2>

                  <div className="mt-3 space-y-2 text-gray-600">

                    <p className="flex items-center gap-2">
                      <User size={18} />
                      {order.customer_name}
                    </p>

                    <p className="flex items-center gap-2">
                      <Phone size={18} />
                      {order.phone}
                    </p>

                    <p className="flex items-center gap-2">
                      <MapPin size={18} />
                      {order.address}
                    </p>

                    <p className="flex items-center gap-2">
                      <Clock3 size={18} />
                      Just Now
                    </p>

                  </div>

                </div>

                <div className="text-right">

                  <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                    {order.payment_method}
                  </div>

                  <div className="mt-5 flex items-center justify-end text-4xl font-bold text-orange-600">
                    <IndianRupee size={30} />
                    {order.total}
                  </div>

                </div>

              </div>

              {/* Items */}

              <div className="mt-8 rounded-2xl bg-gray-50 p-5">

                <h3 className="mb-4 text-lg font-bold">
                  Ordered Items
                </h3>

                <div className="space-y-3">

                  {order.items.map((item: any) => (

                    <div
                      key={item.id}
                      className="flex justify-between"
                    >

                      <span>
                        {item.name} × {item.quantity}
                      </span>

                      <span className="font-semibold">
                        ₹{item.price * item.quantity}
                      </span>

                    </div>

                  ))}

                </div>

              </div>

              {/* Footer */}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-5">

                <div>

                  <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
                    Ready for Pickup
                  </span>

                </div>

                <div className="flex flex-wrap gap-4">

                  <button
                    onClick={() => openNavigation(order)}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-lg font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Navigation size={20} />
                    Navigate
                  </button>

                  <button
                    onClick={() => handleAccept(order._id)}
                    className="rounded-xl bg-green-600 px-8 py-3 text-lg font-semibold text-white transition hover:bg-green-700"
                  >
                    🚴 Accept Delivery
                  </button>

                </div>

              </div>

            </div>

          ))}

        </div>

      )}

    </main>
  );
}