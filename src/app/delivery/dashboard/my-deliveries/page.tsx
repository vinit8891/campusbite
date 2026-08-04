"use client";

import { useEffect, useState } from "react";

import {
  getMyDeliveries,
} from "@/services/deliveryService";

export default function MyDeliveriesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    try {
      const partner = JSON.parse(
        localStorage.getItem("deliveryPartner") || "{}"
      );

      const phone = partner.phone;

      if (!phone) {
        setOrders([]);
        return;
      }

      const data = await getMyDeliveries(phone);

      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();

    const interval = setInterval(loadOrders, 5000);

    return () => clearInterval(interval);
  }, []);

  async function updateStatus(
    id: string,
    status: string
  ) {
    await fetch(
      `http://127.0.0.1:8000/orders/${id}/${status}`,
      {
        method: "PUT",
      }
    );

    loadOrders();
  }

  if (loading) {
    return (
      <div className="p-8">
        Loading...
      </div>
    );
  }

  return (
    <main className="p-8">

      <h1 className="mb-8 text-4xl font-bold">
        My Deliveries
      </h1>

      {orders.length === 0 ? (

        <div className="rounded-xl border bg-white p-10 text-center shadow">
          <h2 className="text-2xl font-semibold">
            No Active Deliveries
          </h2>

          <p className="mt-2 text-gray-500">
            Accepted deliveries will appear here.
          </p>
        </div>

      ) : (

        <div className="space-y-6">

          {orders.map((order) => (

            <div
              key={order._id}
              className="rounded-2xl border bg-white p-6 shadow"
            >

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="text-xl font-bold">
                    🍽 {order.restaurant_email}
                  </h2>

                  <p>{order.customer_name}</p>

                  <p>{order.phone}</p>

                  <p className="text-gray-500">
                    {order.address}
                  </p>

                </div>

                <div className="text-right">

                  <p className="text-xl font-bold text-orange-600">
                    ₹{order.total}
                  </p>

                  <span className="rounded bg-blue-100 px-3 py-1">
                    {order.status}
                  </span>

                </div>

              </div>

              <hr className="my-5" />

              <h3 className="mb-3 font-semibold">
                Ordered Items
              </h3>

              <div className="space-y-2">

                {order.items.map((item: any) => (

                  <div
                    key={item.id}
                    className="flex justify-between"
                  >
                    <span>
                      {item.name} × {item.quantity}
                    </span>

                    <span>
                      ₹{item.price * item.quantity}
                    </span>

                  </div>

                ))}

              </div>

              <div className="mt-6 flex flex-wrap gap-3">

                <button
                  onClick={() =>
                    updateStatus(
                      order._id,
                      "Picked Up"
                    )
                  }
                  className="rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
                >
                  📦 Picked Up
                </button>

                <button
                  onClick={() =>
                    updateStatus(
                      order._id,
                      "Out for Delivery"
                    )
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  🛵 Out for Delivery
                </button>

                <button
                  onClick={() =>
                    updateStatus(
                      order._id,
                      "Delivered"
                    )
                  }
                  className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                >
                  ✅ Delivered
                </button>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    order.address
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
                >
                  🗺 Navigate
                </a>

              </div>

            </div>

          ))}

        </div>

      )}

    </main>
  );
}