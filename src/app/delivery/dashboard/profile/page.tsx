"use client";

import { useEffect, useState } from "react";

import {
  getDeliveryStatus,
  updateDeliveryStatus,
} from "@/services/deliveryPartnerService";
import {
  AUTH_STORAGE_KEYS,
  clearAuthForRole,
  getDeliveryPartnerSession,
} from "@/lib/authTokens";
import { AuthHttpError } from "@/services/authFetch";

type DeliveryPartner = {
  name: string;
  phone: string;
  vehicle: string;
  rating: number;
  totalDeliveries: number;
  totalEarnings: number;
  online: boolean;
};

export default function DeliveryProfilePage() {
  const [partner, setPartner] = useState<DeliveryPartner>({
    name: "",
    phone: "",
    vehicle: "",
    rating: 4.9,
    totalDeliveries: 0,
    totalEarnings: 0,
    online: false,
  });

  useEffect(() => {
    loadPartner();
  }, []);

  async function loadPartner() {
    const user = getDeliveryPartnerSession();

    if (!user) return;

    let online = false;

    try {
      const status = await getDeliveryStatus(
        user.phone
      );

      online = status.online;
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) return;
    }

    setPartner({
      name: user.name || "Delivery Partner",
      phone: user.phone || "",
      vehicle: user.vehicle || "Bike",
      rating: 4.9,
      totalDeliveries: 0,
      totalEarnings: 0,
      online,
    });
  }

  async function toggleStatus() {
    try {
      const updated = {
        ...partner,
        online: !partner.online,
      };

      setPartner(updated);

      localStorage.setItem(
        AUTH_STORAGE_KEYS.deliveryPartner,
        JSON.stringify({
          ...getDeliveryPartnerSession(),
          name: updated.name,
          phone: updated.phone,
          vehicle: updated.vehicle,
        })
      );

      await updateDeliveryStatus(
        updated.phone,
        updated.online
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  }

  function logout() {
    clearAuthForRole("delivery_partner");

    window.location.href =
      "/delivery/login";
  }

  return (
    <main className="mx-auto max-w-4xl p-8">

      <h1 className="mb-8 text-4xl font-bold">
        Delivery Profile
      </h1>

      <div className="rounded-3xl border bg-white p-8 shadow">

        <div className="flex flex-col items-center">

          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-orange-100 text-5xl">
            👨‍🦱
          </div>

          <h2 className="mt-4 text-3xl font-bold">
            {partner.name}
          </h2>

          <p className="text-gray-500">
            {partner.phone}
          </p>

        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">

          <div className="rounded-xl bg-gray-50 p-5">
            <h3 className="text-sm text-gray-500">
              Vehicle
            </h3>

            <p className="mt-2 text-xl font-bold">
              🛵 {partner.vehicle}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-5">
            <h3 className="text-sm text-gray-500">
              Rating
            </h3>

            <p className="mt-2 text-xl font-bold">
              ⭐ {partner.rating}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-5">
            <h3 className="text-sm text-gray-500">
              Total Deliveries
            </h3>

            <p className="mt-2 text-xl font-bold">
              📦 {partner.totalDeliveries}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-5">
            <h3 className="text-sm text-gray-500">
              Total Earnings
            </h3>

            <p className="mt-2 text-xl font-bold text-green-600">
              ₹{partner.totalEarnings}
            </p>
          </div>

        </div>

        <div className="mt-10 flex flex-wrap gap-4">

          <button
            onClick={toggleStatus}
            className={`rounded-xl px-6 py-3 font-semibold text-white ${
              partner.online
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {partner.online
              ? "🟢 Online"
              : "🔴 Offline"}
          </button>

          <button
            onClick={logout}
            className="rounded-xl bg-gray-800 px-6 py-3 font-semibold text-white hover:bg-black"
          >
            🚪 Logout
          </button>

        </div>

      </div>

    </main>
  );
}