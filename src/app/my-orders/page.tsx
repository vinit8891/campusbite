"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

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
  items: OrderItem[];
};

export default function MyOrdersPage() {
  const router = useRouter();

  const { isLoggedIn, token } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    fetchOrders();
  }, [isLoggedIn]);

  async function fetchOrders() {
    try {
      const res = await fetch(
        "http://127.0.0.1:8000/orders/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      setOrders(data);

    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  if (!isLoggedIn) return null;

  if (loading) {
    return (
      <main className="p-10">
        Loading Orders...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">

      <h1 className="mb-10 text-4xl font-bold">
        My Orders
      </h1>

      {orders.length === 0 ? (
        <div className="rounded-xl border p-10 text-center">
          No Orders Yet 🍔
        </div>
      ) : (
        <div className="space-y-8">

          {orders.map((order) => (

            <div
              key={order._id}
              className="rounded-2xl border bg-white p-6 shadow-sm"
            >

              <div className="mb-5 flex items-center justify-between">

                <div>

                  <h2 className="text-xl font-bold">
                    Order #{order._id.slice(-6)}
                  </h2>

                  <p className="text-gray-500">
                    {order.customer_name}
                  </p>

                </div>

                <div className="text-right">

                  <p className="font-bold text-orange-600">
                    ₹{order.total}
                  </p>

                  <p className="text-sm text-green-600">
                    Preparing 🍽️
                  </p>

                </div>

              </div>

              <hr className="mb-5" />

              <div className="space-y-2">

                {order.items.map((item) => (

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

            </div>

          ))}

        </div>
      )}

    </main>
  );
}