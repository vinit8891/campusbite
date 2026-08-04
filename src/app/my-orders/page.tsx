"use client";

import { useEffect, useState } from "react";
import OrderNotification from "@/components/notifications/OrderNotification";

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
  restaurant_email: string;
  total: number;
  status: string;
  items: OrderItem[];
};

export default function MyOrdersPage() {
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
      const checkout = JSON.parse(
        localStorage.getItem("checkout") || "{}"
      );

      const phone = checkout.phone;

      if (!phone) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const res = await fetch(
        `http://127.0.0.1:8000/orders/customer/${phone}`
      );

      const data = await res.json();

      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
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

  function statusLabel(status: string) {
    switch (status) {
      case "Accepted":
        return "🎉 Accepted";

      case "Preparing":
        return "🍳 Preparing";

      case "Ready for Pickup":
        return "📦 Ready for Pickup";

      case "Out for Delivery":
        return "🛵 Out for Delivery";

      case "Delivered":
        return "✅ Delivered";

      case "Rejected":
        return "❌ Rejected";

      default:
        return status;
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-xl">
        Loading Orders...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-3xl font-bold">
          No Orders Yet
        </h1>

        <p className="mt-4 text-gray-500">
          Place your first order from CampusBite 🍔
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-8 text-4xl font-bold">
        My Orders
      </h1>

      <div className="space-y-8">
        {orders.map((order) => (
          <div
            key={order._id}
            className="rounded-3xl border bg-white p-6 shadow"
          >
            <OrderNotification status={order.status} />

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  🍽 {order.restaurant_email}
                </h2>

                <p className="text-gray-500">
                  {order.customer_name}
                </p>
              </div>

              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${badgeColor(
                  order.status
                )}`}
              >
                {statusLabel(order.status)}
              </span>
            </div>

            <div className="space-y-3">
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

            <hr className="my-5" />

            <div className="grid gap-3 md:grid-cols-2">
              <p>
                <strong>📍 Address:</strong>{" "}
                {order.address}
              </p>

              <p>
                <strong>📞 Phone:</strong>{" "}
                {order.phone}
              </p>

              <p>
                <strong>💳 Payment:</strong>{" "}
                {order.payment_method}
              </p>

              <p className="text-xl font-bold text-orange-600">
                Total ₹{order.total}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}