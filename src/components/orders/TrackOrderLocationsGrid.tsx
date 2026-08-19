import { DeliveryPartnerCard } from "@/components/common";
import type { TrackingLocation } from "@/hooks/orders/useTrackOrder";

type TrackOrderLocationsGridProps = {
  location: TrackingLocation;
  restaurantName: string;
  restaurantCuisine: string;
  partnerName: string;
  customerName: string;
  partnerHasLocation: boolean;
};

export function TrackOrderLocationsGrid({
  location,
  restaurantName,
  restaurantCuisine,
  partnerName,
  customerName,
  partnerHasLocation,
}: TrackOrderLocationsGridProps) {
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      {/* Restaurant */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl">
            🍽️
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Restaurant
            </p>

            <h2 className="mt-1 truncate text-lg font-bold text-gray-900">
              {restaurantName}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {restaurantCuisine}
            </p>

            <p className="mt-1 break-words text-xs text-gray-400">
              Restaurant location
            </p>
          </div>
        </div>
      </section>

      {/* Delivery Partner */}
      <DeliveryPartnerCard
        name={
          partnerHasLocation
            ? partnerName
            : "Waiting for delivery partner..."
        }
        phone={location.delivery_partner_phone}
        vehicle={location.delivery_partner_vehicle}
        variant="card"
        showCallButton={false}
      />

      {/* Customer */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl">
            📍
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Delivery Address
            </p>

            <h2 className="mt-1 break-words text-lg font-bold text-gray-900">
              {customerName}
            </h2>

            {location.customer_address ? (
              <p className="mt-1 line-clamp-2 break-words text-sm text-gray-500">
                {location.customer_address}
              </p>
            ) : (
              <p className="mt-1 text-sm text-gray-500">
                Your saved delivery address
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
