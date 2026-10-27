import dynamic from "next/dynamic";
import { formatUpdatedTime } from "@/lib/formatters";
import type { TrackingLocation } from "@/hooks/orders/useTrackOrder";
import { MapSkeleton } from "@/components/maps/MapSkeleton";

const LiveTrackingMap = dynamic(
  () => import("@/components/maps/LiveTrackingMap"),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  }
);

type TrackOrderMapSectionProps = {
  location: TrackingLocation;
  partnerHasLocation: boolean;
  lastUpdated: Date | null;
  restaurantName?: string;
};

export function TrackOrderMapSection({
  location,
  partnerHasLocation,
  lastUpdated,
  restaurantName,
}: TrackOrderMapSectionProps) {
  const normStatus = (location.status || "").toLowerCase().trim();
  const isDelivered = normStatus === "delivered" || normStatus === "completed";

  if (isDelivered) {
    return null;
  }

  const effectiveRestName =
    restaurantName ||
    location.restaurant_name ||
    "Zeal Campus Eatery";

  return (
    <section className="relative z-0 mt-4 overflow-hidden rounded-3xl border border-gray-100 bg-white p-2 shadow-sm sm:p-3">
      <div className="rounded-2xl bg-gray-50 p-4">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Live Map
            </h2>

            <p className="text-sm text-gray-500">
              {partnerHasLocation
                ? "Your delivery partner's current location."
                : "Food being prepared at kitchen • Partner assigning soon"}
            </p>
          </div>

          <span
            suppressHydrationWarning
            className="text-xs font-medium text-gray-400"
            aria-live="polite"
          >
            {formatUpdatedTime(lastUpdated)}
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl">
          <LiveTrackingMap
            partnerLat={partnerHasLocation ? (location.partner_latitude as number) : null}
            partnerLng={partnerHasLocation ? (location.partner_longitude as number) : null}
            customerLat={location.customer_latitude}
            customerLng={location.customer_longitude}
            restaurantLat={location.restaurant_latitude}
            restaurantLng={location.restaurant_longitude}
            restaurantName={effectiveRestName}
          />
        </div>
      </div>
    </section>
  );
}
