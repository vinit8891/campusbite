"use client";

import { useEffect, useState } from "react";

import DeliveryStats from "@/components/delivery/DeliveryStats";

export default function DeliveryDashboard() {
  const [partner, setPartner] =
    useState<any>(null);

  useEffect(() => {
    const data = JSON.parse(
      localStorage.getItem(
        "deliveryPartner"
      ) || "{}"
    );

    setPartner(data);
  }, []);

  if (!partner) {
    return (
      <div className="p-10">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-10 p-10">

      <div className="rounded-3xl bg-white p-8 shadow">

        <h1 className="text-4xl font-bold">
          Welcome,
          {" "}
          {partner.name}
          🚴
        </h1>

        <p className="mt-3 text-gray-500">
          Vehicle :
          {" "}
          {partner.vehicle}
        </p>

        <p className="text-gray-500">
          Vehicle Number :
          {" "}
          {partner.vehicle_number}
        </p>

      </div>

      <DeliveryStats
        jobs={0}
        earnings={partner.earnings}
      />

    </div>
  );
}