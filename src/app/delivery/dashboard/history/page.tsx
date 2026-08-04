"use client";

import { useEffect, useState } from "react";

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
  total: number;
  status: string;
  payment_method: string;
  items: OrderItem[];
};

export default function DeliveryHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadHistory() {
    try {
      const res = await fetch(
        "http://127.0.0.1:8000/orders/delivery/history"
      );

      const data = await res.json();

      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-xl">
        Loading Delivery History...
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-8">

      <h1 className="mb-8 text-4xl font-bold">
        📦 Delivery History
      </h1>

      {orders.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center shadow">
          No Delivered Orders Yet
        </div>
      ) : (
        <div className="space-y-6">

          {orders.map((order) => (

            <div
              key={order._id}
              className="rounded-2xl border bg-white p-6 shadow"
            >

              <div className="flex flex-wrap items-center justify-between">

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

                  <p className="font-semibold">
                    {order.payment_method}
                  </p>

                  <span className="mt-2 inline-block rounded-full bg-green-100 px-4 py-1 text-green-700">
                    ✅ Delivered
                  </span>

                </div>

              </div>

              <hr className="my-5" />

              <h3 className="mb-3 font-semibold">
                Ordered Items
              </h3>

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

              <div className="mt-6 flex items-center justify-between border-t pt-4">

                <span className="font-semibold text-gray-500">
                  Delivery Earnings
                </span>

                <span className="text-xl font-bold text-green-600">
                  ₹50
                </span>

              </div>

            </div>

          ))}

        </div>
      )}

    </main>
  );
}