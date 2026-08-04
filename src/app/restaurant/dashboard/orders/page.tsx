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
  }, []);

  async function fetchOrders() {
    try {
      const owner = JSON.parse(
        localStorage.getItem("restaurantOwner") || "{}"
      );

      const email = owner.email || "owner@test.com";

      const res = await fetch(
        `http://127.0.0.1:8000/orders/restaurant/${email}`
      );

      const data = await res.json();

      setOrders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

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

    fetchOrders();
  }

  if (loading) {
    return <h2 className="text-2xl">Loading...</h2>;
  }

  return (
    <main>

      <h1 className="mb-8 text-4xl font-bold">
        Restaurant Orders
      </h1>

      {orders.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center shadow">
          <h2 className="text-2xl font-semibold">
            No Orders Yet
          </h2>

          <p className="mt-2 text-gray-500">
            Orders from customers will appear here.
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
                    {order.customer_name}
                  </h2>

                  <p>{order.phone}</p>

                  <p className="text-gray-500">
                    {order.address}
                  </p>

                </div>

                <div className="text-right">

                  <p className="text-lg font-bold text-orange-600">
                    ₹{order.total}
                  </p>

                  <p className="font-semibold">
                    {order.payment_method}
                  </p>

                  <p className="mt-2 rounded bg-orange-100 px-3 py-1">
                    {order.status}
                  </p>

                </div>

              </div>

              <hr className="my-5" />

              <h3 className="mb-3 font-bold">
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

              <div className="mt-6 flex gap-3 flex-wrap">

                <button
                  onClick={() =>
                    updateStatus(order._id, "Accepted")
                  }
                  className="rounded-lg bg-green-600 px-4 py-2 text-white"
                >
                  Accept
                </button>

                <button
                  onClick={() =>
                    updateStatus(order._id, "Preparing")
                  }
                  className="rounded-lg bg-yellow-600 px-4 py-2 text-white"
                >
                  Preparing
                </button>

                <button
                  onClick={() =>
                    updateStatus(order._id, "Out for Delivery")
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white"
                >
                  Out for Delivery
                </button>

                <button
                  onClick={() =>
                    updateStatus(order._id, "Delivered")
                  }
                  className="rounded-lg bg-gray-700 px-4 py-2 text-white"
                >
                  Delivered
                </button>

                <button
                  onClick={() =>
                    updateStatus(order._id, "Rejected")
                  }
                  className="rounded-lg bg-red-600 px-4 py-2 text-white"
                >
                  Reject
                </button>

              </div>

            </div>
          ))}

        </div>
      )}

    </main>
  );
}