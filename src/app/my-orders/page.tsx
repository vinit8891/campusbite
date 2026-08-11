"use client";

import { useEffect, useState } from "react";
import OrderNotification from "@/components/notifications/OrderNotification";
import LiveDeliveryNotification from "@/components/notifications/LiveDeliveryNotification";
import OrderTimeline from "@/components/orders/OrderTimeline";
import ReviewModal from "@/components/reviews/ReviewModal";
import { getOrderOTP } from "@/services/deliveryService";
import { getMyOrders } from "@/services/orderService";
import { AuthHttpError } from "@/services/authFetch";
import { useAuth } from "@/context/AuthContext";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type DeliveryPartner = {
  name: string;
  phone: string;
  vehicle?: string;
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

  latitude?: number;
  longitude?: number;

  delivery_partner?: DeliveryPartner;

  otp_verified?: boolean;
  review_submitted?: boolean;
};

export default function MyOrdersPage() {
  const { isLoggedIn } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [orderOtps, setOrderOtps] = useState<
    Record<
      string,
      {
        otp: number | null;
        verified: boolean;
        status: string;
      }
    >
  >({});

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(fetchOrders, 5000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  async function fetchOrders() {
    try {
      if (!isLoggedIn && !localStorage.getItem("token")) {
        setError("Please log in to view your orders.");
        setOrders([]);
        setLoading(false);
        return;
      }

      const data = await getMyOrders();

      setOrders(data);
      setError("");

      for (const order of data) {
        if (
          (order.status === "Picked Up" ||
            order.status === "Out for Delivery") &&
          !orderOtps[order._id]
        ) {
          loadOrderOTP(order._id);
        }
      }
    } catch (error) {
      console.error(error);
      if (error instanceof AuthHttpError && error.status === 401) {
        return;
      }
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load your orders."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadOrderOTP(orderId: string) {
    try {
      const otp = await getOrderOTP(orderId);

      setOrderOtps((prev) => ({
        ...prev,
        [orderId]: otp,
      }));
    } catch (err) {
      console.error(err);
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

      case "Picked Up":
        return "bg-orange-100 text-orange-700";

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
  
      case "Assigned":
        return "🛵 Delivery Partner Assigned";
  
      case "Picked Up":
        return "📦 Picked Up";
  
      case "Out for Delivery":
        return "🛵 Out for Delivery";
  
      case "Delivered":
        return "✅ Delivered";
  
      case "Rejected":
        return "❌ Rejected";
  
      case "Cancelled":
        return "❌ Cancelled";
  
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

  if (error) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-3xl font-bold">Unable to load orders</h1>
        <p className="mt-4 text-red-600">{error}</p>
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
            <>
              <OrderNotification status={order.status} />

              <LiveDeliveryNotification
                status={order.status}
              />
            </>

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

            <div className="mt-6 rounded-2xl bg-gray-50 p-5">
              <h3 className="mb-4 text-lg font-bold">
                Order Status
              </h3>

              <OrderTimeline status={order.status} />
            </div>

            <div className="mt-6 space-y-3">
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

            {order.delivery_partner && (
              <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6">
                <h3 className="mb-4 text-xl font-bold">
                  🚴 Delivery Partner
                </h3>

                <div className="space-y-2">
                  <p>
                    <strong>Name:</strong>{" "}
                    {order.delivery_partner.name}
                  </p>

                  <p>
                    <strong>Phone:</strong>{" "}
                    {order.delivery_partner.phone}
                  </p>

                  {order.delivery_partner.vehicle && (
                    <p>
                      <strong>Vehicle:</strong>{" "}
                      {order.delivery_partner.vehicle}
                    </p>
                  )}
                </div>

                {!orderOtps[order._id]?.verified &&
                  (order.status === "Picked Up" ||
                    order.status ===
                      "Out for Delivery") &&
                  orderOtps[order._id]?.otp && (
                    <div className="mt-6 rounded-xl border-2 border-orange-400 bg-orange-100 p-5 text-center">
                      <h4 className="text-lg font-bold">
                        🔐 Delivery OTP
                      </h4>

                      <p className="mt-2 text-5xl font-extrabold tracking-[10px] text-orange-700">
                        {orderOtps[order._id]?.otp}
                      </p>

                      <p className="mt-3 text-sm text-gray-600">
                        Share this OTP only after
                        receiving your order.
                      </p>
                    </div>
                  )}

                {order.status === "Out for Delivery" && (
                  <button
                    onClick={() =>
                      window.open(
                        `/track-order/${order._id}`,
                        "_blank"
                      )
                    }
                    className="mt-6 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
                  >
                    📍 Live Track Order
                  </button>
                )}

                {order.status === "Delivered" &&
                  !order.review_submitted && (
                    <div className="mt-6">
                      <ReviewModal
                        orderId={order._id}
                        restaurantEmail={
                          order.restaurant_email
                        }
                        deliveryPartnerPhone={
                          order.delivery_partner.phone
                        }
                        customerName={
                          order.customer_name
                        }
                        onSuccess={fetchOrders}
                      />
                    </div>
                  )}

                {order.status === "Delivered" &&
                  order.review_submitted && (
                    <div className="mt-6 rounded-xl border border-green-300 bg-green-50 p-5 text-center">
                      <h3 className="text-xl font-bold text-green-700">
                        ⭐ Thank You!
                      </h3>

                      <p className="mt-2 text-gray-600">
                        Your review has been submitted
                        successfully.
                      </p>
                    </div>
                  )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
