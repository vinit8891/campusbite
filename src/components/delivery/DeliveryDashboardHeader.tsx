import type { DeliveryPartner } from "@/types";
import { REFRESH_MS } from "@/hooks/delivery/useDeliveryDashboard";

type DeliveryDashboardHeaderProps = {
  partner: DeliveryPartner | null;
  error: string;
};

export function DeliveryDashboardHeader({
  partner,
  error,
}: DeliveryDashboardHeaderProps) {
  return (
    <div className="rounded-3xl bg-white p-8 shadow">
      <h1 className="text-3xl font-bold">
        Welcome, {partner?.name || "Delivery Partner"}
      </h1>
      <p className="mt-2 text-gray-500">
        Manage your deliveries and earnings.
      </p>
      <p className="mt-1 text-xs text-gray-400">
        Live updates every {REFRESH_MS / 1000} seconds
      </p>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 border-t pt-6">
        <h2 className="text-xl font-semibold">Partner Information</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <p className="text-lg text-gray-600">
            <span className="font-semibold text-gray-800">Name:</span>{" "}
            {partner?.name || "—"}
          </p>
          <p className="text-lg text-gray-600">
            <span className="font-semibold text-gray-800">Phone:</span>{" "}
            {partner?.phone || "—"}
          </p>
          <p className="text-lg text-gray-600">
            <span className="font-semibold text-gray-800">Email:</span>{" "}
            {partner?.email || "—"}
          </p>
          <p className="text-lg text-gray-600">
            <span className="font-semibold text-gray-800">Vehicle:</span>{" "}
            {partner?.vehicle || "—"}
          </p>
          <p className="text-lg text-gray-600">
            <span className="font-semibold text-gray-800">
              Vehicle Number:
            </span>{" "}
            {partner?.vehicle_number || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
