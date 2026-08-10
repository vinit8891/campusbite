"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCustomerOrders } from "@/services/orderService";

type OrderItem = {
  id: string;
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
  created_at?: string;
  delivery_for?: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrders() {
      try {
        // For now we use the phone saved during checkout.
        const checkout = localStorage.getItem("checkout");

        if (!checkout) {
          setOrders([]);
          setLoading(false);
          return;
        }

        const data = JSON.parse(checkout);
        const phone = data.phone;

        if (!phone) {
          setOrders([]);
          setLoading(false);
          return;
        }

        const result = await getCustomerOrders(phone);

        setOrders(result);
      } catch (err) {
        console.error(err);
        setError("Unable to load your orders.");
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  function getStatusStyle(status: string) {
    switch (status) {
      case "Delivered":
        return "bg-green-100 text-green-700";

      case "Cancelled":
        return "bg-red-100 text-red-700";

      case "Out for Delivery":
      case "Picked Up":
        return "bg-blue-100 text-blue-700";

      case "Ready for Pickup":
      case "Assigned":
        return "bg-purple-100 text-purple-700";

      case "Preparing":
        return "bg-orange-100 text-orange-700";

      case "Accepted":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900">
          My Orders
        </h1>

        <div className="mt-8 rounded-2xl border bg-white p-8 text-center">
          Loading your orders...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Header */}

        <div className="mb-8">
          <Link
            href="/restaurants"
            className="text-sm font-medium text-gray-500 hover:text-orange-600"
          >
            ← Continue Shopping
          </Link>

          <h1 className="mt-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
            My Orders
          </h1>

          <p className="mt-2 text-gray-500">
            Track your current and previous orders.
          </p>
        </div>

        {/* Error */}

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Empty */}

        {!error && orders.length === 0 && (
          <div className="rounded-3xl border bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-4xl">
              🛒
            </div>

            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              No orders yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-gray-500">
              You haven't placed any orders yet.
              Start exploring restaurants and order
              your favorite food.
            </p>

            <Link
              href="/restaurants"
              className="mt-6 inline-flex rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600"
            >
              Browse Restaurants
            </Link>

          </div>
        )}

        {/* Orders */}

        <div className="space-y-6">

          {orders.map((order) => (

            <div
              key={order._id}
              className="overflow-hidden rounded-2xl border bg-white shadow-sm"
            >

              {/* Order Header */}

              <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-sm text-gray-500">
                    Order ID
                  </p>

                  <p className="font-semibold text-gray-900">
                    #{order._id.slice(-8)}
                  </p>

                  {order.created_at && (
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(
                        order.created_at
                      ).toLocaleString()}
                    </p>
                  )}
                </div>

                <span
                  className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${getStatusStyle(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>

              </div>

              {/* Order Content */}

              <div className="grid gap-6 p-5 lg:grid-cols-3">

                {/* Items */}

                <div className="lg:col-span-2">

                  <h3 className="mb-4 font-bold text-gray-900">
                    Ordered Items
                  </h3>

                  <div className="space-y-3">

                    {order.items.map((item) => (

                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl bg-gray-50 p-3"
                      >

                        <div>
                          <p className="font-medium text-gray-900">
                            {item.name}
                          </p>

                          <p className="text-sm text-gray-500">
                            ₹{item.price} × {item.quantity}
                          </p>
                        </div>

                        <p className="font-semibold">
                          ₹
                          {item.price *
                            item.quantity}
                        </p>

                      </div>

                    ))}

                  </div>

                </div>

                {/* Summary */}

                <div className="rounded-2xl bg-gray-50 p-5">

                  <h3 className="font-bold text-gray-900">
                    Order Summary
                  </h3>

                  <div className="mt-4 space-y-3 text-sm">

                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Payment
                      </span>

                      <span className="font-medium">
                        {order.payment_method}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Items
                      </span>

                      <span>
                        {order.items.reduce(
                          (sum, item) =>
                            sum + item.quantity,
                          0
                        )}
                      </span>
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>

                        <span className="text-orange-600">
                          ₹{order.total}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Delivery */}

                  <div className="mt-5 border-t pt-5">

                    <p className="text-sm font-semibold text-gray-700">
                      Delivering to
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {order.customer_name}
                    </p>

                    <p className="text-sm text-gray-500">
                      {order.phone}
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      {order.address}
                    </p>

                  </div>

                  {/* Track */}

                  {order.status !== "Delivered" &&
                    order.status !== "Cancelled" && (
                      <Link
                        href={`/orders/${order._id}`}
                        className="mt-5 block rounded-xl bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-orange-600"
                      >
                        Track Order
                      </Link>
                    )}

                </div>

              </div>

            </div>

          ))}

        </div>

      </div>
    </main>
  );
}