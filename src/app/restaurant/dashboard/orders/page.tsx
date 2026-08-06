"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  _id: string;
  customer_name: string;
  phone: string;
  address: string;
  payment_method: string;
  total: number;
  status: string;
  items: OrderItem[];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  async function fetchOrders() {
    try {
      const owner = JSON.parse(
        localStorage.getItem("restaurantOwner") || "{}"
      );
  
      const email = owner.email || "owner@test.com";
  
      const res = await fetch(
        `${API_URL}/orders/restaurant/${email}`,
        {
          cache: "no-store",
        }
      );
  
      if (!res.ok) {
        throw new Error(await res.text());
      }
  
      const data = await res.json();
  
      setOrders(data);
    } catch (err) {
      console.error(
        "Restaurant Orders Error:",
        err
      );
    } finally {
      setLoading(false);
    }
  }
  async function updateStatus(
    id: string,
    status: string
  ) {
    try {
      console.log("Updating Order:", id, status);
  
      const res = await fetch(
        `${API_URL}/orders/${id}/${encodeURIComponent(status)}`,
        {
          method: "PUT",
        }
      );
  
      const data = await res.json();
  
      console.log("Update Status:", data);
  
      if (!res.ok) {
        throw new Error(
          data.detail || "Failed to update status"
        );
      }
  
      await fetchOrders();
    } catch (error) {
      console.error("Update Status Error:", error);
    }
  }

  function badgeColor(status: string) {
    switch (status) {
      case "Accepted":
        return "bg-blue-100 text-blue-700";

      case "Preparing":
        return "bg-yellow-100 text-yellow-700";

      case "Ready for Pickup":
        return "bg-indigo-100 text-indigo-700";

      case "Out for Delivery":
        return "bg-purple-100 text-purple-700";

      case "Delivered":
        return "bg-green-100 text-green-700";

      case "Rejected":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  if (loading) {
    return (
      <h2 className="text-2xl font-semibold">
        Loading Orders...
      </h2>
    );
  }

  return (
    <main>

      <h1 className="mb-8 text-4xl font-bold">
        Restaurant Orders
      </h1>

      {orders.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center shadow">

          <h2 className="text-2xl font-bold">
            No Orders Yet
          </h2>

          <p className="mt-3 text-gray-500">
            Customer orders will appear here.
          </p>

        </div>
      ) : (
        <div className="space-y-6">

          {orders.map((order) => (
            <div
              key={order._id}
              className="rounded-2xl border bg-white p-6 shadow"
            >

              <div className="flex flex-wrap items-center justify-between gap-4">

                <div>

                  <h2 className="text-xl font-bold">
                    {order.customer_name}
                  </h2>

                  <p>{order.phone}</p>

                  <p className="text-gray-500">
                    {order.address}
                  </p>

                </div>

                <div className="text-right">

                  <p className="text-2xl font-bold text-orange-600">
                    ₹{order.total}
                  </p>

                  <p>{order.payment_method}</p>

                  <span
                    className={`mt-2 inline-block rounded-full px-4 py-2 text-sm font-semibold ${badgeColor(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>

                </div>

              </div>

              <hr className="my-6" />

              <h3 className="mb-3 text-lg font-bold">
                Ordered Items
              </h3>

              <div className="space-y-2">

                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between border-b pb-2"
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
                    disabled={order.status !== "Pending"}
                    onClick={() =>
                      updateStatus(order._id, "Accepted")
                    }
                    className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-40"
                  >
                    ✅ Accept
                  </button>

                  <button
                    disabled={order.status !== "Accepted"}
                    onClick={() =>
                      updateStatus(order._id, "Preparing")
                    }
                    className="rounded-lg bg-yellow-500 px-4 py-2 text-white disabled:opacity-40"
                  >
                    🍳 Preparing
                  </button>

                  <button
                    disabled={order.status !== "Preparing"}
                    onClick={() =>
                      updateStatus(order._id, "Ready for Pickup")
                    }
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-40"
                  >
                    📦 Ready for Pickup
                  </button>

                  <button
                    disabled={
                      order.status === "Delivered" ||
                      order.status === "Cancelled"
                    }
                    onClick={() =>
                      updateStatus(order._id, "Cancelled")
                    }
                    className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-40"
                  >
                    ❌ Reject
                  </button>

                </div>

      

            </div>
          ))}

        </div>
      )}

    </main>
  );
}