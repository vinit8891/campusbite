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
      {(() => {
        const restaurant =
          (location as unknown as { restaurant_info?: Record<string, unknown>; restaurant?: Record<string, unknown> })?.restaurant_info ||
          (location as unknown as { restaurant_info?: Record<string, unknown>; restaurant?: Record<string, unknown> })?.restaurant ||
          {};
        const restName =
          (restaurant as { name?: string })?.name ||
          restaurantName ||
          location.restaurant_name ||
          "Campus Canteen";
        const restAddress =
          (restaurant as { address?: string })?.address ||
          (restaurant as { stall_location?: string })?.stall_location ||
          (location as unknown as { restaurant_address?: string })?.restaurant_address ||
          "Zeal College Campus, Narhe";
        const restLat =
          (restaurant as { latitude?: number })?.latitude ||
          location.restaurant_latitude ||
          18.4485;
        const restLng =
          (restaurant as { longitude?: number })?.longitude ||
          location.restaurant_longitude ||
          73.8242;
        const phone =
          (restaurant as { phone?: string })?.phone ||
          (location as unknown as { restaurant_phone?: string })?.restaurant_phone;

        return (
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl">
                  🍽️
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Restaurant
                  </span>
                  <h3 className="text-base font-bold text-zinc-900">{restName}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{restAddress}</p>
                </div>
              </div>
            </div>

            {/* Immediate Map Pin Action */}
            <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${restLat},${restLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
              >
                <span>📍 Open Location in Maps</span>
                <span className="text-[11px]">↗</span>
              </a>
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="text-xs text-zinc-600 hover:text-zinc-900 font-medium"
                >
                  📞 Call Kitchen
                </a>
              )}
            </div>
          </div>
        );
      })()}

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
        showCallButton={true}
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
