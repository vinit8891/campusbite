"use client";

import { useEffect, useRef, useState } from "react";
import {
  getMyDeliveries,
  updateLiveLocation,
  verifyDeliveryOTP,
} from "@/services/deliveryService";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

export default function MyDeliveriesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [otpOrderId, setOtpOrderId] =
    useState<string | null>(null);

  const [otp, setOtp] = useState("");

  const [verifying, setVerifying] =
    useState(false);

  const [otpError, setOtpError] =
    useState("");

  const watchIdRef = useRef<number | null>(null);
  const ordersRef = useRef<any[]>([]);

  // -----------------------------
  // Keep latest orders reference
  // -----------------------------
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // -----------------------------
  // Load Orders
  // -----------------------------
  async function loadOrders() {
    try {
      const partner = JSON.parse(
        localStorage.getItem("deliveryPartner") || "{}"
      );

      if (!partner.phone) {
        setOrders([]);
        return;
      }

      const data = await getMyDeliveries(
        partner.phone
      );

      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // Auto Refresh Orders
  // -----------------------------
  useEffect(() => {
    loadOrders();

    const refresh = setInterval(
      loadOrders,
      5000
    );

    return () => clearInterval(refresh);
  }, []);

  // -----------------------------
  // Live GPS Tracking
  // -----------------------------
  useEffect(() => {
    if (!navigator.geolocation) return;

    if (watchIdRef.current !== null) return;

    watchIdRef.current =
      navigator.geolocation.watchPosition(
        async (position) => {
          const activeOrders =
            ordersRef.current.filter(
              (order) =>
                order.status !== "Assigned" &&
                order.status !== "Delivered"
            );

          for (const order of activeOrders) {
            try {
              await updateLiveLocation(
                order._id,
                position.coords.latitude,
                position.coords.longitude
              );
            } catch (err) {
              console.error(err);
            }
          }
        },
        (err) => {
          console.error("GPS Error:", err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
        }
      );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );
        watchIdRef.current = null;
      }
    };
  }, []);

  // -----------------------------
  // Update Status
  // -----------------------------
  async function updateStatus(
    id: string,
    status: string
  ) {
    try {
      const res = await fetch(
        `${API_URL}/orders/${id}/${status}`,
        {
          method: "PUT",
        }
      );

      if (!res.ok) {
        throw new Error("Failed");
      }

      await loadOrders();
    } catch (err) {
      console.error(err);
    }
  }

  // -----------------------------
  // Verify Delivery OTP
  // -----------------------------
  async function verifyOTP() {
    if (!otpOrderId) return;

    try {
      setVerifying(true);
      setOtpError("");

      await verifyDeliveryOTP(
        otpOrderId,
        Number(otp)
      );

      setOtp("");
      setOtpOrderId(null);

      await loadOrders();

      alert("✅ Delivery Completed Successfully");
    } catch (err: any) {
      setOtpError(
        err.message || "Invalid OTP"
      );
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-xl">
        Loading...
      </div>
    );
  }

  return (
    <>
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
                    disabled={
                      order.status !== "Assigned"
                    }
                    onClick={() =>
                      updateStatus(
                        order._id,
                        "Picked Up"
                      )
                    }
                    className="rounded-lg bg-orange-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    📦 Picked Up
                  </button>

                  <button
                    disabled={
                      order.status !== "Picked Up"
                    }
                    onClick={() =>
                      updateStatus(
                        order._id,
                        "Out for Delivery"
                      )
                    }
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    🛵 Out for Delivery
                  </button>

                  <button
                    disabled={
                      order.status !==
                      "Out for Delivery"
                    }
                    onClick={() => {
                      setOtpOrderId(order._id);
                      setOtp("");
                      setOtpError("");
                    }}
                    className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ✅ Delivered
                  </button>

                  {order.status ===
                    "Out for Delivery" && (
                    <span className="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white">
                      📍 Live Tracking Active
                    </span>
                  )}

                  <button
                    onClick={() => {
                      if (
                        order.latitude &&
                        order.longitude
                      ) {
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`,
                          "_blank"
                        );
                      } else {
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            order.address
                          )}`,
                          "_blank"
                        );
                      }
                    }}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
                  >
                    🗺 Navigate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* OTP Modal */}
      {otpOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-2xl font-bold">
              🔐 Verify Delivery OTP
            </h2>

            <p className="mb-4 text-gray-600">
              Ask the customer for the 4-digit OTP.
            </p>

            <input
              type="text"
              maxLength={4}
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value)
              }
              className="w-full rounded-lg border p-3 text-center text-2xl tracking-widest"
              placeholder="1234"
            />

            {otpError && (
              <p className="mt-3 text-red-600">
                {otpError}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setOtpOrderId(null);
                  setOtp("");
                  setOtpError("");
                }}
                className="flex-1 rounded-lg border py-3"
              >
                Cancel
              </button>

              <button
                onClick={verifyOTP}
                disabled={
                  verifying ||
                  otp.length !== 4
                }
                className="flex-1 rounded-lg bg-green-600 py-3 text-white disabled:opacity-50"
              >
                {verifying
                  ? "Verifying..."
                  : "Verify OTP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}