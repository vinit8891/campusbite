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
};

export function TrackOrderMapSection({
  location,
  partnerHasLocation,
  lastUpdated,
}: TrackOrderMapSectionProps) {
  return (
    <section className="mt-4 overflow-hidden rounded-3xl border border-gray-100 bg-white p-2 shadow-sm sm:p-3">
      <div className="rounded-2xl bg-gray-50 p-4">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Live Map
            </h2>

            <p className="text-sm text-gray-500">
              {partnerHasLocation
                ? "Your delivery partner's current location."
                : "Waiting for the partner's live location."}
            </p>
          </div>

          <span
            className="text-xs font-medium text-gray-400"
            aria-live="polite"
          >
            {formatUpdatedTime(lastUpdated)}
          </span>
        </div>

        {partnerHasLocation ? (
          <div className="h-[500px] overflow-hidden rounded-2xl">
            <LiveTrackingMap
              partnerLat={location.partner_latitude as number}
              partnerLng={location.partner_longitude as number}
              customerLat={location.customer_latitude}
              customerLng={location.customer_longitude}
              restaurantLat={location.restaurant_latitude}
              restaurantLng={location.restaurant_longitude}
            />
          </div>
        ) : (
          <div className="flex h-[500px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 text-center">
            <div>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
                🛵
              </div>

              <h3 className="mt-4 text-lg font-bold text-gray-900">
                Waiting for live location
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                The map will update automatically when your
                delivery partner starts sharing their location.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
